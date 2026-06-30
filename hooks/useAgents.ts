// hooks/useAgents.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

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
  };
  resultsSubmitted?: number;
  status?: 'Online' | 'Offline';
  lastActive?: string;
}

// Demo data
const DEMO_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    pollingUnitName: 'Polling Unit 1',
    wardName: 'Ward 1',
    zoneName: 'Zone A',
    status: 'Online',
    lastActive: 'Just now',
    resultsSubmitted: 5,
    lastKnownLocation: { latitude: 6.5244, longitude: 3.3792 }
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    pollingUnitName: 'Polling Unit 2',
    wardName: 'Ward 1',
    zoneName: 'Zone A',
    status: 'Online',
    lastActive: '2 min ago',
    resultsSubmitted: 3,
    lastKnownLocation: { latitude: 6.5245, longitude: 3.3793 }
  },
  // ... more demo data
];

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
  const [usingDemoData, setUsingDemoData] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const fetchAgents = useCallback(async (showToastMessage = false) => {
    if (!user) return;

    try {
      if (showToastMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = '';
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Determine endpoint based on user role
      if (user.role === 'System Admin') {
        url = `${API_BASE_URL}/admin/users?role=Polling Agent`;
      } else if (user.role === 'Situation Room Admin') {
        url = `${API_BASE_URL}/admin/users?role=Polling Agent`;
      } else if (user.role === 'Zone Admin' && user.zoneId) {
        url = `${API_BASE_URL}/admin/zone/${user.zoneId}/agents`;
      } else if (user.role === 'Ward Admin' && user.wardId) {
        url = `${API_BASE_URL}/admin/ward/${user.wardId}/agents`;
      } else {
        // Fallback to demo data
        setAgents(DEMO_AGENTS);
        setUsingDemoData(true);
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
            lastKnownLocation: agent.lastKnownLatitude && agent.lastKnownLongitude ? {
              latitude: agent.lastKnownLatitude,
              longitude: agent.lastKnownLongitude
            } : null
          };
        });

        setAgents(processedAgents);
        setUsingDemoData(false);
        setError(null);
        
        if (showToastMessage) {
          toast({
            title: "Success",
            description: `Loaded ${processedAgents.length} agents`,
          });
        }
      } else {
        // Fallback to demo data
        setAgents(DEMO_AGENTS);
        setUsingDemoData(true);
        if (showToastMessage) {
          toast({
            title: "Demo Mode",
            description: "Showing sample agent data",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents(DEMO_AGENTS);
      setUsingDemoData(true);
      setError('Failed to load agents');
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample agent data",
          variant: "default",
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

  return {
    agents,
    loading,
    refreshing,
    error,
    usingDemoData,
    refreshAgents: (showToast = false) => fetchAgents(showToast)
  };
}