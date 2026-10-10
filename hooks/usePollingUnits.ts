// hooks/usePollingUnits.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';

export interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agentName: string;
  agentId?: string;
  agentStatus: 'Online' | 'Offline';
  location: {
    latitude: number;
    longitude: number;
  };
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  resultStatus?: string;
}

/**
 * Shown when the API cannot be reached at all. There is deliberately no demo
 * data: a fabricated polling unit that looks real is worse than an honest
 * outage, because an operator cannot tell the two apart.
 */
export { SERVER_OFFLINE_MESSAGE };

type RawUnit = Record<string, any>;

function transformUnit(unit: RawUnit, fallbackWardId?: string | null): PollingUnit {
  const lat = unit.latitude;
  const lng = unit.longitude;
  return {
    id: unit.id,
    name: unit.name,
    code: unit.code || `PU-${String(unit.id).slice(0, 4)}`,
    registeredVoters: unit.registeredVoters || 0,
    agentName: unit.agentName || unit.agent?.name || 'Unassigned',
    agentId: unit.agentId || unit.agent?.id,
    agentStatus: unit.agentStatus || unit.agent?.status || 'Offline',
    location: lat && lng ? { latitude: lat, longitude: lng } : { latitude: 0, longitude: 0 },
    wardId: unit.wardId || fallbackWardId || undefined,
    wardName: unit.wardName || unit.ward?.name,
    zoneId: unit.zoneId || unit.zone?.id,
    zoneName: unit.zoneName || unit.zone?.name,
    resultStatus: unit.resultStatus || 'Not Submitted',
  };
}

function extractUnits(data: any): RawUnit[] | null {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.pollingUnits)) return data.pollingUnits;
  return null;
}

export function usePollingUnits(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPollingUnits = useCallback(async (showToastMessage = false) => {
    if (!user) return;

    try {
      if (showToastMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = '';
      if (user.role === 'System Admin') {
        url = `${API_BASE_URL}/admin/polling-units`;
      } else if (user.role === 'Situation Room Admin' || user.role === 'Zone Admin') {
        url = user.zoneId
          ? `${API_BASE_URL}/admin/zone/${user.zoneId}/polling-units`
          : `${API_BASE_URL}/admin/polling-units`;
      } else if (user.role === 'Ward Admin' && user.wardId) {
        url = `${API_BASE_URL}/admin/ward/${user.wardId}/polling-units`;
      } else {
        throw new Error('Your account is not linked to a ward or zone');
      }

      const response = await fetch(url, {
        headers: withTenantHeaders({ Authorization: `Bearer ${token}` }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const units = extractUnits(data);
      if (units === null) {
        throw new Error('Unexpected response from the server');
      }

      const transformed = units.map((unit) => transformUnit(unit, user.wardId));
      setPollingUnits(transformed);
      setError(null);

      if (showToastMessage) {
        toast({
          title: 'Success',
          description: `Loaded ${transformed.length} polling units`,
        });
      }
    } catch (err) {
      // Every failure is surfaced plainly. We never substitute sample data, so
      // an unreachable server reads as an outage rather than as an empty ward.
      const isOffline = isNetworkError(err);
      const message = isOffline ? SERVER_OFFLINE_MESSAGE : 'Failed to load polling units';
      console.error('Error fetching polling units:', err);
      setPollingUnits([]);
      setError(message);

      if (showToastMessage) {
        toast({
          title: isOffline ? 'Server Offline' : 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPollingUnits();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchPollingUnits(false);
      }, options.refreshInterval || 30000);

      return () => clearInterval(interval);
    }
  }, [fetchPollingUnits, options?.autoRefresh, options?.refreshInterval]);

  return {
    pollingUnits,
    loading,
    refreshing,
    error,
    refreshPollingUnits: (showToast = false) => fetchPollingUnits(showToast),
  };
}
