// hooks/useSituationRoomData.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { incidentsApi, hasValidCoordinates } from '@/lib/api/incidents';
import { resultsApi } from '@/lib/api/results';
import { reportsApi } from '@/lib/api/reports';
import { AlertTriangle, FileText, Wifi, Activity } from 'lucide-react';

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
  createdAt?: string;
}

export interface ActivityItem {
  id: string;
  type: 'result' | 'agent' | 'incident' | 'report';
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

export interface SituationRoomData {
  stats: SituationRoomStats | null;
  zones: ZoneOverview[];
  incidents: LiveIncident[];
  activities: ActivityItem[];
  votesSummary: VoteSummary[];
  timestamp?: string;
}

// Helper function to get icon based on activity type
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'result':
      return FileText;
    case 'incident':
      return AlertTriangle;
    case 'agent':
      return Wifi;
    case 'report':
      return FileText;
    default:
      return Activity;
  }
};

// Helper function to format time ago
const getTimeAgo = (dateString?: string): string => {
  if (!dateString) return 'Just now';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  } catch {
    return dateString || 'Just now';
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
    'ADC': 'bg-teal-500',
    'ADP': 'bg-cyan-500',
    'AAC': 'bg-rose-500',
    'ZLP': 'bg-amber-500',
  };
  return partyColors[party] || 'bg-gray-500';
};

export function useSituationRoomData(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  zoneId?: string;
}) {
  const [data, setData] = useState<SituationRoomData>({
    stats: null,
    zones: [],
    incidents: [],
    activities: [],
    votesSummary: [],
    timestamp: undefined,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to update incidents (for WebSocket)
  const updateIncidents = useCallback((newIncidents: any[]) => {
    if (!newIncidents || newIncidents.length === 0) return;
    
    setData(prev => ({
      ...prev,
      incidents: newIncidents.map(inc => ({
        id: inc.id || `inc-${Date.now()}-${Math.random()}`,
        type: inc.type || 'Unknown',
        description: inc.description || 'No description',
        zone: inc.zoneName || inc.zone || 'Unknown Zone',
        zoneId: inc.zoneId,
        ward: inc.wardName || inc.ward || 'Unknown Ward',
        wardId: inc.wardId,
        pollingUnit: inc.pollingUnitName || inc.pollingUnit || 'Unknown PU',
        pollingUnitId: inc.pollingUnitId,
        time: inc.time || getTimeAgo(inc.createdAt),
        severity: (inc.severity || 'medium').toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
        status: (inc.status || 'pending').toLowerCase() as 'pending' | 'investigating' | 'resolved',
        reporter: typeof inc.reporter === 'string' ? inc.reporter : (inc.reporterName || inc.reporter?.name || 'Unknown'),
        reporterId: inc.reporterId || inc.reported_by,
        images: Array.isArray(inc.images)
          ? inc.images.filter((img: any): img is string => typeof img === 'string')
          : (typeof inc.mediaUrl === 'string' ? [inc.mediaUrl] : []),
        latitude: inc.latitude,
        longitude: inc.longitude,
        createdAt: inc.createdAt || inc.time,
      })),
    }));
    setLastUpdated(new Date());
  }, []);

  // Function to update stats (for WebSocket)
  const updateStats = useCallback((newStats: any) => {
    setData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        ...newStats,
      },
    }));
    setLastUpdated(new Date());
  }, []);

  // Function to add activity (for WebSocket)
  const addActivity = useCallback((activity: any) => {
    setData(prev => ({
      ...prev,
      activities: [
        {
          id: activity.id || `act-${Date.now()}`,
          type: activity.type || 'incident',
          message: activity.message || 'New activity',
          time: activity.time || new Date().toISOString(),
          icon: activity.icon || AlertTriangle,
          data: activity.data,
          createdAt: activity.createdAt || new Date().toISOString(),
        },
        ...prev.activities,
      ].slice(0, 50), // Keep last 50 activities
    }));
    setLastUpdated(new Date());
  }, []);

  // Fetch data function - using real APIs
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    setError(null);
    
    try {
      const zoneId = options?.zoneId;

      // Fetch incidents with coordinates
      const incidentResponse = await incidentsApi.getIncidentsForMap();
      
      if (!incidentResponse.success) {
        setError(incidentResponse.error || 'Failed to fetch incident data');
        setData({
          stats: null,
          zones: [],
          incidents: [],
          activities: [],
          votesSummary: [],
          timestamp: undefined,
        });
        return;
      }

      if (!incidentResponse.incidents || incidentResponse.incidents.length === 0) {
        setError('No incidents found');
        setData({
          stats: null,
          zones: [],
          incidents: [],
          activities: [],
          votesSummary: [],
          timestamp: undefined,
        });
        return;
      }

      // Transform incidents from API
      const formattedIncidents: LiveIncident[] = incidentResponse.incidents.map(inc => ({
        id: inc.id || `inc-${Date.now()}-${Math.random()}`,
        type: inc.type || 'Unknown',
        description: inc.description || 'No description',
        zone: inc.zoneName || inc.zone || 'Unknown Zone',
        zoneId: inc.zoneId,
        ward: inc.wardName || inc.ward || 'Unknown Ward',
        wardId: inc.wardId,
        pollingUnit: typeof inc.pollingUnit === 'string' 
          ? (inc.pollingUnit || 'Unknown PU') 
          : (inc.pollingUnitName || (typeof inc.pollingUnit?.name === 'string' ? inc.pollingUnit.name : 'Unknown PU')),
        pollingUnitId: inc.pollingUnitId || (typeof inc.pollingUnit !== 'string' ? inc.pollingUnit?.id : undefined),
        time: inc.time || getTimeAgo(inc.createdAt),
        severity: (inc.severity || 'medium').toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
        status: (inc.status || 'pending').toLowerCase() as 'pending' | 'investigating' | 'resolved',
        reporter: typeof inc.reporter === 'string' ? inc.reporter : (inc.reporterName || inc.reporter?.name || 'Unknown'),
        reporterId: inc.reporterId || inc.reported_by,
        images: Array.isArray(inc.images)
          ? inc.images.filter((img): img is string => typeof img === 'string')
          : (typeof inc.mediaUrl === 'string' ? [inc.mediaUrl] : []),
        latitude: inc.latitude || (typeof inc.pollingUnit !== 'string' ? inc.pollingUnit?.latitude : undefined),
        longitude: inc.longitude || (typeof inc.pollingUnit !== 'string' ? inc.pollingUnit?.longitude : undefined),
        createdAt: inc.createdAt || inc.time,
      }));

      // Extract zones from incidents
      const zoneMap = new Map<string, ZoneOverview>();
      formattedIncidents.forEach(inc => {
        const zoneKey = inc.zoneId || `zone-${inc.zone.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        if (!zoneMap.has(zoneKey)) {
          zoneMap.set(zoneKey, {
            id: zoneKey,
            name: inc.zone,
            wards: 0,
            pollingUnits: 0,
            agents: 0,
            activeAgents: 0,
            results: 0,
            progress: 0,
            incidents: 0,
            criticalIncidents: 0,
          });
        }
        const zone = zoneMap.get(zoneKey)!;
        zone.pollingUnits += 1;
        zone.incidents += 1;
        if (inc.severity === 'critical') {
          zone.criticalIncidents = (zone.criticalIncidents || 0) + 1;
        }
      });

      const zones = Array.from(zoneMap.values());

      // ✅ Fetch vote summary using situation room endpoint
      let votes: VoteSummary[] = [];
      let totalVotes = 0;
      
      try {
        // ✅ Use the situation room endpoint for vote summary (not admin)
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
        const token = localStorage.getItem('authToken');
        
        if (token) {
          let voteUrl = `${API_BASE_URL}/situation/votes/summary`;
          
          // If zoneId is provided, filter by zone
          if (zoneId) {
            voteUrl = `${API_BASE_URL}/situation/zones/${zoneId}/votes/summary`;
          }
          
          console.log('📡 Fetching vote summary from:', voteUrl);
          
          const response = await fetch(voteUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log('📡 Vote summary response:', result);
            
            if (result.success && result.summary) {
              votes = result.summary.map((v: any) => ({
                party: v.party || v.partyName || 'Unknown',
                partyId: v.partyId,
                partyLogo: v.partyLogo || null,
                votes: v.votes || v.totalVotes || 0,
                percentage: v.percentage || 0,
                color: v.color || getPartyColor(v.party || v.partyName || 'Unknown'),
              }));
              totalVotes = result.totalVotes || votes.reduce((sum, v) => sum + v.votes, 0);
            }
          } else {
            console.warn('⚠️ Vote summary endpoint returned:', response.status);
          }
        }
      } catch (err) {
        console.warn('Could not fetch vote data:', err);
        // Keep votes as empty array
      }

      // ✅ Fetch report stats (optional)
      let reportStats = null;
      try {
        if (zoneId) {
          reportStats = await reportsApi.getReportStats(zoneId);
        }
      } catch (err) {
        console.warn('Could not fetch report stats:', err);
      }

      // Calculate stats from incidents
      const criticalCount = formattedIncidents.filter(i => i.severity === 'critical').length;
      const highCount = formattedIncidents.filter(i => i.severity === 'high').length;
      const resolvedCount = formattedIncidents.filter(i => i.status === 'resolved').length;
      const pendingCount = formattedIncidents.filter(i => i.status === 'pending').length;
      const investigatingCount = formattedIncidents.filter(i => i.status === 'investigating').length;

      const stats: SituationRoomStats = {
        totalZones: zones.length,
        totalWards: zones.reduce((sum, z) => sum + z.wards, 0),
        totalPollingUnits: formattedIncidents.length,
        totalAgents: 0,
        activeAgents: 0,
        offlineAgents: 0,
        totalResults: resolvedCount,
        pendingResults: pendingCount,
        approvedResults: resolvedCount,
        rejectedResults: 0,
        totalIncidents: formattedIncidents.length,
        criticalIncidents: criticalCount,
        highIncidents: highCount,
        resultsProgress: formattedIncidents.length > 0 ? Math.round((resolvedCount / formattedIncidents.length) * 100) : 0,
        totalRegisteredVoters: 0,
        totalVotesCounted: votes.reduce((sum, v) => sum + v.votes, 0),
      };

      // Create activities from incidents
      const activities: ActivityItem[] = formattedIncidents.slice(0, 20).map(inc => ({
        id: `act-${inc.id}`,
        type: 'incident' as const,
        message: `${inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)} incident: ${inc.type} - ${inc.description.substring(0, 60)}${inc.description.length > 60 ? '...' : ''}`,
        time: inc.time,
        icon: AlertTriangle,
        createdAt: inc.createdAt,
      }));

      // If report stats available, add recent reports to activities
      if (reportStats?.recentReports && reportStats.recentReports.length > 0) {
        const reportActivities = reportStats.recentReports.slice(0, 5).map(report => ({
          id: `report-${report.id}`,
          type: 'report' as const,
          message: `Report "${report.name}" generated (${report.format.toUpperCase()})`,
          time: report.generatedAt,
          icon: FileText,
          createdAt: report.generatedAt,
        }));
        activities.unshift(...reportActivities);
      }

      setData({
        stats,
        zones,
        incidents: formattedIncidents,
        activities: activities.slice(0, 25), // Limit to 25 activities
        votesSummary: votes,
        timestamp: new Date().toISOString(),
      });

      setError(null);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Error fetching situation room data:', err);
      setError(err?.message || 'Failed to fetch data');
      setData({
        stats: null,
        zones: [],
        incidents: [],
        activities: [],
        votesSummary: [],
        timestamp: undefined,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [options?.zoneId]);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (options?.autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchData(false);
      }, options.refreshInterval || 30000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [options?.autoRefresh, options?.refreshInterval, fetchData]);

  return {
    ...data,
    loading,
    refreshing,
    error,
    lastUpdated,
    refreshData: fetchData,
    updateIncidents,
    updateStats,
    addActivity,
  };
}