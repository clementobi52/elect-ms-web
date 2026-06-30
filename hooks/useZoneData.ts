// hooks/useZoneData.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

export interface ZoneStats {
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
  resultsProgress: number;
}

export interface Ward {
  id: string;
  name: string;
  code?: string;
  pollingUnits: number;
  agents: number;
  activeAgents: number;
  resultsSubmitted: number;
  pendingResults: number;
  incidents: number;
  admin?: string;
  adminId?: string;
  progress: number;
}

export interface WardAdmin {
  id: string;
  name: string;
  email: string;
  ward: string;
  wardId: string;
  status: 'Online' | 'Offline';
  lastActive: string;
  resultsReviewed: number;
  updatedAt?: string;
}

export interface Incident {
  id: string;
  type: string;
  ward: string;
  wardId?: string;
  pollingUnit: string;
  pollingUnitId?: string;
  reporter: string;
  reporterId?: string;
  time: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'investigating' | 'resolved';
  description?: string;
}

export interface VoteSummary {
  party: string;
  partyId?: string;
  votes: number;
  percentage: number;
  color: string;
}

export interface ZoneData {
  stats: ZoneStats;
  wards: Ward[];
  wardAdmins: WardAdmin[];
  incidents: Incident[];
  votesSummary: VoteSummary[];
}

// Demo data for fallback
const DEMO_ZONE_DATA: ZoneData = {
  stats: {
    totalWards: 8,
    totalPollingUnits: 180,
    totalAgents: 175,
    activeAgents: 162,
    offlineAgents: 13,
    totalResults: 145,
    pendingResults: 28,
    approvedResults: 110,
    rejectedResults: 7,
    totalIncidents: 23,
    criticalIncidents: 4,
    resultsProgress: 80,
  },
  wards: [
    { 
      id: '1', 
      name: 'Ward 1', 
      code: 'W-001', 
      pollingUnits: 25, 
      agents: 24,
      activeAgents: 22,
      resultsSubmitted: 20,
      pendingResults: 3,
      incidents: 2,
      admin: 'Alice Johnson',
      adminId: 'a1',
      progress: 80
    },
    { 
      id: '2', 
      name: 'Ward 2', 
      code: 'W-002', 
      pollingUnits: 22, 
      agents: 22,
      activeAgents: 20,
      resultsSubmitted: 18,
      pendingResults: 4,
      incidents: 1,
      admin: 'Bob Smith',
      adminId: 'a2',
      progress: 82
    },
    { 
      id: '3', 
      name: 'Ward 3', 
      code: 'W-003', 
      pollingUnits: 28, 
      agents: 27,
      activeAgents: 25,
      resultsSubmitted: 22,
      pendingResults: 5,
      incidents: 4,
      admin: 'Carol White',
      adminId: 'a3',
      progress: 79
    },
    { 
      id: '4', 
      name: 'Ward 4', 
      code: 'W-004', 
      pollingUnits: 20, 
      agents: 20,
      activeAgents: 18,
      resultsSubmitted: 16,
      pendingResults: 3,
      incidents: 3,
      admin: 'David Brown',
      adminId: 'a4',
      progress: 80
    },
    { 
      id: '5', 
      name: 'Ward 5', 
      code: 'W-005', 
      pollingUnits: 24, 
      agents: 23,
      activeAgents: 21,
      resultsSubmitted: 19,
      pendingResults: 4,
      incidents: 5,
      admin: 'Eva Green',
      adminId: 'a5',
      progress: 79
    },
    { 
      id: '6', 
      name: 'Ward 6', 
      code: 'W-006', 
      pollingUnits: 18, 
      agents: 18,
      activeAgents: 17,
      resultsSubmitted: 15,
      pendingResults: 2,
      incidents: 2,
      admin: 'Frank Miller',
      adminId: 'a6',
      progress: 83
    },
    { 
      id: '7', 
      name: 'Ward 7', 
      code: 'W-007', 
      pollingUnits: 23, 
      agents: 22,
      activeAgents: 20,
      resultsSubmitted: 18,
      pendingResults: 4,
      incidents: 3,
      admin: 'Grace Lee',
      adminId: 'a7',
      progress: 78
    },
    { 
      id: '8', 
      name: 'Ward 8', 
      code: 'W-008', 
      pollingUnits: 20, 
      agents: 19,
      activeAgents: 19,
      resultsSubmitted: 17,
      pendingResults: 3,
      incidents: 3,
      admin: 'Henry Davis',
      adminId: 'a8',
      progress: 85
    },
  ],
  wardAdmins: [
    { id: 'a1', name: 'Alice Johnson', email: 'alice@example.com', ward: 'Ward 1', wardId: '1', status: 'Online', lastActive: '2 min ago', resultsReviewed: 45 },
    { id: 'a2', name: 'Bob Smith', email: 'bob@example.com', ward: 'Ward 2', wardId: '2', status: 'Online', lastActive: '5 min ago', resultsReviewed: 38 },
    { id: 'a3', name: 'Carol White', email: 'carol@example.com', ward: 'Ward 3', wardId: '3', status: 'Online', lastActive: '1 min ago', resultsReviewed: 52 },
    { id: 'a4', name: 'David Brown', email: 'david@example.com', ward: 'Ward 4', wardId: '4', status: 'Offline', lastActive: '30 min ago', resultsReviewed: 28 },
    { id: 'a5', name: 'Eva Green', email: 'eva@example.com', ward: 'Ward 5', wardId: '5', status: 'Online', lastActive: '3 min ago', resultsReviewed: 41 },
    { id: 'a6', name: 'Frank Miller', email: 'frank@example.com', ward: 'Ward 6', wardId: '6', status: 'Online', lastActive: '8 min ago', resultsReviewed: 35 },
    { id: 'a7', name: 'Grace Lee', email: 'grace@example.com', ward: 'Ward 7', wardId: '7', status: 'Online', lastActive: '4 min ago', resultsReviewed: 33 },
    { id: 'a8', name: 'Henry Davis', email: 'henry@example.com', ward: 'Ward 8', wardId: '8', status: 'Online', lastActive: '1 min ago', resultsReviewed: 47 },
  ],
  incidents: [
    { id: '1', type: 'Violence', ward: 'Ward 3', wardId: '3', pollingUnit: 'PU-012', reporter: 'Agent Mike', time: '15 min ago', severity: 'critical', status: 'pending' },
    { id: '2', type: 'Disruption', ward: 'Ward 5', wardId: '5', pollingUnit: 'PU-045', reporter: 'Agent Sarah', time: '30 min ago', severity: 'high', status: 'investigating' },
    { id: '3', type: 'Irregularity', ward: 'Ward 1', wardId: '1', pollingUnit: 'PU-003', reporter: 'Agent John', time: '45 min ago', severity: 'medium', status: 'investigating' },
    { id: '4', type: 'Fraud', ward: 'Ward 7', wardId: '7', pollingUnit: 'PU-078', reporter: 'Agent Lisa', time: '1 hour ago', severity: 'critical', status: 'pending' },
    { id: '5', type: 'Disruption', ward: 'Ward 4', wardId: '4', pollingUnit: 'PU-034', reporter: 'Agent Tom', time: '1.5 hours ago', severity: 'high', status: 'resolved' },
  ],
  votesSummary: [
    { party: 'APC', votes: 45230, percentage: 42, color: 'bg-blue-500' },
    { party: 'PDP', votes: 38450, percentage: 36, color: 'bg-green-500' },
    { party: 'LP', votes: 15890, percentage: 15, color: 'bg-red-500' },
    { party: 'NNPP', votes: 7520, percentage: 7, color: 'bg-purple-500' },
  ]
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function to calculate time ago
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

export function useZoneData(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [zoneData, setZoneData] = useState<ZoneData>(DEMO_ZONE_DATA);

  const fetchZoneData = useCallback(async (showToastMessage = false) => {
    if (!user || !user.zoneId) {
      console.log('No zone ID found for user');
      setUsingDemoData(true);
      setLoading(false);
      return;
    }

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

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all data in parallel
      const [statsRes, wardsRes, incidentsRes, pollingUnitsRes, wardAdminsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/admin/zone/${user.zoneId}/stats`, { headers }),
        fetch(`${API_BASE_URL}/admin/zone/${user.zoneId}/wards`, { headers }),
        fetch(`${API_BASE_URL}/admin/zone/${user.zoneId}/incidents`, { headers }),
        fetch(`${API_BASE_URL}/admin/zone/${user.zoneId}/polling-units`, { headers }),
        fetch(`${API_BASE_URL}/admin/zone/${user.zoneId}/ward-admins`, { headers })
      ]);

      // Process stats
      let statsData = null;
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        statsData = await statsRes.value.json();
        console.log('Stats data:', statsData);
      }

      // Process wards
      let wardsData = [];
      if (wardsRes.status === 'fulfilled' && wardsRes.value.ok) {
        const wardsJson = await wardsRes.value.json();
        wardsData = wardsJson.wards || wardsJson.data || [];
        console.log('Wards data:', wardsData);
      }

      // Process incidents
      let incidentsData = [];
      if (incidentsRes.status === 'fulfilled' && incidentsRes.value.ok) {
        const incidentsJson = await incidentsRes.value.json();
        incidentsData = incidentsJson.incidents || incidentsJson.data || [];
        console.log('Incidents data:', incidentsData);
      }

      // Process polling units
      let pollingUnitsData = [];
      if (pollingUnitsRes.status === 'fulfilled' && pollingUnitsRes.value.ok) {
        const puJson = await pollingUnitsRes.value.json();
        pollingUnitsData = puJson.pollingUnits || puJson.data || [];
        console.log('Polling units data:', pollingUnitsData);
      }

      // Process ward admins
      let wardAdminsData = [];
      if (wardAdminsRes.status === 'fulfilled' && wardAdminsRes.value.ok) {
        const adminsJson = await wardAdminsRes.value.json();
        wardAdminsData = adminsJson.wardAdmins || adminsJson.data || [];
        console.log('Ward admins data:', wardAdminsData);
      }

      // Transform the data
      const transformedData = transformZoneData(
        statsData,
        wardsData,
        incidentsData,
        pollingUnitsData,
        wardAdminsData
      );

      setZoneData(transformedData);
      setUsingDemoData(false);

      if (showToastMessage) {
        toast({
          title: "Success",
          description: "Zone data refreshed successfully",
        });
      }

    } catch (error) {
      console.error('Error fetching zone data:', error);
      setZoneData(DEMO_ZONE_DATA);
      setUsingDemoData(true);
      setError('Failed to load zone data');
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample zone data",
          variant: "default",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  const transformZoneData = (
    statsData: any,
    wardsData: any[],
    incidentsData: any[],
    pollingUnitsData: any[],
    wardAdminsData: any[]
  ): ZoneData => {
    // If no real data, return demo data
    if (!statsData && wardsData.length === 0 && incidentsData.length === 0) {
      return DEMO_ZONE_DATA;
    }

    // Calculate statistics
    const totalPollingUnits = pollingUnitsData.length || statsData?.stats?.totalPollingUnits || 0;
    const totalResults = pollingUnitsData.filter((pu: any) => pu.resultStatus && pu.resultStatus !== 'Not Submitted').length;
    const pendingResults = pollingUnitsData.filter((pu: any) => pu.resultStatus === 'Pending').length;
    const approvedResults = pollingUnitsData.filter((pu: any) => pu.resultStatus === 'Verified').length;
    const totalAgents = pollingUnitsData.filter((pu: any) => pu.agentId).length;
    const activeAgents = pollingUnitsData.filter((pu: any) => pu.agentStatus === 'Online').length;

    // Transform wards
    const wards: Ward[] = wardsData.map((ward: any) => ({
      id: ward.id,
      name: ward.name,
      code: ward.code || `W-${ward.id.slice(0, 4)}`,
      pollingUnits: ward.pollingUnits || 0,
      agents: ward.agents || 0,
      activeAgents: ward.activeAgents || 0,
      resultsSubmitted: ward.resultsSubmitted || 0,
      pendingResults: ward.pendingResults || 0,
      incidents: ward.incidents || 0,
      admin: ward.admin,
      adminId: ward.adminId,
      progress: ward.progress || 0,
    }));

    // Transform incidents
    const incidents: Incident[] = incidentsData.map((inc: any) => ({
      id: inc.id,
      type: inc.type,
      ward: inc.wardName || inc.ward?.name || 'Unknown',
      wardId: inc.wardId,
      pollingUnit: inc.pollingUnitName || inc.pollingUnit?.name || 'Unknown',
      pollingUnitId: inc.pollingUnitId,
      reporter: inc.reporterName || inc.reporter?.name || 'Unknown',
      reporterId: inc.reporterId,
      time: getTimeAgo(inc.createdAt),
      severity: inc.severity?.toLowerCase() || 'medium',
      status: inc.status?.toLowerCase() || 'pending',
      description: inc.description,
    }));

    // Transform ward admins
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const wardAdmins: WardAdmin[] = wardAdminsData.map((admin: any) => {
      const lastActiveTime = admin.updatedAt ? new Date(admin.updatedAt) : null;
      const isOnline = lastActiveTime && lastActiveTime > fiveMinutesAgo;

      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        ward: admin.ward?.name || admin.wardName || 'Unknown',
        wardId: admin.wardId,
        status: isOnline ? 'Online' : 'Offline',
        lastActive: getTimeAgo(admin.updatedAt),
        resultsReviewed: admin.resultsReviewed || 0,
        updatedAt: admin.updatedAt
      };
    });

    // Calculate votes summary (this would come from a separate endpoint ideally)
    const votesSummary: VoteSummary[] = DEMO_ZONE_DATA.votesSummary;

    return {
      stats: {
        totalWards: wardsData.length || statsData?.stats?.totalWards || 0,
        totalPollingUnits,
        totalAgents,
        activeAgents,
        offlineAgents: totalAgents - activeAgents,
        totalResults,
        pendingResults,
        approvedResults,
        rejectedResults: statsData?.stats?.rejectedResults || 0,
        totalIncidents: incidentsData.length || 0,
        criticalIncidents: incidentsData.filter((i: any) => i.severity === 'critical').length,
        resultsProgress: totalPollingUnits > 0 ? Math.round((totalResults / totalPollingUnits) * 100) : 0,
      },
      wards,
      wardAdmins,
      incidents,
      votesSummary,
    };
  };

  useEffect(() => {
    fetchZoneData();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchZoneData(false);
      }, options.refreshInterval || 30000);
      
      return () => clearInterval(interval);
    }
  }, [fetchZoneData, options?.autoRefresh, options?.refreshInterval]);

  return {
    ...zoneData,
    loading,
    refreshing,
    error,
    usingDemoData,
    refreshZoneData: (showToast = false) => fetchZoneData(showToast),
  };
}