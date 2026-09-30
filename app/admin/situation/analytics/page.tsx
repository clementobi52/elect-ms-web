"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  RefreshCw,
  Download,
  Wifi,
  WifiOff,
  Globe,
  Loader2,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  Building2,
  Layers,
  Zap,
  Shield,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';

// ============================================
// TYPES
// ============================================

interface AnalyticsData {
  overview: {
    totalPollingUnits: number;
    totalWards: number;
    totalZones: number;
    totalAgents: number;
    activeAgents: number;
    totalIncidents: number;
    criticalIncidents: number;
    highIncidents: number;
    totalResults: number;
    verifiedResults: number;
    pendingResults: number;
    rejectedResults: number;
    overallProgress: number;
    voterTurnout: number;
  };
  trends: {
    incidents: { date: string; count: number }[];
    results: { date: string; count: number }[];
    agents: { date: string; online: number; offline: number }[];
  };
  distribution: {
    incidentsBySeverity: { severity: string; count: number; color: string }[];
    incidentsByStatus: { status: string; count: number; color: string }[];
    resultsByStatus: { status: string; count: number; color: string }[];
    incidentsByZone: { zone: string; count: number }[];
    resultsByZone: { zone: string; count: number }[];
    agentsByZone: { zone: string; count: number }[];
  };
  performance: {
    topZones: { zone: string; progress: number; incidents: number; agents: number }[];
    bottomZones: { zone: string; progress: number; incidents: number; agents: number }[];
    topWards: { ward: string; zone: string; progress: number; incidents: number }[];
  };
}

interface FilterState {
  timeRange: string;
  zone: string;
  state: string;
}

// ============================================
// HELPERS
// ============================================

const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0';
};

const formatPercentage = (num: number) => {
  return num?.toFixed(1) || '0';
};

const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return <Badge className="bg-red-500 text-white">Critical</Badge>;
    case 'high':
      return <Badge className="bg-orange-500 text-white">High</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
    case 'low':
      return <Badge className="bg-blue-500 text-white">Low</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'verified': return 'text-green-600';
    case 'pending': return 'text-yellow-600';
    case 'rejected': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SituationRoomAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    timeRange: '7d',
    zone: 'all',
    state: 'all',
  });

  // ============================================
  // SOCKET SETUP
  // ============================================

  const setupSocketListeners = useCallback(() => {
    if (socketInitialized) return;
    
    const socket = getSocket();
    
    const unsubConnection = onConnectionChange((connected) => {
      console.log(`🔌 Analytics: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-analytics', {
          userId: user.id,
          situationRoom: true
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 Analytics: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'analytics-update':
          if (data) {
            setData(data);
            toast({
              title: "📊 Analytics Updated",
              description: "Analytics data has been refreshed",
              duration: 2000,
            });
          }
          break;
        default:
          break;
      }
    });

    setSocketInitialized(true);

    if (socket && socket.connected) {
      setIsConnected(true);
      sendSocketMessage('join-situation-room', {
        userId: user.id,
        role: user.role,
        userName: user.name
      });
      sendSocketMessage('request-analytics', {
        userId: user.id,
        situationRoom: true
      });
    }

    return () => {
      if (unsubConnection) unsubConnection();
      if (unsubMessages) unsubMessages();
      setSocketInitialized(false);
    };
  }, [user, toast]);

  // ============================================
  // API FUNCTIONS
  // ============================================

  const fetchAnalytics = useCallback(async (currentFilters: FilterState = filters) => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.timeRange !== '7d') params.append('timeRange', currentFilters.timeRange);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.state !== 'all') params.append('stateId', currentFilters.state);

      const url = `/situation/analytics?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        data: AnalyticsData;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics');
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    }
  }, [filters, toast]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      await fetchAnalytics(filters);
      setupSocketListeners();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load analytics');
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchAnalytics, toast, setupSocketListeners]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchAnalytics(newFilters);
  };

  const handleRefresh = () => {
    fetchData(false);
  };

  const handleExport = () => {
    if (!data) return;
    
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Polling Units', data.overview.totalPollingUnits],
      ['Total Wards', data.overview.totalWards],
      ['Total Zones', data.overview.totalZones],
      ['Total Agents', data.overview.totalAgents],
      ['Active Agents', data.overview.activeAgents],
      ['Total Incidents', data.overview.totalIncidents],
      ['Critical Incidents', data.overview.criticalIncidents],
      ['High Incidents', data.overview.highIncidents],
      ['Total Results', data.overview.totalResults],
      ['Verified Results', data.overview.verifiedResults],
      ['Pending Results', data.overview.pendingResults],
      ['Rejected Results', data.overview.rejectedResults],
      ['Overall Progress', `${data.overview.overallProgress}%`],
      ['Voter Turnout', `${data.overview.voterTurnout}%`],
    ];

    const csv = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (user?.id) {
      fetchData(true);
    }

    return () => {
      setSocketInitialized(false);
    };
  }, [user?.id]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="📊 Situation Room - Analytics"
          subtitle="Viewing analytics and insights"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="📊 Situation Room - Analytics"
          subtitle="Viewing analytics and insights"
        />
        <div className="flex-1 container p-4 md:p-6">
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">No analytics data available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="📊 Situation Room - Analytics"
        subtitle={`Viewing analytics and insights ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="hidden sm:flex">
              {isConnected ? (
                <><Wifi className="h-3 w-3 mr-1" /> Live</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
              )}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Globe className="h-3 w-3 mr-1" />
              Global View
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filters.timeRange}
              onValueChange={(value) => handleFilterChange('timeRange', value)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Connection Banner */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span>Real-time connection lost. Data may not show latest updates.</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto bg-white"
              onClick={() => {
                setSocketInitialized(false);
                setupSocketListeners();
              }}
            >
              Reconnect
            </Button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto"
              onClick={() => {
                setError(null);
                handleRefresh();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Incidents
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Polling Units</p>
                      <p className="text-xl font-bold text-blue-900">{formatNumber(data.overview.totalPollingUnits)}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 font-medium">Agents</p>
                      <p className="text-xl font-bold text-green-900">{formatNumber(data.overview.totalAgents)}</p>
                      <p className="text-xs text-green-600">{formatNumber(data.overview.activeAgents)} active</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-700 font-medium">Incidents</p>
                      <p className="text-xl font-bold text-red-900">{formatNumber(data.overview.totalIncidents)}</p>
                      <p className="text-xs text-red-600">Critical: {formatNumber(data.overview.criticalIncidents)}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-red-200 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-700 font-medium">Results</p>
                      <p className="text-xl font-bold text-yellow-900">{formatNumber(data.overview.totalResults)}</p>
                      <p className="text-xs text-yellow-600">{formatNumber(data.overview.verifiedResults)} verified</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-yellow-200 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-yellow-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-700 font-medium">Progress</p>
                      <p className="text-xl font-bold text-purple-900">{data.overview.overallProgress}%</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-purple-700" />
                    </div>
                  </div>
                  <Progress value={data.overview.overallProgress} className="h-1.5 mt-2" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-indigo-700 font-medium">Voter Turnout</p>
                      <p className="text-xl font-bold text-indigo-900">{formatPercentage(data.overview.voterTurnout)}%</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-indigo-200 flex items-center justify-center">
                      <Users className="h-4 w-4 text-indigo-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribution Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Incidents by Severity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Incidents by Severity</CardTitle>
                  <CardDescription>Distribution of incident severity levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.distribution.incidentsBySeverity.map((item) => (
                      <div key={item.severity}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${getSeverityColor(item.severity)}`} />
                            <span className="text-sm capitalize">{item.severity}</span>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                        <Progress 
                          value={(item.count / data.overview.totalIncidents) * 100 || 0} 
                          className={`h-2 ${getSeverityColor(item.severity)}`} 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Results by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Results by Status</CardTitle>
                  <CardDescription>Distribution of result verification status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.distribution.resultsByStatus.map((item) => (
                      <div key={item.status}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${getStatusColor(item.status)}`} />
                            <span className="text-sm capitalize">{item.status}</span>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                        <Progress 
                          value={(item.count / data.overview.totalResults) * 100 || 0} 
                          className={`h-2 ${item.status === 'Verified' ? 'bg-green-500' : item.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Zone Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Zone Performance</CardTitle>
                <CardDescription>Incidents by zone</CardDescription>
              </CardHeader>
              <CardContent>
                {data.distribution.incidentsByZone.length > 0 ? (
                  <div className="space-y-3">
                    {data.distribution.incidentsByZone.slice(0, 10).map((item) => (
                      <div key={item.zone}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{item.zone}</span>
                          <span className="text-sm font-medium">{item.count} incidents</span>
                        </div>
                        <Progress 
                          value={(item.count / Math.max(...data.distribution.incidentsByZone.map(i => i.count)) || 1) * 100} 
                          className="h-2 bg-red-100" 
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No incident data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Incidents by Severity Detail */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Incident Severity Breakdown</CardTitle>
                  <CardDescription>Detailed severity distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.distribution.incidentsBySeverity.map((item) => (
                      <div key={item.severity} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full ${getSeverityColor(item.severity)}`} />
                          <div>
                            <p className="font-medium capitalize">{item.severity}</p>
                            <p className="text-xs text-muted-foreground">{((item.count / data.overview.totalIncidents) * 100 || 0).toFixed(1)}%</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Incidents by Status Detail */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Incident Status Breakdown</CardTitle>
                  <CardDescription>Current status of all incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.distribution.incidentsByStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full ${item.status === 'Pending' ? 'bg-yellow-500' : item.status === 'Investigating' ? 'bg-purple-500' : item.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <div>
                            <p className="font-medium capitalize">{item.status}</p>
                            <p className="text-xs text-muted-foreground">{((item.count / data.overview.totalIncidents) * 100 || 0).toFixed(1)}%</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Incidents by Zone Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Incidents by Zone</CardTitle>
                <CardDescription>Zone-wise incident distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {data.distribution.incidentsByZone.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.distribution.incidentsByZone.map((item) => (
                      <div key={item.zone} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.zone}</p>
                          <p className="text-xs text-muted-foreground">{((item.count / data.overview.totalIncidents) * 100 || 0).toFixed(1)}%</p>
                        </div>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No incident data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            {/* Top Zones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Performing Zones
                </CardTitle>
                <CardDescription>Zones with the highest progress</CardDescription>
              </CardHeader>
              <CardContent>
                {data.performance.topZones.length > 0 ? (
                  <div className="space-y-3">
                    {data.performance.topZones.map((zone, index) => (
                      <div key={zone.zone} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{zone.zone}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{zone.agents} agents</span>
                              <span>{zone.incidents} incidents</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{zone.progress}%</p>
                          <p className="text-xs text-muted-foreground">progress</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No performance data available</p>
                )}
              </CardContent>
            </Card>

            {/* Bottom Zones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Zones Needing Attention
                </CardTitle>
                <CardDescription>Zones with the lowest progress</CardDescription>
              </CardHeader>
              <CardContent>
                {data.performance.bottomZones.length > 0 ? (
                  <div className="space-y-3">
                    {data.performance.bottomZones.map((zone, index) => (
                      <div key={zone.zone} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{zone.zone}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{zone.agents} agents</span>
                              <span>{zone.incidents} incidents</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{zone.progress}%</p>
                          <p className="text-xs text-muted-foreground">progress</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No performance data available</p>
                )}
              </CardContent>
            </Card>

            {/* Top Wards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Top Performing Wards
                </CardTitle>
                <CardDescription>Wards with the highest progress</CardDescription>
              </CardHeader>
              <CardContent>
                {data.performance.topWards.length > 0 ? (
                  <div className="space-y-3">
                    {data.performance.topWards.map((ward, index) => (
                      <div key={ward.ward} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{ward.ward}</p>
                            <p className="text-xs text-muted-foreground">{ward.zone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{ward.progress}%</p>
                          <p className="text-xs text-muted-foreground">{ward.incidents} incidents</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No performance data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}