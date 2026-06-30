// C:\Users\USER\Downloads\election-ms\hooks\useSituationRoomData.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  XCircle,
  Activity 
} from 'lucide-react';

export interface SituationRoomStats {
  totalZones: number;
  totalWards: number;
  totalPollingUnits: number;
  totalAgents: number;
  activeAgents: number;
  offlineAgents: number;
  totalResults: number;
  pendingResults: number;
  approvedResults: number;
  rejectedResults: number;
  totalIncidents: number;
  criticalIncidents: number;
  highIncidents: number;
  resultsProgress: number;
  totalRegisteredVoters: number;
  totalVotesCounted: number;
}

export interface ZoneOverview {
  id: string;
  name: string;
  wards: number;
  pollingUnits: number;
  agents: number;
  activeAgents: number;
  results: number;
  progress: number;
  incidents: number;
  criticalIncidents?: number;
}

export interface LiveIncident {
  id: string;
  type: string;
  description: string;
  zone: string;
  zoneId?: string;
  ward: string;
  wardId?: string;
  pollingUnit: string;
  pollingUnitId?: string;
  time: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'investigating' | 'resolved';
  reporter?: string;
  reporterId?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
}

export interface ActivityItem {
  id: string;
  type: 'result' | 'agent' | 'incident';
  message: string;
  time: string;
  icon: any;
  data?: any;
  createdAt?: string;
}

export interface VoteSummary {
  party: string;
  partyId?: string;
  partyLogo?: string | null;
  votes: number;
  percentage: number;
  color: string;
}

export interface HeatmapFeature {
  type: string;
  properties: {
    id: string;
    type: string;
    severity: string;
    status: string;
    description: string;
    wardName?: string;
    zoneName?: string;
    reporterName?: string;
    time: string;
    weight: number;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface HeatmapData {
  type: string;
  features: HeatmapFeature[];
}

export interface SituationRoomData {
  stats: SituationRoomStats;
  zones: ZoneOverview[];
  incidents: LiveIncident[];
  activities: ActivityItem[];
  votesSummary: VoteSummary[];
  heatmap?: HeatmapData;
  timestamp?: string;
}

// Demo data for fallback when backend is unavailable
const DEMO_SITUATION_DATA: SituationRoomData = {
  stats: {
    totalZones: 12,
    totalWards: 96,
    totalPollingUnits: 2400,
    totalAgents: 2350,
    activeAgents: 2180,
    offlineAgents: 170,
    totalResults: 1920,
    pendingResults: 320,
    approvedResults: 1540,
    rejectedResults: 60,
    totalIncidents: 145,
    criticalIncidents: 18,
    highIncidents: 42,
    resultsProgress: 80,
    totalRegisteredVoters: 1250000,
    totalVotesCounted: 856000,
  },
  zones: [
    { id: '1', name: 'Zone A', wards: 12, pollingUnits: 280, agents: 275, activeAgents: 258, results: 224, progress: 80, incidents: 12, criticalIncidents: 2 },
    { id: '2', name: 'Zone B', wards: 10, pollingUnits: 220, agents: 218, activeAgents: 200, results: 180, progress: 82, incidents: 8, criticalIncidents: 1 },
    { id: '3', name: 'Zone C', wards: 8, pollingUnits: 180, agents: 178, activeAgents: 165, results: 145, progress: 81, incidents: 15, criticalIncidents: 3 },
    { id: '4', name: 'Zone D', wards: 11, pollingUnits: 250, agents: 245, activeAgents: 230, results: 200, progress: 80, incidents: 10, criticalIncidents: 2 },
    { id: '5', name: 'Zone E', wards: 9, pollingUnits: 200, agents: 198, activeAgents: 185, results: 162, progress: 81, incidents: 18, criticalIncidents: 4 },
    { id: '6', name: 'Zone F', wards: 7, pollingUnits: 160, agents: 158, activeAgents: 148, results: 130, progress: 81, incidents: 7, criticalIncidents: 1 },
  ],
  incidents: [
    { id: '1', type: 'Violence', zone: 'Zone A', ward: 'Ward 3', pollingUnit: 'PU-012', time: '2 min ago', severity: 'critical', status: 'pending', description: 'Physical altercation near polling booth', reporter: 'Agent John' },
    { id: '2', type: 'Ballot Stuffing', zone: 'Zone E', ward: 'Ward 7', pollingUnit: 'PU-145', time: '5 min ago', severity: 'critical', status: 'investigating', description: 'Suspected ballot box stuffing reported', reporter: 'Agent Sarah' },
    { id: '3', type: 'Disruption', zone: 'Zone B', ward: 'Ward 2', pollingUnit: 'PU-034', time: '8 min ago', severity: 'high', status: 'pending', description: 'Crowd disruption at polling unit entrance', reporter: 'Agent Mike' },
    { id: '4', type: 'Intimidation', zone: 'Zone C', ward: 'Ward 5', pollingUnit: 'PU-089', time: '12 min ago', severity: 'high', status: 'investigating', description: 'Voter intimidation by unknown individuals', reporter: 'Agent Lisa' },
    { id: '5', type: 'Equipment Failure', zone: 'Zone D', ward: 'Ward 1', pollingUnit: 'PU-201', time: '15 min ago', severity: 'medium', status: 'resolved', description: 'Biometric verification machine malfunction', reporter: 'Agent Tom' },
  ],
  activities: [
    { id: '1', type: 'result', message: 'Results uploaded from PU-456 (Zone B)', time: '1 min ago', icon: FileText },
    { id: '2', type: 'agent', message: 'Agent John Doe went online (Zone A)', time: '2 min ago', icon: Wifi },
    { id: '3', type: 'incident', message: 'New incident reported at PU-012 (Zone A)', time: '2 min ago', icon: AlertTriangle },
    { id: '4', type: 'result', message: 'Results approved for PU-789 (Zone C)', time: '3 min ago', icon: CheckCircle },
    { id: '5', type: 'agent', message: 'Agent Jane Smith went offline (Zone D)', time: '4 min ago', icon: WifiOff },
    { id: '6', type: 'result', message: 'Results uploaded from PU-123 (Zone E)', time: '5 min ago', icon: FileText },
    { id: '7', type: 'incident', message: 'Incident resolved at PU-201 (Zone D)', time: '6 min ago', icon: CheckCircle },
    { id: '8', type: 'result', message: 'Results rejected for PU-567 (Zone F)', time: '7 min ago', icon: XCircle },
  ],
  votesSummary: [
    { party: 'APC', votes: 342500, percentage: 40, color: 'bg-blue-500' },
    { party: 'PDP', votes: 291600, percentage: 34, color: 'bg-green-500' },
    { party: 'LP', votes: 154080, percentage: 18, color: 'bg-red-500' },
    { party: 'NNPP', votes: 68320, percentage: 8, color: 'bg-purple-500' },
  ],
  heatmap: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: '1',
          type: 'Violence',
          severity: 'critical',
          status: 'pending',
          description: 'Physical altercation',
          wardName: 'Ward 3',
          zoneName: 'Zone A',
          reporterName: 'Agent John',
          time: '2 min ago',
          weight: 1
        },
        geometry: {
          type: 'Point',
          coordinates: [8.6753, 9.0820]
        }
      }
    ]
  }
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function to get icon based on activity type
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'result':
      return FileText;
    case 'incident':
      return AlertTriangle;
    case 'agent':
      return Wifi;
    default:
      return Activity;
  }
};

// Helper function to format time ago
const getTimeAgo = (dateString?: string): string => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  } catch {
    return dateString;
  }
};

// Helper function to get party color
const getPartyColor = (party: string): string => {
  const partyColors: Record<string, string> = {
    'APC': 'bg-blue-500',
    'PDP': 'bg-green-500',
    'LP': 'bg-red-500',
    'NNPP': 'bg-purple-500',
    'ACCORD': 'bg-orange-500',
    'SDP': 'bg-yellow-500',
    'APGA': 'bg-indigo-500',
    'YPP': 'bg-pink-500',
  };
  return partyColors[party] || 'bg-gray-500';
};

export function useSituationRoomData(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<SituationRoomData>(DEMO_SITUATION_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

 // In useSituationRoomData.ts, update the fetch functions:

// Fetch all incidents
const fetchIncidents = useCallback(async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No authentication token found');
      return null;
    }

    console.log('Fetching incidents with token:', token.substring(0, 20) + '...');

    const response = await fetch(`${API_BASE_URL}/situation/incidents`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.error('Authentication failed - token may be expired');
      // You might want to redirect to login here
      return null;
    }

    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const result = await response.json();
    console.log('Incidents response:', result);
    
    // Handle different response structures
    if (result.success && Array.isArray(result.incidents)) {
      return result.incidents;
    } else if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return null;
  }
}, []);

// Fetch heatmap data
const fetchHeatmapData = useCallback(async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No authentication token found');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/situation/incidents/heatmap`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.error('Authentication failed - token may be expired');
      return null;
    }

    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const result = await response.json();
    console.log('Heatmap response:', result);
    
    if (result.success && result.heatmap) {
      return result.heatmap;
    }
    return null;
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return null;
  }
}, []);

  // Fetch heatmap data
//   const fetchHeatmapData = useCallback(async () => {
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No authentication token found');

//       const response = await fetch(`${API_BASE_URL}/situation/incidents/heatmap`, {
//         headers: { 
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
//       const result = await response.json();
//       console.log('Heatmap response:', result);
      
//       if (result.success && result.heatmap) {
//         return result.heatmap;
//       }
//       return null;
//     } catch (error) {
//       console.error('Error fetching heatmap data:', error);
//       return null;
//     }
//   }, []);

  const fetchAllData = useCallback(async (showToastMessage = false) => {
    if (!user) return;

    try {
      if (showToastMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setUsingDemoData(false);

      // Fetch incidents data
      const incidentsData = await fetchIncidents();
      const heatmapData = await fetchHeatmapData();

      console.log('Fetched incidents:', incidentsData);
      console.log('Fetched heatmap:', heatmapData);

      // Check if we got any real data
      const hasRealData = incidentsData || heatmapData;

      if (hasRealData && incidentsData && incidentsData.length > 0) {
        // Format incidents for display
        const formattedIncidents = incidentsData.map((inc: any) => ({
          id: inc.id,
          type: inc.type || 'Unknown',
          description: inc.description || 'No description',
          zone: inc.zone || 'Unknown Zone',
          zoneId: inc.zoneId,
          ward: inc.ward || 'Unknown Ward',
          wardId: inc.wardId,
          pollingUnit: inc.pollingUnit?.name || inc.pollingUnitName || 'Unknown PU',
          pollingUnitId: inc.pollingUnitId,
          time: getTimeAgo(inc.createdAt),
          severity: inc.severity?.toLowerCase() || 'medium',
          status: inc.status?.toLowerCase() || 'pending',
          reporter: inc.reporter?.name || inc.reporterName,
          reporterId: inc.reporterId,
          images: inc.mediaUrl ? [inc.mediaUrl] : [],
          latitude: inc.pollingUnit?.latitude,
          longitude: inc.pollingUnit?.longitude,
        }));

        // Create a default zone for all incidents since we don't have zone info
        const defaultZone = {
          id: 'zone-1',
          name: 'All Incidents',
          wards: 1,
          pollingUnits: formattedIncidents.length,
          agents: formattedIncidents.length,
          activeAgents: formattedIncidents.length,
          results: 0,
          progress: 0,
          incidents: formattedIncidents.length,
          criticalIncidents: formattedIncidents.filter(i => i.severity === 'critical').length,
        };

        // Create activities from incidents
        const activities: ActivityItem[] = formattedIncidents.slice(0, 10).map((inc: any) => ({
          id: `inc-${inc.id}`,
          type: 'incident',
          message: `New ${inc.severity} incident reported`,
          time: inc.time,
          icon: AlertTriangle,
          createdAt: inc.createdAt,
        }));

        // Calculate stats
        const criticalCount = formattedIncidents.filter(i => i.severity === 'critical').length;
        const highCount = formattedIncidents.filter(i => i.severity === 'high').length;

        const stats = {
          totalZones: 1,
          totalWards: 1,
          totalPollingUnits: formattedIncidents.length,
          totalAgents: formattedIncidents.length,
          activeAgents: formattedIncidents.length,
          offlineAgents: 0,
          totalResults: 0,
          pendingResults: 0,
          approvedResults: 0,
          rejectedResults: 0,
          totalIncidents: formattedIncidents.length,
          criticalIncidents: criticalCount,
          highIncidents: highCount,
          resultsProgress: 0,
          totalRegisteredVoters: 1250000,
          totalVotesCounted: 856000,
        };

        const transformedData: SituationRoomData = {
          stats,
          zones: [defaultZone],
          incidents: formattedIncidents,
          activities,
          votesSummary: DEMO_SITUATION_DATA.votesSummary,
          heatmap: heatmapData || DEMO_SITUATION_DATA.heatmap,
          timestamp: new Date().toISOString()
        };

        setData(transformedData);
        setUsingDemoData(false);
        setLastUpdated(new Date());

        if (showToastMessage) {
          toast({
            title: "Success",
            description: `Loaded ${formattedIncidents.length} incidents`,
          });
        }
      } else {
        // No real data, use demo data
        console.log('No real data received, using demo data');
        setData(DEMO_SITUATION_DATA);
        setUsingDemoData(true);
        
        if (showToastMessage) {
          toast({
            title: "Demo Mode",
            description: "Showing sample situation data",
            variant: "default",
          });
        }
      }

    } catch (error) {
      console.error('❌ Error fetching situation room data:', error);
      setData(DEMO_SITUATION_DATA);
      setUsingDemoData(true);
      setError('Failed to load situation room data');
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample situation data",
          variant: "default",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast, fetchIncidents, fetchHeatmapData]);

  // Refresh function
  const refreshData = useCallback((showToast = false) => {
    return fetchAllData(showToast);
  }, [fetchAllData]);

  // Auto-refresh effect
  useEffect(() => {
    fetchAllData();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchAllData(false);
        setLastUpdated(new Date());
      }, options.refreshInterval || 30000);
      
      return () => clearInterval(interval);
    }
  }, [fetchAllData, options?.autoRefresh, options?.refreshInterval]);

  return {
    ...data,
    loading,
    refreshing,
    error,
    usingDemoData,
    lastUpdated,
    refreshData,
  };
}