// app/admin/zone/polling-units/page.tsx
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
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
  CheckCircle,
  Clock,
  FileText,
  MoreVertical,
  Edit,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserX,
  MapPin,
  Calendar,
  Download,
  Wifi,
  WifiOff,
  Globe,
  LayoutGrid,
  List,
  Maximize2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';
import { Progress } from '@/components/ui/progress';

// Type Definitions
interface PollingUnit {
  id: string;
  name: string;
  code: string;
  wardId?: string;
  wardName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  registeredVoters?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  agentId?: string;
  agentName?: string;
  agentStatus?: string;
  resultStatus?: string;
  hasResults?: boolean;
  createdAt?: string;
  updatedAt?: string;
  zoneId?: string;
  zoneName?: string;
}

interface PollingUnitStats {
  total: number;
  withAgents: number;
  withoutAgents: number;
  withResults: number;
  withoutResults: number;
  verifiedResults: number;
  pendingResults: number;
  rejectedResults: number;
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
  hasAgent: string;
  hasResult: string;
  zone: string;
  state: string;
  lga: string;
}

// Helper Functions
const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const getInitials = (name: string): string => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// API Base URL

export default function ZonePollingUnitsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<PollingUnit | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [zoneName, setZoneName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [unsubscribeConnection, setUnsubscribeConnection] = useState<(() => void) | null>(null);
  const [unsubscribeMessages, setUnsubscribeMessages] = useState<(() => void) | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    ward: 'all',
    hasAgent: 'all',
    hasResult: 'all',
    zone: 'all',
    state: 'all',
    lga: 'all',
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 0
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Stats State
  const [stats, setStats] = useState<PollingUnitStats>({
    total: 0,
    withAgents: 0,
    withoutAgents: 0,
    withResults: 0,
    withoutResults: 0,
    verifiedResults: 0,
    pendingResults: 0,
    rejectedResults: 0,
  });

  // ✅ Check if user is Situation Room
  const isSituationRoom = user?.role === 'Situation Room Admin' || user?.role === 'Situation Room';

  // ✅ Socket.IO setup
  const setupSocketListeners = useCallback(() => {
    if (socketInitialized) return;
    
    const socket = getSocket();
    
    const unsubConnection = onConnectionChange((connected) => {
      console.log(`🔌 ZonePollingUnits: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        if (isSituationRoom) {
          sendSocketMessage('join-situation-room', {
            userId: user.id,
            role: user.role,
            userName: user.name
          });
        } else if (user?.zoneId) {
          sendSocketMessage('join-zone', {
            zoneId: user.zoneId,
            userId: user.id,
            role: user.role,
            userName: user.name
          });
        }
        
        sendSocketMessage('request-polling-units', {
          zoneId: user?.zoneId || 'all',
          userId: user.id,
          situationRoom: isSituationRoom
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 ZonePollingUnits: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'polling-units-update':
          if (data && data.pollingUnits) {
            const uniqueUnits = deduplicateById(data.pollingUnits);
            setPollingUnits(uniqueUnits);
            if (data.stats) setStats(data.stats);
            if (data.pagination) setPagination(data.pagination);
          }
          break;
        case 'polling-unit-added':
          if (data && data.pollingUnit) {
            setPollingUnits(prev => {
              const exists = prev.some(u => u.id === data.pollingUnit.id);
              if (exists) return prev;
              return [data.pollingUnit, ...prev];
            });
            setStats(prev => ({ ...prev, total: prev.total + 1 }));
            toast({
              title: "📊 New Polling Unit",
              description: `${data.pollingUnit.name} has been added.`,
              duration: 5000,
            });
          }
          break;
        case 'polling-unit-updated':
          if (data && data.pollingUnit) {
            setPollingUnits(prev => 
              prev.map(unit => 
                unit.id === data.pollingUnit.id 
                  ? { ...unit, ...data.pollingUnit }
                  : unit
              )
            );
          }
          break;
        case 'polling-unit-removed':
          if (data && data.pollingUnitId) {
            setPollingUnits(prev => prev.filter(unit => unit.id !== data.pollingUnitId));
            setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
            toast({
              title: "🗑️ Polling Unit Removed",
              description: data.message || "A polling unit has been removed.",
              duration: 3000,
            });
          }
          break;
        case 'agent-assigned':
          if (data && data.pollingUnitId && data.agent) {
            setPollingUnits(prev => 
              prev.map(unit => 
                unit.id === data.pollingUnitId 
                  ? { 
                      ...unit, 
                      agentId: data.agent.id,
                      agentName: data.agent.name,
                      agentStatus: data.agent.status || 'Offline'
                    }
                  : unit
              )
            );
            setStats(prev => ({
              ...prev,
              withAgents: prev.withAgents + 1,
              withoutAgents: Math.max(0, prev.withoutAgents - 1)
            }));
            toast({
              title: "👤 Agent Assigned",
              description: `${data.agent.name} assigned to polling unit.`,
              duration: 4000,
            });
          }
          break;
        case 'result-submitted':
          if (data && data.pollingUnitId) {
            setPollingUnits(prev => 
              prev.map(unit => 
                unit.id === data.pollingUnitId 
                  ? { ...unit, resultStatus: 'Pending', hasResults: true }
                  : unit
              )
            );
            setStats(prev => ({
              ...prev,
              withResults: prev.withResults + 1,
              withoutResults: Math.max(0, prev.withoutResults - 1),
              pendingResults: prev.pendingResults + 1
            }));
            toast({
              title: "📄 Result Submitted",
              description: data.pollingUnitName 
                ? `${data.pollingUnitName} has submitted results.`
                : "A polling unit has submitted results.",
              duration: 5000,
            });
          }
          break;
        case 'result-approved':
          if (data && data.pollingUnitId) {
            setPollingUnits(prev => 
              prev.map(unit => 
                unit.id === data.pollingUnitId 
                  ? { ...unit, resultStatus: 'Verified' }
                  : unit
              )
            );
            setStats(prev => ({
              ...prev,
              pendingResults: Math.max(0, prev.pendingResults - 1),
              verifiedResults: prev.verifiedResults + 1
            }));
            toast({
              title: "✅ Result Approved",
              description: data.pollingUnitName 
                ? `${data.pollingUnitName} result has been approved.`
                : "A result has been approved.",
              duration: 3000,
            });
          }
          break;
        case 'result-rejected':
          if (data && data.pollingUnitId) {
            setPollingUnits(prev => 
              prev.map(unit => 
                unit.id === data.pollingUnitId 
                  ? { ...unit, resultStatus: 'Rejected' }
                  : unit
              )
            );
            setStats(prev => ({
              ...prev,
              pendingResults: Math.max(0, prev.pendingResults - 1),
              rejectedResults: prev.rejectedResults + 1
            }));
            toast({
              title: "❌ Result Rejected",
              description: data.pollingUnitName 
                ? `${data.pollingUnitName} result has been rejected.`
                : "A result has been rejected.",
              duration: 3000,
              variant: "destructive",
            });
          }
          break;
        case 'notification':
          if (data.type === 'polling-unit') {
            toast({
              title: data.title || "Notification",
              description: data.message || "",
              duration: 4000,
            });
          }
          break;
        default:
          break;
      }
    });

    setUnsubscribeConnection(() => unsubConnection);
    setUnsubscribeMessages(() => unsubMessages);
    setSocketInitialized(true);

    if (socket && socket.connected) {
      setIsConnected(true);
      if (isSituationRoom) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-polling-units', {
          zoneId: 'all',
          userId: user.id,
          situationRoom: true
        });
      } else if (user?.zoneId) {
        sendSocketMessage('join-zone', {
          zoneId: user.zoneId,
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-polling-units', {
          zoneId: user.zoneId,
          userId: user.id
        });
      }
    }

    return () => {
      if (unsubConnection) unsubConnection();
      if (unsubMessages) unsubMessages();
      setSocketInitialized(false);
    };
  }, [user, toast, isSituationRoom]);

  // ✅ Fetch polling units with pagination and filters - USING SITUATION ROOM ENDPOINT
  const fetchPollingUnits = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      let url = '';
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.hasAgent !== 'all') params.append('hasAgent', currentFilters.hasAgent);
      if (currentFilters.hasResult !== 'all') params.append('hasResult', currentFilters.hasResult);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.state !== 'all') params.append('stateId', currentFilters.state);
      if (currentFilters.lga !== 'all') params.append('lgaId', currentFilters.lga);

      setIsLoadingMore(pageNum > 1);

      // ✅ FIX: Use the situation room endpoint for Situation Room
      if (isSituationRoom) {
        url = `/situation/polling-units?${params.toString()}`;
      } else if (user?.zoneId) {
        url = `/admin/zone/${user.zoneId}/polling-units?${params.toString()}`;
      } else {
        throw new Error('No zone ID found');
      }

      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        pollingUnits: PollingUnit[];
        pagination: PaginationData;
        stats?: PollingUnitStats;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.pollingUnits) {
        const uniqueUnits = deduplicateById(response.pollingUnits);
        
        if (pageNum === 1) {
          setPollingUnits(uniqueUnits);
        } else {
          setPollingUnits(prev => {
            const merged = [...prev, ...uniqueUnits];
            return deduplicateById(merged);
          });
        }
        
        if (response.pagination) {
          setPagination(response.pagination);
        }

        // ✅ Update stats from response
        if (response.stats) {
          console.log('📊 Stats received:', response.stats);
          setStats({
            total: response.stats.total || 0,
            withAgents: response.stats.withAgents || 0,
            withoutAgents: response.stats.withoutAgents || 0,
            withResults: response.stats.withResults || 0,
            withoutResults: response.stats.withoutResults || 0,
            verifiedResults: response.stats.verifiedResults || 0,
            pendingResults: response.stats.pendingResults || 0,
            rejectedResults: response.stats.rejectedResults || 0,
          });
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching polling units:', error);
      setError('Failed to load polling units');
      toast({
        title: "Error",
        description: "Failed to load polling units",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [user?.zoneId, limit, filters, toast, isSituationRoom]);

  // Fetch all data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      if (isSituationRoom) {
        setZoneName('All Zones');
      } else if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }

      await fetchPollingUnits(1, filters, limit);
      setupSocketListeners();

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load polling units');
      toast({
        title: "Error",
        description: "Failed to load polling units",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filters, fetchPollingUnits, toast, setupSocketListeners, isSituationRoom, limit]);

  // Handle filter change
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnits(1, newFilters, limit);
  };

  // Handle search with debounce
  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnits(1, filters, newLimit);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPollingUnits(nextPage, filters, limit);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    setPollingUnits([]);
    fetchData(false);
  };

  // Clear all filters
  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      status: 'all',
      ward: 'all',
      hasAgent: 'all',
      hasResult: 'all',
      zone: 'all',
      state: 'all',
      lga: 'all',
    };
    setFilters(resetFilters);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnits(1, resetFilters, limit);
  };

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchData(true);
    }

    return () => {
      if (unsubscribeConnection) {
        unsubscribeConnection();
      }
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [user?.id]);

  // Get unique values for filters
  const uniqueWards = useMemo(() => {
    return Array.from(new Set(pollingUnits.map(u => u.wardName))).filter(Boolean);
  }, [pollingUnits]);

  const uniqueZones = useMemo(() => {
    return Array.from(new Set(pollingUnits.map(u => u.zoneName))).filter(Boolean);
  }, [pollingUnits]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(pollingUnits.map(u => u.stateName))).filter(Boolean);
  }, [pollingUnits]);

  // Filter polling units client-side
  const filteredUnits = useMemo(() => {
    let units = pollingUnits;

    if (filters.status === 'online') {
      units = units.filter(u => u.agentStatus === 'Online');
    } else if (filters.status === 'offline') {
      units = units.filter(u => u.agentStatus === 'Offline');
    } else if (filters.status === 'unassigned') {
      units = units.filter(u => !u.agentId);
    }

    return units;
  }, [pollingUnits, filters.status]);

  // Get status badge
  const getAgentStatusBadge = (status: string) => {
    if (status === 'Online') return <Badge className="bg-green-500 text-white">Online</Badge>;
    else if (status === 'Offline') return <Badge variant="secondary">Offline</Badge>;
    else return <Badge variant="outline">Unassigned</Badge>;
  };

  // Get status dot
  const getStatusDot = (status: string) => {
    if (status === 'Online') {
      return <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-1.5" />;
    } else if (status === 'Offline') {
      return <span className="h-2 w-2 rounded-full bg-gray-400 inline-block mr-1.5" />;
    }
    return <span className="h-2 w-2 rounded-full bg-gray-300 inline-block mr-1.5" />;
  };

  // Get result status badge
  const getResultStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified': return <Badge className="bg-green-500 text-white">Verified</Badge>;
      case 'Pending': return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'Rejected': return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default: return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  // Check if any filters are active
  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.ward !== 'all' || 
    filters.hasAgent !== 'all' || 
    filters.hasResult !== 'all' ||
    filters.zone !== 'all' ||
    filters.state !== 'all' ||
    filters.lga !== 'all';

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title={isSituationRoom ? "Situation Room - Polling Units" : "Zone Polling Units"}
          subtitle={isSituationRoom ? "Viewing polling units across all zones" : "Manage polling units across all wards in your zone"}
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

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title={isSituationRoom ? "📊 Situation Room - Polling Units" : "Zone Polling Units"}
        subtitle={
          isSituationRoom 
            ? `Viewing all polling units across all zones ${!isConnected ? '🔴 Offline' : '🟢 Live'}`
            : `Manage polling units across all wards in ${zoneName || 'your zone'} ${!isConnected ? '🔴 Offline' : '🟢 Live'}`
        }
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
            {isSituationRoom && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Globe className="h-3 w-3 mr-1" />
                Global View
              </Badge>
            )}
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

        {/* Connection Status Banner */}
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

        {/* ✅ Stats Cards - Now showing real stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Units</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
              </div>
              {pagination.total > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Showing {pollingUnits.length} of {pagination.total}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">With Agents</p>
                  <p className="text-2xl font-bold text-green-900">{stats.withAgents || 0}</p>
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
                  <p className="text-2xl font-bold text-yellow-900">{stats.withResults || 0}</p>
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

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Verified</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.verifiedResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-purple-700" />
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {stats.withResults > 0 ? Math.round((stats.verifiedResults / stats.withResults) * 100) : 0}% verified
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-red-900">{stats.pendingResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-red-700" />
                </div>
              </div>
              <p className="text-xs text-red-600 mt-1">
                {stats.withResults > 0 ? Math.round((stats.pendingResults / stats.withResults) * 100) : 0}% pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Overall Progress</p>
                <p className="text-xs text-gray-500">
                  {stats.withResults} of {stats.total} polling units have submitted results
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 sm:w-48">
                  <Progress 
                    value={stats.total > 0 ? (stats.withResults / stats.total) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.withResults / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isSituationRoom ? "Search polling units across all zones..." : "Search by name, code, ward, or agent..."}
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

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

          {/* Enhanced Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Agent Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unassigned">Unassigned</option>
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
              {isSituationRoom && (
                <>
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
                </>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Agent Assignment</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.hasAgent}
                  onChange={(e) => handleFilterChange('hasAgent', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="true">Has Agent</option>
                  <option value="false">No Agent</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Result Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.hasResult}
                  onChange={(e) => handleFilterChange('hasResult', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="true">Has Result</option>
                  <option value="false">No Result</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Polling Units Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Polling Units
              </CardTitle>
              <CardDescription>
                {pollingUnits.length === 0 ? 'No polling units found' :
                  `Showing ${filteredUnits.length} of ${pagination.total || pollingUnits.length} units`}
                {pagination.totalPages > 1 && (
                  <span className="ml-2 text-xs">
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
                {hasActiveFilters && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    • Filters active
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
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>
              <Badge variant="outline" className="text-xs">
                Total: {pagination.total || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pollingUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No polling units found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all units
                  </Button>
                )}
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No polling units match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name / Code</TableHead>
                        <TableHead>Zone / Ward</TableHead>
                        {isSituationRoom && <TableHead>State / LGA</TableHead>}
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Voters</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{unit.name}</p>
                              <p className="text-sm text-muted-foreground">{unit.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{unit.zoneName || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{unit.wardName || 'Unknown'}</p>
                            </div>
                          </TableCell>
                          {isSituationRoom && (
                            <TableCell>
                              <div>
                                <p className="text-sm">{unit.stateName || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{unit.lgaName || 'N/A'}</p>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            {unit.agentName ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Users className="h-3 w-3" />
                                {unit.agentName}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getStatusDot(unit.agentStatus)}
                              {getAgentStatusBadge(unit.agentStatus)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {unit.registeredVoters || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getResultStatusBadge(unit.resultStatus)}
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUnit(unit);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(`/admin/polling-units/${unit.id}/edit`);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Unit
                                </DropdownMenuItem>
                                {!unit.agentId && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      router.push(`/admin/polling-units/${unit.id}/assign-agent`);
                                    }}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Assign Agent
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredUnits.length} of {pagination.total} units
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
                          setPollingUnits([]);
                          fetchPollingUnits(prevPage, filters, limit);
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

        {/* View Polling Unit Dialog */}
        <Dialog open={isViewDialogOpen && selectedUnit !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Polling Unit Details
              </DialogTitle>
              <DialogDescription>
                {selectedUnit?.name} - {selectedUnit?.code}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedUnit && (
                <div className="space-y-4 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedUnit.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Code</Label>
                      <p className="font-medium">{selectedUnit.code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedUnit.wardName || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedUnit.zoneName || 'Unknown'}</p>
                    </div>
                  </div>

                  {isSituationRoom && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">State</Label>
                        <p className="font-medium">{selectedUnit.stateName || 'Unknown'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">LGA</Label>
                        <p className="font-medium">{selectedUnit.lgaName || 'Unknown'}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Registered Voters</Label>
                      <p className="font-medium">{selectedUnit.registeredVoters || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{selectedUnit.address || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Agent Info */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-muted-foreground">Assigned Agent</Label>
                    {selectedUnit.agentName ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-medium">{selectedUnit.agentName}</p>
                        <div className="flex items-center gap-2">
                          {getStatusDot(selectedUnit.agentStatus)}
                          {getAgentStatusBadge(selectedUnit.agentStatus)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No agent assigned</p>
                    )}
                  </div>

                  {/* Result Status */}
                  <div>
                    <Label className="text-muted-foreground">Result Status</Label>
                    <div className="mt-1">
                      {getResultStatusBadge(selectedUnit.resultStatus || 'Not Submitted')}
                    </div>
                  </div>

                  {/* Location */}
                  {(selectedUnit.latitude || selectedUnit.longitude) && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        {selectedUnit.latitude && (
                          <p className="text-sm">Latitude: {selectedUnit.latitude}</p>
                        )}
                        {selectedUnit.longitude && (
                          <p className="text-sm">Longitude: {selectedUnit.longitude}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUnit.createdAt ? new Date(selectedUnit.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUnit.updatedAt ? new Date(selectedUnit.updatedAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedUnit && !selectedUnit.agentId && (
                <Button
                  variant="default"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    router.push(`/admin/polling-units/${selectedUnit.id}/assign-agent`);
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Agent
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedUnit) {
                    router.push(`/admin/polling-units/${selectedUnit.id}/edit`);
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