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
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Globe,
  Award,
  Building2,
  Maximize2,
  Image as ImageIcon,
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Info,
  Check,
  XCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

interface Incident {
  id: string;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  pollingUnitId: string;
  pollingUnitName: string;
  wardId?: string;
  wardName: string;
  zoneId?: string;
  zoneName: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  reportedBy: string;
  reporterName: string;
  reporterEmail?: string;
  latitude?: number;
  longitude?: number;
  mediaUrl?: string[];
  reviewComment?: string;
  reviewedBy?: string;
  reviewerName?: string;
  createdAt: string;
  updatedAt: string;
  timeAgo?: string;
}

interface IncidentStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  pending: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  byZone: {
    zoneId: string;
    zoneName: string;
    total: number;
    critical: number;
    high: number;
  }[];
  byType: {
    type: string;
    count: number;
  }[];
  recentIncidents: Incident[];
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  severity: string;
  status: string;
  zone: string;
  ward: string;
  state: string;
  lga: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

// ============================================
// HELPERS
// ============================================

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <Badge className="bg-red-600 text-white animate-pulse">Critical</Badge>;
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

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-600';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'low': return <Info className="h-4 w-4 text-blue-500" />;
    default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    case 'investigating':
      return <Badge className="bg-purple-500 text-white animate-pulse">Investigating</Badge>;
    case 'resolved':
      return <Badge className="bg-green-500 text-white">Resolved</Badge>;
    case 'dismissed':
      return <Badge variant="secondary">Dismissed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'investigating': return <Activity className="h-4 w-4 text-purple-500 animate-pulse" />;
    case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'dismissed': return <XCircle className="h-4 w-4 text-gray-400" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};

const formatTimeAgo = (date: string) => {
  if (!date) return 'Unknown';
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0';
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

export default function SituationRoomIncidentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>('investigating');
  const [reviewComment, setReviewComment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stats, setStats] = useState<IncidentStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    dismissed: 0,
    byZone: [],
    byType: [],
    recentIncidents: [],
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    severity: 'all',
    status: 'all',
    zone: 'all',
    ward: 'all',
    state: 'all',
    lga: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: '',
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
      console.log(`🔌 Incidents: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-incidents', {
          userId: user.id,
          situationRoom: true
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 Incidents: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'incidents-update':
          if (data && data.incidents) {
            const uniqueIncidents = deduplicateById(data.incidents);
            setIncidents(uniqueIncidents);
            if (data.stats) setStats(data.stats);
            if (data.pagination) setPagination(data.pagination);
          }
          break;
        case 'incident-reported':
          if (data && data.incident) {
            setIncidents(prev => [data.incident, ...prev]);
            setStats(prev => ({
              ...prev,
              total: prev.total + 1,
              pending: prev.pending + 1,
            }));
            toast({
              title: "🚨 New Incident Reported",
              description: `${data.incident.type} at ${data.incident.pollingUnitName}`,
              duration: 5000,
            });
          }
          break;
        case 'incident-updated':
          if (data && data.incident) {
            setIncidents(prev => 
              prev.map(i => 
                i.id === data.incident.id 
                  ? { ...i, ...data.incident }
                  : i
              )
            );
            // Update stats
            setStats(prev => {
              const newStats = { ...prev };
              // Find old status
              const oldIncident = incidents.find(i => i.id === data.incident.id);
              if (oldIncident) {
                // Decrement old status count
                if (oldIncident.status === 'pending') newStats.pending--;
                else if (oldIncident.status === 'investigating') newStats.investigating--;
                else if (oldIncident.status === 'resolved') newStats.resolved--;
                else if (oldIncident.status === 'dismissed') newStats.dismissed--;
                
                // Increment new status count
                if (data.incident.status === 'pending') newStats.pending++;
                else if (data.incident.status === 'investigating') newStats.investigating++;
                else if (data.incident.status === 'resolved') newStats.resolved++;
                else if (data.incident.status === 'dismissed') newStats.dismissed++;
              }
              return newStats;
            });
            toast({
              title: "📋 Incident Updated",
              description: `Incident status changed to ${data.incident.status}`,
              duration: 3000,
            });
          }
          break;
        case 'notification':
          if (data.type === 'incident') {
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

    setSocketInitialized(true);

    if (socket && socket.connected) {
      setIsConnected(true);
      sendSocketMessage('join-situation-room', {
        userId: user.id,
        role: user.role,
        userName: user.name
      });
      sendSocketMessage('request-incidents', {
        userId: user.id,
        situationRoom: true
      });
    }

    return () => {
      if (unsubConnection) unsubConnection();
      if (unsubMessages) unsubMessages();
      setSocketInitialized(false);
    };
  }, [user, toast, incidents]);

  // ============================================
  // API FUNCTIONS
  // ============================================

  const fetchIncidents = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.severity !== 'all') params.append('severity', currentFilters.severity);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.state !== 'all') params.append('stateId', currentFilters.state);
      if (currentFilters.lga !== 'all') params.append('lgaId', currentFilters.lga);
      if (currentFilters.type !== 'all') params.append('type', currentFilters.type);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);

      setIsLoadingMore(pageNum > 1);

      const url = `/situation/incidents?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        incidents: Incident[];
        pagination: PaginationData;
        stats: IncidentStats;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.incidents) {
        const uniqueIncidents = deduplicateById(response.incidents);
        
        if (pageNum === 1) {
          setIncidents(uniqueIncidents);
        } else {
          setIncidents(prev => {
            const merged = [...prev, ...uniqueIncidents];
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
      console.error('Error fetching incidents:', error);
      setError('Failed to load incidents');
      toast({
        title: "Error",
        description: "Failed to load incidents",
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
      await fetchIncidents(1, filters, limit);
      setupSocketListeners();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load incidents');
      toast({
        title: "Error",
        description: "Failed to load incidents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchIncidents, toast, setupSocketListeners, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setIncidents([]);
    fetchIncidents(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setIncidents([]);
    fetchIncidents(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchIncidents(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setIncidents([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      severity: 'all',
      status: 'all',
      zone: 'all',
      ward: 'all',
      state: 'all',
      lga: 'all',
      type: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(resetFilters);
    setPage(1);
    setIncidents([]);
    fetchIncidents(1, resetFilters, limit);
  };

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleReviewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setReviewStatus(incident.status || 'investigating');
    setReviewComment(incident.reviewComment || '');
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedIncident) return;

    try {
      await apiClient.patch(`/situation/incidents/${selectedIncident.id}/review`, {
        status: reviewStatus,
        reviewComment: reviewComment
      });

      toast({
        title: "✅ Incident Reviewed",
        description: `Incident status updated to ${reviewStatus}`,
      });

      setIsReviewDialogOpen(false);
      setReviewComment('');
      fetchData(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to review incident",
        variant: "destructive",
      });
    }
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
    return Array.from(new Set(incidents.map(i => i.zoneName))).filter(Boolean);
  }, [incidents]);

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(incidents.map(i => i.wardName))).filter(Boolean);
  }, [incidents]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(incidents.map(i => i.type))).filter(Boolean);
  }, [incidents]);

  const hasActiveFilters = filters.search || 
    filters.severity !== 'all' || 
    filters.status !== 'all' || 
    filters.zone !== 'all' || 
    filters.ward !== 'all' ||
    filters.state !== 'all' ||
    filters.lga !== 'all' ||
    filters.type !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="🚨 Situation Room - Incidents"
          subtitle="Viewing all incidents across all zones"
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
        title="🚨 Situation Room - Incidents"
        subtitle={`Viewing all incidents ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Critical</p>
                  <p className="text-2xl font-bold text-red-900">{formatNumber(stats.critical)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">High</p>
                  <p className="text-2xl font-bold text-orange-900">{formatNumber(stats.high)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Medium</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatNumber(stats.medium)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Low</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.low)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Info className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Investigating</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.investigating)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center animate-pulse">
                  <Activity className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Resolved</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.resolved)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incident Types Summary */}
        {stats.byType && stats.byType.length > 0 && (
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-slate-600" />
                <p className="text-sm font-medium text-slate-800">Incident Types</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.byType.map((type) => (
                  <Badge key={type.type} variant="outline" className="px-3 py-1 text-sm">
                    {type.type}: {type.count}
                  </Badge>
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
                placeholder="Search incidents by polling unit, ward, or description..."
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
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
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
                <Label className="text-xs text-muted-foreground">Type</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date From</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Incidents Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Incidents
              </CardTitle>
              <CardDescription>
                {incidents.length === 0 ? 'No incidents found' :
                  `Showing ${incidents.length} of ${pagination.total || incidents.length} incidents`}
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
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No incidents found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all incidents
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Image</TableHead>
                        <TableHead>Type / Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reported</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          {/* Image Column */}
                          <TableCell>
                            {incident.mediaUrl && incident.mediaUrl.length > 0 ? (
                              <div 
                                className="relative group cursor-pointer"
                                onClick={() => setImagePreview(incident.mediaUrl![0])}
                              >
                                <img 
                                  src={incident.mediaUrl[0]} 
                                  alt={incident.type}
                                  className="h-12 w-12 object-cover rounded-md"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder-incident.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>

                          {/* Type / Description */}
                          <TableCell>
                            <div>
                              <p className="font-medium">{incident.type}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {incident.description}
                              </p>
                            </div>
                          </TableCell>

                          {/* Location */}
                          <TableCell>
                            <div>
                              <p className="text-sm">{incident.zoneName}</p>
                              <p className="text-xs text-muted-foreground">{incident.wardName}</p>
                              <p className="text-xs text-muted-foreground">{incident.pollingUnitName}</p>
                            </div>
                          </TableCell>

                          {/* Severity */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getSeverityIcon(incident.severity)}
                              {getSeverityBadge(incident.severity)}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(incident.status)}
                              {getStatusBadge(incident.status)}
                            </div>
                          </TableCell>

                          {/* Reported */}
                          <TableCell>
                            <div className="text-sm">
                              {formatTimeAgo(incident.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {incident.reporterName}
                            </div>
                          </TableCell>

                          {/* Actions */}
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
                                <DropdownMenuItem onClick={() => handleViewIncident(incident)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReviewIncident(incident)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Review & Update
                                </DropdownMenuItem>
                                {incident.mediaUrl && incident.mediaUrl.length > 0 && (
                                  <DropdownMenuItem onClick={() => setImagePreview(incident.mediaUrl![0])}>
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    View Image
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {incident.status === 'pending' && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedIncident(incident);
                                      setReviewStatus('investigating');
                                      setIsReviewDialogOpen(true);
                                    }}
                                    className="text-purple-600"
                                  >
                                    <Activity className="h-4 w-4 mr-2" />
                                    Start Investigation
                                  </DropdownMenuItem>
                                )}
                                {incident.status === 'investigating' && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedIncident(incident);
                                      setReviewStatus('resolved');
                                      setIsReviewDialogOpen(true);
                                    }}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Resolved
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

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {incidents.length} of {pagination.total} incidents
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
                          setIncidents([]);
                          fetchIncidents(prevPage, filters, limit);
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

        {/* View Incident Dialog */}
        <Dialog open={isViewDialogOpen && selectedIncident !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Incident Details
              </DialogTitle>
              <DialogDescription>
                {selectedIncident?.type} - {selectedIncident?.pollingUnitName}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedIncident && (
                <div className="space-y-4 py-4">
                  {/* Status & Severity */}
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(selectedIncident.status)}
                      {getStatusBadge(selectedIncident.status)}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {getSeverityIcon(selectedIncident.severity)}
                      {getSeverityBadge(selectedIncident.severity)}
                    </div>
                    {selectedIncident.reviewerName && (
                      <span className="text-sm text-muted-foreground ml-2">
                        Reviewed by {selectedIncident.reviewerName}
                      </span>
                    )}
                  </div>

                  {/* Incident Images */}
                  {selectedIncident.mediaUrl && selectedIncident.mediaUrl.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <Label className="text-muted-foreground">Incident Images</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {selectedIncident.mediaUrl.map((url, index) => (
                          <div key={index} className="relative group cursor-pointer">
                            <img 
                              src={url}
                              alt={`Incident image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                              onClick={() => setImagePreview(url)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="p-3 bg-muted rounded-lg mt-1">{selectedIncident.description}</p>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedIncident.zoneName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedIncident.wardName}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Polling Unit</Label>
                      <p className="font-medium">{selectedIncident.pollingUnitName}</p>
                    </div>
                  </div>

                  {/* Coordinates */}
                  {(selectedIncident.latitude || selectedIncident.longitude) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Latitude</Label>
                        <p className="font-medium">{selectedIncident.latitude || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Longitude</Label>
                        <p className="font-medium">{selectedIncident.longitude || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {/* Reporter Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Reported By</Label>
                      <p className="font-medium">{selectedIncident.reporterName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reported At</Label>
                      <p className="font-medium">{formatDate(selectedIncident.createdAt)}</p>
                    </div>
                  </div>

                  {/* Review Comment */}
                  {selectedIncident.reviewComment && (
                    <div>
                      <Label className="text-muted-foreground">Review Comment</Label>
                      <p className="p-2 bg-muted rounded-lg text-sm">{selectedIncident.reviewComment}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground">Timeline</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Reported: {formatDate(selectedIncident.createdAt)}</span>
                      </div>
                      {selectedIncident.updatedAt && selectedIncident.updatedAt !== selectedIncident.createdAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Last Updated: {formatDate(selectedIncident.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedIncident?.status === 'pending' && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    if (selectedIncident) handleReviewIncident(selectedIncident);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Start Investigation
                </Button>
              )}
              {selectedIncident?.status === 'investigating' && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    if (selectedIncident) handleReviewIncident(selectedIncident);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Incident Dialog */}
        <Dialog open={isReviewDialogOpen && selectedIncident !== null} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Review Incident
              </DialogTitle>
              <DialogDescription>
                Update status and add review comments for this incident
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Incident</Label>
                <p className="font-medium">{selectedIncident?.type}</p>
                <p className="text-sm text-muted-foreground">{selectedIncident?.pollingUnitName}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div>
                <Label className="text-muted-foreground">Review Comment</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Add your review comments here..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReview}>
                Submit Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
            <div className="relative">
              <img 
                src={imagePreview || ''} 
                alt="Incident preview"
                className="w-full max-h-[80vh] object-contain rounded-lg bg-black/90"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={() => setImagePreview(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => {
                  if (imagePreview) window.open(imagePreview, '_blank');
                }}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Open Full Size
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}