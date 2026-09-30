"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Building2,
  Users,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  MapPin,
  Calendar,
  Download,
  Wifi,
  WifiOff,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  UserX,
  MoreVertical,
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';

// ============================================
// TYPES
// ============================================

interface Ward {
  id: string;
  name: string;
  code?: string;
  zoneId: string;
  zoneName: string;
  lgaId?: string;
  lgaName?: string;
  stateId?: string;
  stateName?: string;
  pollingUnits: number;
  pollingUnitsList?: PollingUnitSummary[];
  agents: number;
  activeAgents: number;
  incidents: number;
  criticalIncidents: number;
  highIncidents: number;
  results: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
  };
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface PollingUnitSummary {
  id: string;
  name: string;
  code: string;
  agentId?: string;
  agentName?: string;
  agentStatus?: string;
  resultStatus?: string;
  hasResults?: boolean;
  registeredVoters?: number;
}

interface WardStats {
  total: number;
  active: number;
  withAgents: number;
  withResults: number;
  totalIncidents: number;
  criticalIncidents: number;
  highIncidents: number;
  totalPollingUnits: number;
  totalAgents: number;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  zone: string;
  state: string;
  lga: string;
  hasAgents: string;
  hasResults: string;
  hasIncidents: string;
  sortBy: string;
}

// ============================================
// HELPERS
// ============================================

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Online':
      return <Badge className="bg-green-500 text-white">Online</Badge>;
    case 'Offline':
      return <Badge variant="secondary">Offline</Badge>;
    default:
      return <Badge variant="outline">Unassigned</Badge>;
  }
};

const getStatusDot = (status: string) => {
  if (status === 'Online') {
    return <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-1.5" />;
  } else if (status === 'Offline') {
    return <span className="h-2 w-2 rounded-full bg-gray-400 inline-block mr-1.5" />;
  }
  return <span className="h-2 w-2 rounded-full bg-gray-300 inline-block mr-1.5" />;
};

const getResultStatusBadge = (status: string) => {
  switch (status) {
    case 'Verified':
      return <Badge className="bg-green-500 text-white">Verified</Badge>;
    case 'Pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    case 'Rejected':
      return <Badge className="bg-red-500 text-white">Rejected</Badge>;
    default:
      return <Badge variant="outline">Not Submitted</Badge>;
  }
};

const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0';
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SituationRoomWardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [stats, setStats] = useState<WardStats>({
    total: 0,
    active: 0,
    withAgents: 0,
    withResults: 0,
    totalIncidents: 0,
    criticalIncidents: 0,
    highIncidents: 0,
    totalPollingUnits: 0,
    totalAgents: 0,
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    zone: 'all',
    state: 'all',
    lga: 'all',
    hasAgents: 'all',
    hasResults: 'all',
    hasIncidents: 'all',
    sortBy: 'name',
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ============================================
  // SOCKET SETUP
  // ============================================

  const setupSocketListeners = useCallback(() => {
    if (socketInitialized) return;
    
    const socket = getSocket();
    
    const unsubConnection = onConnectionChange((connected) => {
      console.log(`🔌 Wards: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-wards', {
          userId: user.id,
          situationRoom: true
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 Wards: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'wards-update':
          if (data && data.wards) {
            setWards(data.wards);
            if (data.stats) setStats(data.stats);
            if (data.pagination) setPagination(data.pagination);
          }
          break;
        case 'ward-updated':
          if (data && data.ward) {
            setWards(prev => 
              prev.map(w => 
                w.id === data.ward.id ? { ...w, ...data.ward } : w
              )
            );
          }
          break;
        case 'incident-reported':
          if (data && data.wardId) {
            setWards(prev => 
              prev.map(w => {
                if (w.id === data.wardId) {
                  const newIncidents = (w.incidents || 0) + 1;
                  const newCritical = data.severity === 'critical' 
                    ? (w.criticalIncidents || 0) + 1 
                    : (w.criticalIncidents || 0);
                  const newHigh = data.severity === 'high' 
                    ? (w.highIncidents || 0) + 1 
                    : (w.highIncidents || 0);
                  return {
                    ...w,
                    incidents: newIncidents,
                    criticalIncidents: newCritical,
                    highIncidents: newHigh,
                    progress: w.pollingUnits > 0 
                      ? Math.round((w.results?.total || 0) / w.pollingUnits * 100) 
                      : 0
                  };
                }
                return w;
              })
            );
            // Update stats
            setStats(prev => ({
              ...prev,
              totalIncidents: prev.totalIncidents + 1,
              criticalIncidents: data.severity === 'critical' 
                ? prev.criticalIncidents + 1 
                : prev.criticalIncidents,
              highIncidents: data.severity === 'high' 
                ? prev.highIncidents + 1 
                : prev.highIncidents,
            }));
            toast({
              title: "🚨 New Incident",
              description: `${data.type} reported in ${data.wardName}`,
              duration: 4000,
            });
          }
          break;
        case 'result-submitted':
          if (data && data.wardId) {
            setWards(prev => 
              prev.map(w => {
                if (w.id === data.wardId) {
                  return {
                    ...w,
                    results: {
                      ...w.results,
                      total: (w.results?.total || 0) + 1,
                      pending: (w.results?.pending || 0) + 1,
                    },
                    progress: w.pollingUnits > 0 
                      ? Math.round(((w.results?.total || 0) + 1) / w.pollingUnits * 100) 
                      : 0
                  };
                }
                return w;
              })
            );
            setStats(prev => ({
              ...prev,
              withResults: prev.withResults + 1,
            }));
            toast({
              title: "📄 Result Submitted",
              description: `New results in ${data.wardName}`,
              duration: 3000,
            });
          }
          break;
        case 'agent-assigned':
          if (data && data.wardId) {
            setWards(prev => 
              prev.map(w => {
                if (w.id === data.wardId) {
                  return {
                    ...w,
                    agents: (w.agents || 0) + 1,
                    activeAgents: (w.activeAgents || 0) + 1,
                  };
                }
                return w;
              })
            );
            setStats(prev => ({
              ...prev,
              withAgents: prev.withAgents + 1,
              totalAgents: prev.totalAgents + 1,
            }));
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
      sendSocketMessage('request-wards', {
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

  const fetchWards = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.state !== 'all') params.append('stateId', currentFilters.state);
      if (currentFilters.lga !== 'all') params.append('lgaId', currentFilters.lga);
      if (currentFilters.hasAgents !== 'all') params.append('hasAgents', currentFilters.hasAgents);
      if (currentFilters.hasResults !== 'all') params.append('hasResults', currentFilters.hasResults);
      if (currentFilters.hasIncidents !== 'all') params.append('hasIncidents', currentFilters.hasIncidents);
      if (currentFilters.sortBy !== 'name') params.append('sortBy', currentFilters.sortBy);

      setIsLoadingMore(pageNum > 1);

      const url = `/situation/wards?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        wards: Ward[];
        pagination: PaginationData;
        stats: WardStats;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.wards) {
        if (pageNum === 1) {
          setWards(response.wards);
        } else {
          setWards(prev => [...prev, ...response.wards]);
        }
        
        if (response.pagination) {
          setPagination(response.pagination);
        }

        if (response.stats) {
          console.log('📊 Stats received:', response.stats);
          setStats(response.stats);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
      setError('Failed to load wards');
      toast({
        title: "Error",
        description: "Failed to load wards",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [limit, filters, toast]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      await fetchWards(1, filters, limit);
      setupSocketListeners();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load wards');
      toast({
        title: "Error",
        description: "Failed to load wards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchWards, toast, setupSocketListeners, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setWards([]);
    fetchWards(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setWards([]);
    fetchWards(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWards(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setWards([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      zone: 'all',
      state: 'all',
      lga: 'all',
      hasAgents: 'all',
      hasResults: 'all',
      hasIncidents: 'all',
      sortBy: 'name',
    };
    setFilters(resetFilters);
    setPage(1);
    setWards([]);
    fetchWards(1, resetFilters, limit);
  };

  const handleViewWard = (ward: Ward) => {
    setSelectedWard(ward);
    setIsViewDialogOpen(true);
  };

  const handleViewWardDetails = (wardId: string) => {
    router.push(`/admin/wards/${wardId}`);
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
  // MEMOIZED VALUES
  // ============================================

  const uniqueZones = useMemo(() => {
    return Array.from(new Set(wards.map(w => w.zoneName))).filter(Boolean);
  }, [wards]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(wards.map(w => w.stateName))).filter(Boolean);
  }, [wards]);

  const uniqueLgas = useMemo(() => {
    return Array.from(new Set(wards.map(w => w.lgaName))).filter(Boolean);
  }, [wards]);

  const hasActiveFilters = filters.search || 
    filters.zone !== 'all' || 
    filters.state !== 'all' ||
    filters.lga !== 'all' ||
    filters.hasAgents !== 'all' ||
    filters.hasResults !== 'all' ||
    filters.hasIncidents !== 'all';

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="🏛️ Situation Room - Wards"
          subtitle="Viewing all wards across all zones"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="🏛️ Situation Room - Wards"
        subtitle={`Viewing all wards ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
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
          {!isConnected && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSocketInitialized(false);
                setupSocketListeners();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          )}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Wards</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">With Agents</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.withAgents)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {stats.total > 0 ? Math.round((stats.withAgents / stats.total) * 100) : 0}% assigned
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">With Results</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatNumber(stats.withResults)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                {stats.total > 0 ? Math.round((stats.withResults / stats.total) * 100) : 0}% submitted
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Incidents</p>
                  <p className="text-2xl font-bold text-red-900">{formatNumber(stats.totalIncidents)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
              </div>
              <p className="text-xs text-red-600 mt-1">
                Critical: {formatNumber(stats.criticalIncidents)} | High: {formatNumber(stats.highIncidents)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Total Agents</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.totalAgents)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wards by name, zone, or LGA..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {Object.values(filters).filter(v => v !== 'all' && v !== '' && v !== 'name').length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.zone}
                  onChange={(e) => handleFilterChange('zone', e.target.value)}
                >
                  <option value="all">All Zones</option>
                  {uniqueZones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">State</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                >
                  <option value="all">All States</option>
                  {uniqueStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">LGA</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.lga}
                  onChange={(e) => handleFilterChange('lga', e.target.value)}
                >
                  <option value="all">All LGAs</option>
                  {uniqueLgas.map((lga) => (
                    <option key={lga} value={lga}>{lga}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sort By</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="name">Name</option>
                  <option value="pollingUnits">Polling Units</option>
                  <option value="agents">Agents</option>
                  <option value="incidents">Incidents</option>
                  <option value="progress">Progress</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Wards Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Wards
              </CardTitle>
              <CardDescription>
                {wards.length === 0 ? 'No wards found' :
                  `Showing ${wards.length} of ${pagination.total || wards.length} wards`}
                {pagination.totalPages > 1 && (
                  <span className="ml-2 text-xs">
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <select
                  className="border rounded-md px-2 py-1 text-sm bg-background"
                  value={limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <Badge variant="outline" className="text-xs">
                Total: {pagination.total || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {wards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No wards found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all wards
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ward</TableHead>
                        <TableHead>Zone / LGA</TableHead>
                        <TableHead>Polling Units</TableHead>
                        <TableHead>Agents</TableHead>
                        <TableHead>Incidents</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wards.map((ward) => (
                        <TableRow key={ward.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ward.name}</p>
                              <p className="text-xs text-muted-foreground">{ward.code || `WD-${ward.id.slice(0, 8)}`}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{ward.zoneName}</p>
                              <p className="text-xs text-muted-foreground">{ward.lgaName || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{formatNumber(ward.pollingUnits)}</p>
                            <p className="text-xs text-muted-foreground">units</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{formatNumber(ward.agents)}</span>
                              {ward.activeAgents > 0 && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  {formatNumber(ward.activeAgents)} active
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {ward.criticalIncidents > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">
                                  {formatNumber(ward.criticalIncidents)}
                                </Badge>
                              )}
                              {ward.highIncidents > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs">
                                  {formatNumber(ward.highIncidents)}
                                </Badge>
                              )}
                              {ward.incidents > 0 && (
                                <span className="text-sm font-medium ml-1">({formatNumber(ward.incidents)})</span>
                              )}
                              {ward.incidents === 0 && (
                                <span className="text-sm text-muted-foreground">0</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-sm">{formatNumber(ward.results?.verified || 0)} verified</span>
                              </div>
                              {ward.results?.pending > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs text-muted-foreground">{formatNumber(ward.results.pending)} pending</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress 
                                value={ward.progress || 0} 
                                className="h-2" 
                              />
                              <p className="text-xs text-muted-foreground text-right">
                                {ward.progress || 0}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleViewWard(ward)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewWardDetails(ward.id)}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  View Ward Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/admin/polling-units?wardId=${ward.id}`)}>
                                  <MapPin className="h-4 w-4 mr-2" />
                                  View Polling Units
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/admin/agents?wardId=${ward.id}`)}>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Agents
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {wards.length} of {pagination.total} wards
                      <span className="ml-2">
                        (Page {pagination.page} of {pagination.totalPages})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const prevPage = Math.max(1, page - 1);
                          setPage(prevPage);
                          setWards([]);
                          fetchWards(prevPage, filters, limit);
                        }}
                        disabled={page <= 1 || isLoadingMore}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-muted-foreground px-2">
                        {page} / {pagination.totalPages}
                      </span>
                      
                      {page < pagination.totalPages && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              Load More
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* View Ward Dialog */}
        <Dialog open={isViewDialogOpen && selectedWard !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ward Details
              </DialogTitle>
              <DialogDescription>
                {selectedWard?.name} - {selectedWard?.zoneName}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedWard && (
                <div className="space-y-4 py-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600">Polling Units</p>
                      <p className="text-xl font-bold text-blue-700">{formatNumber(selectedWard.pollingUnits)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600">Agents</p>
                      <p className="text-xl font-bold text-green-700">{formatNumber(selectedWard.agents)}</p>
                      <p className="text-xs text-green-600">{selectedWard.activeAgents} active</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600">Incidents</p>
                      <p className="text-xl font-bold text-red-700">{formatNumber(selectedWard.incidents)}</p>
                      {selectedWard.criticalIncidents > 0 && (
                        <p className="text-xs text-red-600">Critical: {formatNumber(selectedWard.criticalIncidents)}</p>
                      )}
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600">Progress</p>
                      <p className="text-xl font-bold text-purple-700">{selectedWard.progress || 0}%</p>
                      <div className="mt-1">
                        <Progress value={selectedWard.progress || 0} className="h-1.5" />
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedWard.zoneName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">LGA</Label>
                      <p className="font-medium">{selectedWard.lgaName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State</Label>
                      <p className="font-medium">{selectedWard.stateName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Code</Label>
                      <p className="font-medium">{selectedWard.code || `WD-${selectedWard.id.slice(0, 8)}`}</p>
                    </div>
                  </div>

                  {/* Results Breakdown */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-muted-foreground">Results Breakdown</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">{formatNumber(selectedWard.results?.total || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Verified</p>
                        <p className="text-lg font-bold text-green-600">{formatNumber(selectedWard.results?.verified || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="text-lg font-bold text-yellow-600">{formatNumber(selectedWard.results?.pending || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedWard.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedWard.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedWard) {
                    setIsViewDialogOpen(false);
                    handleViewWardDetails(selectedWard.id);
                  }
                }}
              >
                <Building2 className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}