// hooks/useZoneData.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';

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

// Neutral placeholder used until live data arrives. It is intentionally empty:
// the dashboard must not present invented wards or vote tallies as if they were
// real. An unreachable API is surfaced as an error instead.
const EMPTY_ZONE_DATA: ZoneData = {
  stats: {
    totalWards: 0,
    totalPollingUnits: 0,
    totalAgents: 0,
    activeAgents: 0,
    offlineAgents: 0,
    totalResults: 0,
    pendingResults: 0,
    approvedResults: 0,
    rejectedResults: 0,
    totalIncidents: 0,
    criticalIncidents: 0,
    resultsProgress: 0,
  },
  wards: [],
  wardAdmins: [],
  incidents: [],
  votesSummary: [],
};


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
  const [zoneData, setZoneData] = useState<ZoneData>(EMPTY_ZONE_DATA);

  const fetchZoneData = useCallback(async (showToastMessage = false) => {
    if (!user || !user.zoneId) {
      console.log('No zone ID found for user');
      setZoneData(EMPTY_ZONE_DATA);
      setError('Zone data is not available for your account.');
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

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = withTenantHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

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

      if (showToastMessage) {
        toast({
          title: "Success",
          description: "Zone data refreshed successfully",
        });
      }

    } catch (error) {
      console.error('Error fetching zone data:', error);
      const offline = isNetworkError(error);
      const message = offline ? SERVER_OFFLINE_MESSAGE : 'Failed to load zone data';
      setZoneData(EMPTY_ZONE_DATA);
      setError(message);

      if (showToastMessage) {
        toast({
          title: offline ? 'Server Offline' : 'Error',
          description: message,
          variant: "destructive",
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

    // Votes summary only if the stats endpoint provides it; never fabricated.
    const votesSummary: VoteSummary[] = Array.isArray(statsData?.votesSummary)
      ? statsData.votesSummary
      : [];

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
    refreshZoneData: (showToast = false) => fetchZoneData(showToast),
  };
}