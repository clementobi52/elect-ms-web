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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

interface Party {
  id: string;
  name: string;
  logoUrl?: string;
  votes: number;
  percentage: number;
}

interface Result {
  id: string;
  pollingUnitId: string;
  pollingUnitName: string;
  pollingUnitCode?: string;
  wardId?: string;
  wardName: string;
  zoneId?: string;
  zoneName: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  uploadedBy: string;
  uploaderName: string;
  totalVotes: number;
  registeredVoters: number;
  turnout: number;
  parties: Party[];
  resultFileUrl?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
}

interface ResultStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  totalVotes: number;
  partySummary: {
    partyId: string;
    partyName: string;
    logoUrl?: string;
    totalVotes: number;
    percentage: number;
  }[];
  zoneBreakdown: {
    zoneId: string;
    zoneName: string;
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  }[];
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
  zone: string;
  ward: string;
  state: string;
  lga: string;
  dateFrom: string;
  dateTo: string;
}

// ============================================
// HELPERS
// ============================================

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Verified':
      return <Badge className="bg-green-500 text-white">Verified</Badge>;
    case 'Pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    case 'Rejected':
      return <Badge className="bg-red-500 text-white">Rejected</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Verified':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'Rejected':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
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

export default function SituationRoomResultsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stats, setStats] = useState<ResultStats>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalVotes: 0,
    partySummary: [],
    zoneBreakdown: [],
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    zone: 'all',
    ward: 'all',
    state: 'all',
    lga: 'all',
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
      console.log(`🔌 Results: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
        sendSocketMessage('request-results', {
          userId: user.id,
          situationRoom: true
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 Results: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'results-update':
          if (data && data.results) {
            const uniqueResults = deduplicateById(data.results);
            setResults(uniqueResults);
            if (data.stats) setStats(data.stats);
            if (data.pagination) setPagination(data.pagination);
          }
          break;
        case 'result-submitted':
          if (data && data.result) {
            setResults(prev => [data.result, ...prev]);
            setStats(prev => ({
              ...prev,
              total: prev.total + 1,
              pending: prev.pending + 1,
            }));
            toast({
              title: "📄 New Result Submitted",
              description: `${data.result.pollingUnitName} has submitted results.`,
              duration: 5000,
            });
          }
          break;
        case 'result-verified':
          if (data && data.resultId) {
            setResults(prev => 
              prev.map(r => 
                r.id === data.resultId 
                  ? { ...r, status: 'Verified', reviewedBy: data.reviewedBy, reviewerName: data.reviewerName }
                  : r
              )
            );
            setStats(prev => ({
              ...prev,
              pending: Math.max(0, prev.pending - 1),
              verified: prev.verified + 1,
            }));
            toast({
              title: "✅ Result Verified",
              description: `Result for ${data.pollingUnitName} has been verified.`,
              duration: 3000,
            });
          }
          break;
        case 'result-rejected':
          if (data && data.resultId) {
            setResults(prev => 
              prev.map(r => 
                r.id === data.resultId 
                  ? { ...r, status: 'Rejected', reviewComment: data.reviewComment }
                  : r
              )
            );
            setStats(prev => ({
              ...prev,
              pending: Math.max(0, prev.pending - 1),
              rejected: prev.rejected + 1,
            }));
            toast({
              title: "❌ Result Rejected",
              description: `Result for ${data.pollingUnitName} was rejected: ${data.reviewComment}`,
              duration: 5000,
              variant: "destructive",
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
      sendSocketMessage('request-results', {
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

  const fetchResults = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.state !== 'all') params.append('stateId', currentFilters.state);
      if (currentFilters.lga !== 'all') params.append('lgaId', currentFilters.lga);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);

      setIsLoadingMore(pageNum > 1);

      const url = `/situation/results?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        results: Result[];
        pagination: PaginationData;
        stats: ResultStats;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.results) {
        const uniqueResults = deduplicateById(response.results);
        
        if (pageNum === 1) {
          setResults(uniqueResults);
        } else {
          setResults(prev => {
            const merged = [...prev, ...uniqueResults];
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
      console.error('Error fetching results:', error);
      setError('Failed to load results');
      toast({
        title: "Error",
        description: "Failed to load results",
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
      await fetchResults(1, filters, limit);
      setupSocketListeners();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load results');
      toast({
        title: "Error",
        description: "Failed to load results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchResults, toast, setupSocketListeners, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setResults([]);
    fetchResults(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setResults([]);
    fetchResults(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchResults(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setResults([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      status: 'all',
      zone: 'all',
      ward: 'all',
      state: 'all',
      lga: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(resetFilters);
    setPage(1);
    setResults([]);
    fetchResults(1, resetFilters, limit);
  };

  const handleViewResult = (result: Result) => {
    setSelectedResult(result);
    setIsViewDialogOpen(true);
  };

  const handleVerifyResult = async (resultId: string) => {
    try {
      await apiClient.patch(`/situation/results/${resultId}/verify`);
      toast({
        title: "✅ Result Verified",
        description: "The result has been verified successfully.",
      });
      fetchData(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify result",
        variant: "destructive",
      });
    }
  };

  const handleRejectResult = async (resultId: string, reason: string) => {
    try {
      await apiClient.patch(`/situation/results/${resultId}/reject`, { reason });
      toast({
        title: "❌ Result Rejected",
        description: "The result has been rejected.",
      });
      fetchData(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject result",
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
    return Array.from(new Set(results.map(r => r.zoneName))).filter(Boolean);
  }, [results]);

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(results.map(r => r.wardName))).filter(Boolean);
  }, [results]);

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.zone !== 'all' || 
    filters.ward !== 'all' ||
    filters.state !== 'all' ||
    filters.lga !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="📊 Situation Room - Results"
          subtitle="Viewing all election results across all zones"
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
        title="📊 Situation Room - Results"
        subtitle={`Viewing all election results ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
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
                  <p className="text-sm text-blue-700 font-medium">Total Results</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Verified</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.verified)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% verified
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatNumber(stats.pending)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-900">{formatNumber(stats.rejected)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
              </div>
              <p className="text-xs text-red-600 mt-1">
                {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}% rejected
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Total Votes</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.totalVotes)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Party Summary with Logos */}
        {stats.partySummary && stats.partySummary.length > 0 && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <p className="text-sm font-medium text-indigo-800">Party Vote Summary</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {stats.partySummary.map((party) => (
                  <div key={party.partyId} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border">
                    {party.logoUrl ? (
                      <img 
                        src={party.logoUrl} 
                        alt={party.partyName}
                        className="h-6 w-6 object-contain rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                        {party.partyName.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium truncate max-w-[150px]">{party.partyName}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatNumber(party.totalVotes)} votes
                    </Badge>
                    <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                      {party.percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zone Breakdown */}
        {stats.zoneBreakdown && stats.zoneBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Zone Breakdown</CardTitle>
              <CardDescription>Results by zone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.zoneBreakdown.map((zone) => (
                  <div key={zone.zoneId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{zone.zoneName}</p>
                      <div className="flex gap-2 text-xs mt-1">
                        <span className="text-green-600">✓ {zone.verified}</span>
                        <span className="text-yellow-600">⏳ {zone.pending}</span>
                        <span className="text-red-600">✗ {zone.rejected}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{zone.total}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </div>
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
                placeholder="Search results by polling unit, ward, or zone..."
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
                  <option value="Pending">Pending</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
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

        {/* Results Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Results
              </CardTitle>
              <CardDescription>
                {results.length === 0 ? 'No results found' :
                  `Showing ${results.length} of ${pagination.total || results.length} results`}
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
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No results found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all results
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
                        <TableHead>Polling Unit</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Votes</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          {/* Image Column */}
                          <TableCell>
                            {result.resultFileUrl ? (
                              <div 
                                className="relative group cursor-pointer"
                                onClick={() => setImagePreview(result.resultFileUrl)}
                              >
                                <img 
                                  src={result.resultFileUrl} 
                                  alt={`Result for ${result.pollingUnitName}`}
                                  className="h-12 w-12 object-cover rounded-md"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder-result.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>

                          {/* Polling Unit */}
                          <TableCell>
                            <div>
                              <p className="font-medium">{result.pollingUnitName}</p>
                              <p className="text-xs text-muted-foreground">{result.pollingUnitCode}</p>
                            </div>
                          </TableCell>

                          {/* Location */}
                          <TableCell>
                            <div>
                              <p className="text-sm">{result.zoneName}</p>
                              <p className="text-xs text-muted-foreground">{result.wardName}</p>
                            </div>
                          </TableCell>

                          {/* Votes */}
                          <TableCell>
                            <div className="space-y-1">
                              {result.parties?.slice(0, 3).map((party) => (
                                <div key={party.id} className="flex items-center gap-1 text-xs">
                                  {party.logoUrl ? (
                                    <img 
                                      src={party.logoUrl} 
                                      alt={party.name}
                                      className="h-4 w-4 object-contain rounded-full"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
                                  )}
                                  <span className="font-medium truncate max-w-[80px]">{party.name}:</span>
                                  <span>{formatNumber(party.votes)}</span>
                                  <span className="text-muted-foreground">({party.percentage}%)</span>
                                </div>
                              ))}
                              {result.parties?.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{result.parties.length - 3} more</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Total Votes */}
                          <TableCell>
                            <p className="font-medium">{formatNumber(result.totalVotes)}</p>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(result.status)}
                              {getStatusBadge(result.status)}
                            </div>
                          </TableCell>

                          {/* Submitted */}
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(result.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {result.uploaderName}
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
                                <DropdownMenuItem onClick={() => handleViewResult(result)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {result.resultFileUrl && (
                                  <DropdownMenuItem onClick={() => window.open(result.resultFileUrl, '_blank')}>
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    View Image
                                  </DropdownMenuItem>
                                )}
                                {result.status === 'Pending' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleVerifyResult(result.id)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Verify Result
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        const reason = prompt('Enter rejection reason:');
                                        if (reason) handleRejectResult(result.id, reason);
                                      }}
                                      className="text-red-600"
                                    >
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Reject Result
                                    </DropdownMenuItem>
                                  </>
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
                      Showing {results.length} of {pagination.total} results
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
                          setResults([]);
                          fetchResults(prevPage, filters, limit);
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

        {/* View Result Dialog */}
        <Dialog open={isViewDialogOpen && selectedResult !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Result Details
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnitName} - {selectedResult?.wardName}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedResult && (
                <div className="space-y-4 py-4">
                  {/* Status */}
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {getStatusIcon(selectedResult.status)}
                    {getStatusBadge(selectedResult.status)}
                    {selectedResult.reviewerName && (
                      <span className="text-sm text-muted-foreground ml-2">
                        Reviewed by {selectedResult.reviewerName}
                      </span>
                    )}
                  </div>

                  {/* Result Image */}
                  {selectedResult.resultFileUrl && (
                    <div className="border rounded-lg p-4">
                      <Label className="text-muted-foreground">Uploaded Result Image</Label>
                      <div className="mt-3 relative group">
                        <img 
                          src={selectedResult.resultFileUrl}
                          alt={`Result for ${selectedResult.pollingUnitName}`}
                          className="w-full max-h-[400px] object-contain rounded-lg border bg-muted/20"
                          onClick={() => window.open(selectedResult.resultFileUrl, '_blank')}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/90 hover:bg-white shadow-md"
                            onClick={() => window.open(selectedResult.resultFileUrl, '_blank')}
                          >
                            <Maximize2 className="h-4 w-4 mr-1" />
                            Full Screen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedResult.zoneName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedResult.wardName}</p>
                    </div>
                  </div>

                  {/* Votes */}
                  <div>
                    <Label className="text-muted-foreground">Vote Breakdown</Label>
                    <div className="mt-2 space-y-2">
                      {selectedResult.parties?.map((party) => (
                        <div key={party.id} className="flex items-center gap-2">
                          {party.logoUrl ? (
                            <img 
                              src={party.logoUrl} 
                              alt={party.name}
                              className="h-6 w-6 object-contain rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                              {party.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium w-24 truncate">{party.name}</span>
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                                style={{ width: `${party.percentage}%` }}
                              />
                              <span className="text-sm font-medium">{formatNumber(party.votes)}</span>
                              <span className="text-xs text-muted-foreground">({party.percentage}%)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Votes */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Total Votes</Label>
                      <p className="text-2xl font-bold text-blue-600">{formatNumber(selectedResult.totalVotes)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedResult.status)}</div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Submitted By</Label>
                      <p className="font-medium">{selectedResult.uploaderName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Submitted At</Label>
                      <p className="font-medium">{formatDate(selectedResult.createdAt)}</p>
                    </div>
                  </div>

                  {selectedResult.reviewComment && (
                    <div>
                      <Label className="text-muted-foreground">Review Comment</Label>
                      <p className="p-2 bg-muted rounded-lg text-sm">{selectedResult.reviewComment}</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedResult?.status === 'Pending' && (
                <>
                  <Button
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      if (selectedResult) handleVerifyResult(selectedResult.id);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Result
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason && selectedResult) {
                        setIsViewDialogOpen(false);
                        handleRejectResult(selectedResult.id, reason);
                      }
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reject Result
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
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
                alt="Result preview"
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