"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Users,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  Wifi,
  WifiOff,
  Globe,
  UserCheck,
  UserX,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';

// ============================================
// TYPES
// ============================================

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'Online' | 'Offline' | 'Unassigned';
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  pollingUnitId?: string;
  pollingUnitName?: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
  incidentsReported?: number;
  resultsSubmitted?: number;
  assignments?: number;
  profileImage?: string;
}

interface AgentStats {
  total: number;
  online: number;
  offline: number;
  unassigned: number;
  activeToday: number;
  withIncidents: number;
  withResults: number;
  topPerformers: Agent[];
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  status: string;
  ward: string;
  zone: string;
  state: string;
  lga: string;
  hasIncidents: string;
  hasResults: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getInitials = (name: string): string => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Online': return 'bg-green-500';
    case 'Offline': return 'bg-gray-400';
    case 'Unassigned': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Online':
      return <Badge className="bg-green-500 text-white">Online</Badge>;
    case 'Offline':
      return <Badge variant="secondary">Offline</Badge>;
    case 'Unassigned':
      return <Badge className="bg-yellow-500 text-white">Unassigned</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusDot = (status: string) => {
  const color = getStatusColor(status);
  return <span className={`h-2.5 w-2.5 rounded-full ${color} inline-block mr-2 animate-pulse`} />;
};

const formatTimeAgo = (date: string) => {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SituationRoomAgentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [stats, setStats] = useState<AgentStats>({
    total: 0,
    online: 0,
    offline: 0,
    unassigned: 0,
    activeToday: 0,
    withIncidents: 0,
    withResults: 0,
    topPerformers: [],
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    ward: 'all',
    zone: 'all',
    state: 'all',
    lga: 'all',
    hasIncidents: 'all',
    hasResults: 'all',
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

  // View Mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // ============================================
  // SOCKET SETUP
  // ============================================

  const setupSocketListeners = useCallback(() => {
    if (socketInitialized) return;
    
    const socket = getSocket();
    
    const unsubConnection = onConnectionChange((connected) => {
      console.log(`🔌 Agents: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-agents', {
          userId: user.id,
          situationRoom: true
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 Agents: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'agents-update':
          if (data && data.agents) {
            const uniqueAgents = deduplicateById(data.agents);
            setAgents(uniqueAgents);
            if (data.stats) setStats(data.stats);
            if (data.pagination) setPagination(data.pagination);
          }
          break;
        case 'agent-status-change':
          if (data && data.agentId) {
            setAgents(prev => 
              prev.map(agent => 
                agent.id === data.agentId 
                  ? { ...agent, status: data.status, lastActive: data.timestamp }
                  : agent
              )
            );
            // Update stats
            setStats(prev => {
              const newStats = { ...prev };
              if (data.status === 'Online') {
                newStats.online = (newStats.online || 0) + 1;
                newStats.offline = Math.max(0, (newStats.offline || 0) - 1);
              } else if (data.status === 'Offline') {
                newStats.offline = (newStats.offline || 0) + 1;
                newStats.online = Math.max(0, (newStats.online || 0) - 1);
              }
              return newStats;
            });
            toast({
              title: "👤 Agent Status Update",
              description: `${data.agentName} is now ${data.status}`,
              duration: 3000,
            });
          }
          break;
        case 'agent-assigned':
          if (data && data.agent) {
            setAgents(prev => 
              prev.map(agent => 
                agent.id === data.agent.id 
                  ? { ...agent, ...data.agent, status: 'Online' }
                  : agent
              )
            );
            setStats(prev => ({
              ...prev,
              total: prev.total + 1,
              unassigned: Math.max(0, (prev.unassigned || 0) - 1),
              online: (prev.online || 0) + 1
            }));
            toast({
              title: "✅ Agent Assigned",
              description: `${data.agent.name} has been assigned to a polling unit.`,
              duration: 4000,
            });
          }
          break;
        case 'incident-reported':
          if (data && data.agentId) {
            setAgents(prev => 
              prev.map(agent => 
                agent.id === data.agentId 
                  ? { ...agent, incidentsReported: (agent.incidentsReported || 0) + 1 }
                  : agent
              )
            );
            setStats(prev => ({
              ...prev,
              withIncidents: (prev.withIncidents || 0) + 1
            }));
          }
          break;
        case 'result-submitted':
          if (data && data.agentId) {
            setAgents(prev => 
              prev.map(agent => 
                agent.id === data.agentId 
                  ? { ...agent, resultsSubmitted: (agent.resultsSubmitted || 0) + 1 }
                  : agent
              )
            );
            setStats(prev => ({
              ...prev,
              withResults: (prev.withResults || 0) + 1
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
      sendSocketMessage('request-agents', {
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

  const fetchAgents = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.state !== 'all') params.append('stateId', currentFilters.state);
      if (currentFilters.lga !== 'all') params.append('lgaId', currentFilters.lga);
      if (currentFilters.hasIncidents !== 'all') params.append('hasIncidents', currentFilters.hasIncidents);
      if (currentFilters.hasResults !== 'all') params.append('hasResults', currentFilters.hasResults);

      setIsLoadingMore(pageNum > 1);

      const url = `/situation/agents?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        agents: Agent[];
        pagination: PaginationData;
        stats: AgentStats;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.agents) {
        const uniqueAgents = deduplicateById(response.agents);
        
        if (pageNum === 1) {
          setAgents(uniqueAgents);
        } else {
          setAgents(prev => {
            const merged = [...prev, ...uniqueAgents];
            return deduplicateById(merged);
          });
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
      console.error('Error fetching agents:', error);
      setError('Failed to load agents');
      toast({
        title: "Error",
        description: "Failed to load agents",
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
      await fetchAgents(1, filters, limit);
      setupSocketListeners();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load agents');
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchAgents, toast, setupSocketListeners, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setAgents([]);
    fetchAgents(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setAgents([]);
    fetchAgents(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAgents(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setAgents([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      status: 'all',
      ward: 'all',
      zone: 'all',
      state: 'all',
      lga: 'all',
      hasIncidents: 'all',
      hasResults: 'all',
    };
    setFilters(resetFilters);
    setPage(1);
    setAgents([]);
    fetchAgents(1, resetFilters, limit);
  };

  const handleViewAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsViewDialogOpen(true);
  };

  const handleAssignAgent = (agentId: string) => {
    router.push(`/admin/agents/${agentId}/assign`);
  };

  const handleEditAgent = (agentId: string) => {
    router.push(`/admin/agents/${agentId}/edit`);
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

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(agents.map(a => a.wardName))).filter(Boolean);
  }, [agents]);

  const uniqueZones = useMemo(() => {
    return Array.from(new Set(agents.map(a => a.zoneName))).filter(Boolean);
  }, [agents]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(agents.map(a => a.stateName))).filter(Boolean);
  }, [agents]);

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.ward !== 'all' || 
    filters.zone !== 'all' ||
    filters.state !== 'all' ||
    filters.lga !== 'all' ||
    filters.hasIncidents !== 'all' ||
    filters.hasResults !== 'all';

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="👥 Situation Room - Agents"
          subtitle="Viewing all polling agents across all zones"
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
        title="👥 Situation Room - Agents"
        subtitle={`Viewing all polling agents ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
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
                  <p className="text-sm text-blue-700 font-medium">Total Agents</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Online</p>
                  <p className="text-2xl font-bold text-green-900">{stats.online || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}% active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Offline</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.offline || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">With Incidents</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.withIncidents || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">With Results</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.withResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        {stats.topPerformers && stats.topPerformers.length > 0 && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">Top Performers</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {stats.topPerformers.slice(0, 5).map((agent, index) => (
                  <div key={agent.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border">
                    <span className="text-xs font-bold text-amber-600">#{index + 1}</span>
                    <span className="text-sm font-medium">{agent.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {agent.incidentsReported || 0} incidents
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {agent.resultsSubmitted || 0} results
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents by name, email, ward, or zone..."
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
                    {Object.values(filters).filter(v => v !== 'all' && v !== '').length}
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
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
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
                <Label className="text-xs text-muted-foreground">Ward</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.ward}
                  onChange={(e) => handleFilterChange('ward', e.target.value)}
                >
                  <option value="all">All Wards</option>
                  {uniqueWards.map((ward) => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Has Incidents</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.hasIncidents}
                  onChange={(e) => handleFilterChange('hasIncidents', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="true">Has Incidents</option>
                  <option value="false">No Incidents</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agents
              </CardTitle>
              <CardDescription>
                {agents.length === 0 ? 'No agents found' :
                  `Showing ${agents.length} of ${pagination.total || agents.length} agents`}
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
                  <option value={200}>200</option>
                </select>
              </div>
              <Badge variant="outline" className="text-xs">
                Total: {pagination.total || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No agents found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all agents
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                {getInitials(agent.name)}
                              </div>
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-xs text-muted-foreground">{agent.role || 'Agent'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">{agent.email}</span>
                              </div>
                              {agent.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{agent.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm">{agent.zoneName || 'Unknown Zone'}</p>
                              <p className="text-xs text-muted-foreground">{agent.wardName || 'Unassigned'}</p>
                              {agent.pollingUnitName && (
                                <p className="text-xs text-blue-600">{agent.pollingUnitName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getStatusDot(agent.status)}
                              {getStatusBadge(agent.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 text-xs">
                                <span>🕐 {formatTimeAgo(agent.lastActive)}</span>
                              </div>
                              <div className="flex gap-2 text-xs">
                                {agent.incidentsReported > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    🚨 {agent.incidentsReported}
                                  </Badge>
                                )}
                                {agent.resultsSubmitted > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    📄 {agent.resultsSubmitted}
                                  </Badge>
                                )}
                              </div>
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
                                <DropdownMenuItem onClick={() => handleViewAgent(agent)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAgent(agent.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Agent
                                </DropdownMenuItem>
                                {agent.status === 'Unassigned' && (
                                  <DropdownMenuItem onClick={() => handleAssignAgent(agent.id)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign to Polling Unit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Deactivate
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
                      Showing {agents.length} of {pagination.total} agents
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
                          setAgents([]);
                          fetchAgents(prevPage, filters, limit);
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

        {/* View Agent Dialog */}
        <Dialog open={isViewDialogOpen && selectedAgent !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Details
              </DialogTitle>
              <DialogDescription>
                {selectedAgent?.name} - {selectedAgent?.email}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedAgent && (
                <div className="space-y-4 py-4">
                  {/* Profile */}
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xl">
                      {getInitials(selectedAgent.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedAgent.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedAgent.role || 'Polling Agent'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusDot(selectedAgent.status)}
                        {getStatusBadge(selectedAgent.status)}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedAgent.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedAgent.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedAgent.zoneName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedAgent.wardName || 'Unassigned'}</p>
                    </div>
                  </div>

                  {selectedAgent.pollingUnitName && (
                    <div>
                      <Label className="text-muted-foreground">Assigned Polling Unit</Label>
                      <p className="font-medium">{selectedAgent.pollingUnitName}</p>
                    </div>
                  )}

                  {/* Activity Stats */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Incidents Reported</Label>
                      <p className="text-2xl font-bold text-blue-600">{selectedAgent.incidentsReported || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Results Submitted</Label>
                      <p className="text-2xl font-bold text-green-600">{selectedAgent.resultsSubmitted || 0}</p>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Last Active</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.lastActive ? formatTimeAgo(selectedAgent.lastActive) : 'Never'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Joined</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.createdAt ? new Date(selectedAgent.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedAgent?.status === 'Unassigned' && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    if (selectedAgent) handleAssignAgent(selectedAgent.id);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Polling Unit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedAgent) {
                    setIsViewDialogOpen(false);
                    handleEditAgent(selectedAgent.id);
                  }
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
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