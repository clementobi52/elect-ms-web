// hooks/usePollingUnits.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

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

// Demo data for fallback when backend is unavailable
const DEMO_POLLING_UNITS: PollingUnit[] = [
  {
    id: '1',
    name: 'Polling Unit 1 - Central Primary School',
    code: 'PU-001',
    registeredVoters: 450,
    agentName: 'John Doe',
    agentStatus: 'Online',
    location: { latitude: 6.5244, longitude: 3.3792 },
    wardName: 'Ward 1',
    zoneName: 'Zone A',
    resultStatus: 'Submitted'
  },
  {
    id: '2',
    name: 'Polling Unit 2 - Community Hall',
    code: 'PU-002',
    registeredVoters: 380,
    agentName: 'Jane Smith',
    agentStatus: 'Online',
    location: { latitude: 6.5245, longitude: 3.3793 },
    wardName: 'Ward 1',
    zoneName: 'Zone A',
    resultStatus: 'Pending'
  },
  {
    id: '3',
    name: 'Polling Unit 3 - Market Square',
    code: 'PU-003',
    registeredVoters: 520,
    agentName: 'Mike Johnson',
    agentStatus: 'Offline',
    location: { latitude: 6.5246, longitude: 3.3794 },
    wardName: 'Ward 2',
    zoneName: 'Zone A',
    resultStatus: 'Not Submitted'
  },
  {
    id: '4',
    name: 'Polling Unit 4 - Health Center',
    code: 'PU-004',
    registeredVoters: 290,
    agentName: 'Sarah Brown',
    agentStatus: 'Online',
    location: { latitude: 6.5247, longitude: 3.3795 },
    wardName: 'Ward 2',
    zoneName: 'Zone B',
    resultStatus: 'Verified'
  },
  {
    id: '5',
    name: 'Polling Unit 5 - Town Hall',
    code: 'PU-005',
    registeredVoters: 610,
    agentName: 'Unassigned',
    agentStatus: 'Offline',
    location: { latitude: 6.5248, longitude: 3.3796 },
    wardName: 'Ward 3',
    zoneName: 'Zone B',
    resultStatus: 'Not Submitted'
  }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  const [usingDemoData, setUsingDemoData] = useState(false);

  const formatLocation = (lat?: number, lng?: number): { latitude: number; longitude: number } => {
    if (lat && lng) {
      return { latitude: lat, longitude: lng };
    }
    return { latitude: 0, longitude: 0 };
  };

  const fetchPollingUnits = useCallback(async (showToastMessage = false) => {
    if (!user) return;

    try {
      if (showToastMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setUsingDemoData(false);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = '';
      let response;

      // Determine which endpoint to use based on user role
      if (user.role === 'System Admin') {
        // System Admin sees all polling units
        url = `${API_BASE_URL}/admin/polling-units`;
        console.log('System Admin fetching all polling units from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('System Admin response:', data);
          
          // Handle different response structures
          let units = [];
          if (data.data && Array.isArray(data.data)) {
            units = data.data;
          } else if (data.pollingUnits && Array.isArray(data.pollingUnits)) {
            units = data.pollingUnits;
          } else if (Array.isArray(data)) {
            units = data;
          }

          if (units.length > 0) {
            const transformedUnits = units.map((unit: any) => ({
              id: unit.id,
              name: unit.name,
              code: unit.code || `PU-${unit.id.slice(0, 4)}`,
              registeredVoters: unit.registeredVoters || 0,
              agentName: unit.agentName || unit.agent?.name || 'Unassigned',
              agentId: unit.agentId || unit.agent?.id,
              agentStatus: unit.agentStatus || unit.agent?.status || 'Offline',
              location: formatLocation(unit.latitude, unit.longitude),
              wardId: unit.wardId,
              wardName: unit.wardName || unit.ward?.name,
              zoneId: unit.zoneId || unit.zone?.id,
              zoneName: unit.zoneName || unit.zone?.name,
              resultStatus: unit.resultStatus || 'Not Submitted'
            }));
            
            setPollingUnits(transformedUnits);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedUnits.length} polling units`,
              });
            }
            return;
          }
        }
      } 
      else if (user.role === 'Situation Room Admin') {
        // Situation Room sees polling units across assigned zones
        if (user.zoneId) {
          url = `${API_BASE_URL}/admin/zone/${user.zoneId}/polling-units`;
        } else {
          url = `${API_BASE_URL}/admin/polling-units`;
        }
        
        console.log('Situation Room fetching polling units from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          let units = data.pollingUnits || data.data || (Array.isArray(data) ? data : []);
          
          if (units.length > 0) {
            const transformedUnits = units.map((unit: any) => ({
              id: unit.id,
              name: unit.name,
              code: unit.code || `PU-${unit.id.slice(0, 4)}`,
              registeredVoters: unit.registeredVoters || 0,
              agentName: unit.agentName || unit.agent?.name || 'Unassigned',
              agentId: unit.agentId || unit.agent?.id,
              agentStatus: unit.agentStatus || unit.agent?.status || 'Offline',
              location: formatLocation(unit.latitude, unit.longitude),
              wardId: unit.wardId,
              wardName: unit.wardName || unit.ward?.name,
              zoneId: unit.zoneId || unit.zone?.id,
              zoneName: unit.zoneName || unit.zone?.name,
              resultStatus: unit.resultStatus || 'Not Submitted'
            }));
            
            setPollingUnits(transformedUnits);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedUnits.length} polling units`,
              });
            }
            return;
          }
        }
      }
      else if (user.role === 'Zone Admin' && user.zoneId) {
        // Zone Admin sees polling units in their zone
        url = `${API_BASE_URL}/admin/zone/${user.zoneId}/polling-units`;
        
        console.log('Zone Admin fetching polling units from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          let units = data.pollingUnits || data.data || (Array.isArray(data) ? data : []);
          
          if (units.length > 0) {
            const transformedUnits = units.map((unit: any) => ({
              id: unit.id,
              name: unit.name,
              code: unit.code || `PU-${unit.id.slice(0, 4)}`,
              registeredVoters: unit.registeredVoters || 0,
              agentName: unit.agentName || unit.agent?.name || 'Unassigned',
              agentId: unit.agentId || unit.agent?.id,
              agentStatus: unit.agentStatus || unit.agent?.status || 'Offline',
              location: formatLocation(unit.latitude, unit.longitude),
              wardId: unit.wardId,
              wardName: unit.wardName || unit.ward?.name,
              zoneId: unit.zoneId || unit.zone?.id,
              zoneName: unit.zoneName || unit.zone?.name,
              resultStatus: unit.resultStatus || 'Not Submitted'
            }));
            
            setPollingUnits(transformedUnits);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedUnits.length} polling units`,
              });
            }
            return;
          }
        }
      }
      else if (user.role === 'Ward Admin' && user.wardId) {
        // Ward Admin sees polling units in their ward
        url = `${API_BASE_URL}/admin/ward/${user.wardId}/polling-units`;
        
        console.log('Ward Admin fetching polling units from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // Handle both array response and object with data property
          let units = Array.isArray(data) ? data : (data.data || data.pollingUnits || []);
          
          if (units.length > 0) {
            const transformedUnits = units.map((unit: any) => ({
              id: unit.id,
              name: unit.name,
              code: unit.code || `PU-${unit.id.slice(0, 4)}`,
              registeredVoters: unit.registeredVoters || 0,
              agentName: unit.agentName || 'Unassigned',
              agentId: unit.agentId,
              agentStatus: unit.agentStatus || 'Offline',
              location: formatLocation(unit.latitude, unit.longitude),
              wardId: unit.wardId || user.wardId,
              wardName: unit.wardName,
              resultStatus: unit.resultStatus || 'Not Submitted'
            }));
            
            setPollingUnits(transformedUnits);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedUnits.length} polling units`,
              });
            }
            return;
          }
        }
      }

      // If we get here, no valid data was received
      console.log('No data received, using demo data');
      setPollingUnits(DEMO_POLLING_UNITS);
      setUsingDemoData(true);
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample polling units",
        });
      }

    } catch (error) {
      console.error('Error fetching polling units:', error);
      setPollingUnits(DEMO_POLLING_UNITS);
      setUsingDemoData(true);
      setError('Failed to load polling units');
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample polling units",
          variant: "default",
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
    usingDemoData,
    refreshPollingUnits: (showToast = false) => fetchPollingUnits(showToast)
  };
}