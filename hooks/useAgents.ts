// hooks/useAgents.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';
import { resolveAdminScope, scopeApiBase } from '@/lib/scope';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';

function toCoord(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnitName: string;
  pollingUnitId?: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  updatedAt?: string;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  resultsSubmitted?: number;
  status?: 'Online' | 'Offline';
  lastActive?: string;
}

export function useAgents(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchAgents = useCallback(async (showToastMessage = false) => {
    if (!user) return;

    try {
      // Only a manual refresh flips the spinner. The initial mount already starts
      // with loading=true; a background poll must not re-enter the full-page
      // loading state or the page flashes back to the loader every interval.
      if (showToastMessage) {
        setRefreshing(true);
      }

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = '';
      const headers = withTenantHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Determine endpoint based on user role
      const scopeBase = scopeApiBase(resolveAdminScope(user));

      if (user.role === 'System Admin' || user.role === 'Situation Room Admin') {
        url = `${API_BASE_URL}/admin/system/users?role=Polling Agent`;
      } else if (scopeBase) {
        url = `${API_BASE_URL}${scopeBase}/agents`;
      } else {
        setAgents([]);
        setError('Agents are not available for your role.');
        return;
      }

      const response = await fetch(url, { headers });

      if (response.ok) {
        const data = await response.json();
        const users = data.users || data.data || data.agents || data;
        
        const processedAgents = users.map((agent: any) => {
          const lastActive = agent.updatedAt ? new Date(agent.updatedAt) : null;
          const now = Date.now();
          const diffMins = lastActive ? Math.floor((now - lastActive.getTime()) / 60000) : null;
          
          let status = 'Offline';
          let lastActiveText = 'Unknown';
          
          if (diffMins !== null) {
            status = diffMins < 5 ? 'Online' : 'Offline';
            
            if (diffMins < 1) lastActiveText = 'Just now';
            else if (diffMins < 60) lastActiveText = `${diffMins} min ago`;
            else if (diffMins < 1440) lastActiveText = `${Math.floor(diffMins / 60)} hours ago`;
            else lastActiveText = `${Math.floor(diffMins / 1440)} days ago`;
          }

          // The ward/scope endpoints nest coordinates under `lastKnownLocation`;
          // the system users endpoint returns them as flat lastKnownLatitude /
          // lastKnownLongitude columns. Accept either and coerce to numbers.
          const rawLocation =
            agent.lastKnownLocation ??
            (toCoord(agent.lastKnownLatitude) !== undefined && toCoord(agent.lastKnownLongitude) !== undefined
              ? { latitude: toCoord(agent.lastKnownLatitude)!, longitude: toCoord(agent.lastKnownLongitude)! }
              : null);
          const latitude = toCoord(rawLocation?.latitude);
          const longitude = toCoord(rawLocation?.longitude);
          const lastKnownLocation =
            latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null;

          return {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            pollingUnitName: agent.pollingUnit?.name || agent.pollingUnitName || 'Unassigned',
            pollingUnitId: agent.pollingUnitId,
            wardId: agent.wardId,
            wardName: agent.ward?.name,
            zoneId: agent.zoneId,
            zoneName: agent.zone?.name,
            updatedAt: agent.updatedAt,
            status,
            lastActive: lastActiveText,
            resultsSubmitted: agent.resultsSubmitted || 0,
            lastKnownLocation
          };
        });

        setAgents(processedAgents);
        setError(null);
        
        if (showToastMessage) {
          toast({
            title: "Success",
            description: `Loaded ${processedAgents.length} agents`,
          });
        }
      } else {
        let detail = '';
        try { detail = await response.text(); } catch {}
        console.error(`Agents request failed: HTTP ${response.status}`, detail);
        setAgents([]);
        setError(`Failed to load agents (HTTP ${response.status})`);
        if (showToastMessage) {
          toast({
            title: "Error",
            description: `Failed to load agents (HTTP ${response.status})`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      const message = isNetworkError(error) ? SERVER_OFFLINE_MESSAGE : 'Failed to load agents';
      setAgents([]);
      setError(message);
      if (showToastMessage) {
        toast({
          title: isNetworkError(error) ? 'Server Offline' : 'Error',
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAgents();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchAgents(false);
      }, options.refreshInterval || 30000);
      
      return () => clearInterval(interval);
    }
  }, [fetchAgents, options?.autoRefresh, options?.refreshInterval]);

  // Real-time location updates over the shared socket. The ward room receives a
  // `ward-data-update` on every agent fix (the mobile app emits one roughly
  // every 10s or 10m), so merging those moves the map markers without waiting
  // for the next poll. Scoped to a ward because that is the room the server
  // broadcasts the coordinate payload to.
  useEffect(() => {
    if (!user) return;
    const scope = resolveAdminScope(user);
    if (!scope || scope.kind !== 'ward') return;

    const wardId = scope.id;
    const join = () => sendSocketMessage('join-ward', { wardId });

    const applyWardAgents = (incoming: any[]) => {
      if (!Array.isArray(incoming) || incoming.length === 0) return;

      setAgents(prev => {
        // The initial REST load owns the full record shape (polling unit name
        // etc). Until it lands, skip the partial socket rows.
        if (prev.length === 0) return prev;

        const updates = new Map<string, Partial<Agent>>();
        incoming.forEach(raw => {
          const lat = toCoord(raw.lastKnownLatitude);
          const lng = toCoord(raw.lastKnownLongitude);
          const status: Agent['status'] | undefined =
            raw.status === 'Online' || raw.status === 'Offline' ? raw.status : undefined;

          updates.set(raw.id, {
            status,
            updatedAt: raw.updatedAt,
            lastKnownLocation:
              lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : undefined,
          });
        });

        return prev.map(agent => {
          const update = updates.get(agent.id);
          if (!update) return agent;
          return {
            ...agent,
            status: update.status ?? agent.status,
            updatedAt: update.updatedAt ?? agent.updatedAt,
            lastKnownLocation: update.lastKnownLocation ?? agent.lastKnownLocation,
          };
        });
      });
    };

    const unsubConnection = onConnectionChange(connected => {
      if (connected) join();
    });

    const unsubMessages = onSocketMessage((event, data) => {
      if (event === 'ward-data-update') {
        applyWardAgents(data?.agents);
      } else if (event === 'agent-status-update' && data?.agentId) {
        const status: Agent['status'] = data.status === 'Online' ? 'Online' : 'Offline';
        setAgents(prev => prev.map(agent =>
          agent.id === data.agentId
            ? { ...agent, status, updatedAt: data.timestamp ?? agent.updatedAt }
            : agent
        ));
      }
    });

    // The socket may already be connected (e.g. navigating from the dashboard),
    // in which case no connection change fires and we join up front.
    const socket = getSocket();
    if (socket?.connected) join();

    return () => {
      unsubConnection();
      unsubMessages();
    };
  }, [user]);

  return {
    agents,
    loading,
    refreshing,
    error,
    refreshAgents: (showToast = false) => fetchAgents(showToast)
  };
}