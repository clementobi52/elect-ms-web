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
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit,
  MapPin,
  Building2,
  Layers,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Globe,
  Image as ImageIcon,
  Maximize2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL, API_ORIGIN } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface Result {
  id: string;
  pollingUnitId: string;
  pollingUnitName: string;
  pollingUnitCode?: string;
  wardId?: string;
  wardName: string;
  zoneId?: string;
  zoneName: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  uploadedBy: string;
  uploaderName: string;
  totalVotes: number;
  registeredVoters: number;
  turnout: number;
  parties: {
    id: string;
    name: string;
    logoUrl?: string;
    votes: number;
    percentage: number;
  }[];
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
  totalRegisteredVoters: number;
  overallTurnout: number;
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
  dateFrom: string;
  dateTo: string;
  sortBy: string;
}

// ============================================
// HELPERS
// ============================================

const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0';
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};

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
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

// ✅ Helper: Get full image URL
const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SystemResultsPage() {
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
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>('Verified');
  const [reviewComment, setReviewComment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<ResultStats>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalVotes: 0,
    totalRegisteredVoters: 0,
    overallTurnout: 0,
    partySummary: [],
    zoneBreakdown: [],
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    zone: 'all',
    ward: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
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

  // Options for selects
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);


  // ============================================
  // API FUNCTIONS
  // ============================================

  const fetchOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found');
        return;
      }

      const [zonesRes, wardsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/system/zones?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        }),
        fetch(`${API_BASE_URL}/admin/system/wards?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        })
      ]);

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        if (data.zones) {
          setZones(data.zones);
        } else if (data.data) {
          setZones(data.data);
        } else if (Array.isArray(data)) {
          setZones(data);
        }
      } else {
        console.warn('⚠️ Zones API returned:', zonesRes.status);
      }

      if (wardsRes.ok) {
        const data = await wardsRes.json();
        if (data.wards) {
          setWards(data.wards);
        } else if (data.data) {
          setWards(data.data);
        } else if (Array.isArray(data)) {
          setWards(data);
        }
      } else {
        console.warn('⚠️ Wards API returned:', wardsRes.status);
      }

    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL]);

  const fetchResults = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
      if (currentFilters.sortBy !== 'createdAt') params.append('sortBy', currentFilters.sortBy);

      setIsLoadingMore(pageNum > 1);

      const url = `/admin/system/results?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Response received:', data);

      if (data.success && data.results) {
        const processedResults = data.results.map((result: Result) => ({
          ...result,
          resultFileUrl: getImageUrl(result.resultFileUrl),
        }));
        
        if (pageNum === 1) {
          setResults(processedResults);
        } else {
          setResults(prev => [...prev, ...processedResults]);
        }
        
        if (data.pagination) {
          setPagination(data.pagination);
        }

        if (data.stats) {
          console.log('📊 Stats received:', data.stats);
          setStats(data.stats);
        }
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
      setError(error.message || 'Failed to load results');
      toast({
        title: "Error",
        description: error.message || "Failed to load results",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [limit, filters, toast, API_BASE_URL]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      await Promise.all([
        fetchResults(1, filters, limit),
        fetchOptions(),
      ]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchResults, fetchOptions, toast, limit]);

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
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
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

  // ✅ FIXED: Set default status to 'Verified' when reviewing
  const handleReviewResult = (result: Result) => {
    setSelectedResult(result);
    setReviewStatus('Verified');
    setReviewComment(result.reviewComment || '');
    setIsReviewDialogOpen(true);
  };

  // ✅ FIXED: Explicitly set to 'Rejected' for reject action
  const handleRejectResult = (result: Result) => {
    setSelectedResult(result);
    setReviewStatus('Rejected');
    setReviewComment('');
    setIsReviewDialogOpen(true);
  };

  // ✅ FIXED: Submit review with correct status
  const handleSubmitReview = async () => {
    if (!selectedResult) return;

    // ✅ Validate rejection reason
    if (reviewStatus === 'Rejected' && !reviewComment.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const endpoint = reviewStatus === 'Verified' 
        ? `/admin/system/results/${selectedResult.id}/verify`
        : `/admin/system/results/${selectedResult.id}/reject`;

      console.log('📤 Submitting review:', {
        endpoint,
        reviewStatus,
        reviewComment,
        resultId: selectedResult.id
      });

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ 
          reviewComment: reviewComment 
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: `✅ Result ${reviewStatus}`,
          description: data.message || `Result has been ${reviewStatus.toLowerCase()}.`,
        });
        setIsReviewDialogOpen(false);
        setReviewComment('');
        setReviewStatus('Verified');
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to review result');
      }
    } catch (error: any) {
      console.error('❌ Error submitting review:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to review result",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/results/${id}`, {
        method: 'DELETE',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "🗑️ Result Deleted",
          description: data.message || "Result has been deleted successfully.",
        });
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to delete result');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete result",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const headers = ['Polling Unit', 'Ward', 'Zone', 'Status', 'Total Votes', 'Turnout', 'Submitted By', 'Submitted At'];
    const rows = results.map(result => [
      result.pollingUnitName,
      result.wardName,
      result.zoneName,
      result.status,
      result.totalVotes,
      `${result.turnout || 0}%`,
      result.uploaderName,
      formatDate(result.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchData(true);
  }, []);

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
    filters.dateFrom ||
    filters.dateTo;

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="📊 Results"
          subtitle="System Admin View - All Election Results"
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
        title="📊 Results"
        subtitle="System Admin View - All Election Results"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
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
                  <AlertCircle className="h-5 w-5 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Turnout</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.overallTurnout || 0}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-700" />
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {formatNumber(stats.totalVotes)} / {formatNumber(stats.totalRegisteredVoters)} votes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Party Summary */}
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
                placeholder="Search by polling unit, ward, or zone..."
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
                    {Object.values(filters).filter(v => v !== 'all' && v !== '' && v !== 'createdAt').length}
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
              <Button variant="outline" size="sm" onClick={handleExport}>
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
                        <TableHead>Polling Unit</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Votes</TableHead>
                        <TableHead>Turnout</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{result.pollingUnitName}</p>
                              <p className="text-xs text-muted-foreground">{result.pollingUnitCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{result.zoneName}</p>
                              <p className="text-xs text-muted-foreground">{result.wardName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
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
                          <TableCell>
                            <div>
                              <p className="font-medium">{result.turnout || 0}%</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(result.totalVotes)} / {formatNumber(result.registeredVoters || 0)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(result.status)}
                              {getStatusBadge(result.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(result.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {result.uploaderName}
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
                                <DropdownMenuItem onClick={() => handleViewResult(result)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {result.resultFileUrl && (
                                  <DropdownMenuItem onClick={() => setImagePreview(result.resultFileUrl!)}>
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    View Image
                                  </DropdownMenuItem>
                                )}
                                {result.status === 'Pending' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleReviewResult(result)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Verify Result
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedResult(result);
                                        setReviewStatus('Rejected');
                                        setReviewComment('');
                                        setIsReviewDialogOpen(true);
                                      }}
                                      className="text-red-600"
                                    >
                                      <AlertCircle className="h-4 w-4 mr-2" />
                                      Reject Result
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteResult(result.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
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
                      <Label className="text-muted-foreground">Result Image</Label>
                      <div className="mt-3 relative group">
                        <img 
                          src={getImageUrl(selectedResult.resultFileUrl)}
                          alt={`Result for ${selectedResult.pollingUnitName}`}
                          className="w-full max-h-[400px] object-contain rounded-lg border bg-muted/20"
                          onClick={() => setImagePreview(getImageUrl(selectedResult.resultFileUrl!))}
                          onError={(e) => {
                            console.error('❌ Image load error:', getImageUrl(selectedResult.resultFileUrl!));
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/90 hover:bg-white shadow-md"
                            onClick={() => setImagePreview(getImageUrl(selectedResult.resultFileUrl!))}
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
                      if (selectedResult) handleReviewResult(selectedResult);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Result
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      setSelectedResult(selectedResult);
                      setReviewStatus('Rejected');
                      setReviewComment('');
                      setIsReviewDialogOpen(true);
                    }}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
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

        {/* ✅ FIXED: Review Result Dialog */}
        <Dialog open={isReviewDialogOpen && selectedResult !== null} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review Result
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnitName} - {selectedResult?.wardName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Current Status</Label>
                <p className="font-medium">{getStatusBadge(selectedResult?.status || '')}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">New Status *</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <option value="Verified">✅ Verified (Approve)</option>
                  <option value="Rejected">❌ Rejected (Reject)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {reviewStatus === 'Verified' 
                    ? 'This will approve and verify the result' 
                    : 'This will reject the result (requires comment)'}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  Review Comment {reviewStatus === 'Rejected' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  className="mt-1"
                  placeholder={reviewStatus === 'Rejected' 
                    ? "Please provide a reason for rejection..." 
                    : "Add your review comments here (optional)..."
                  }
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                />
                {reviewStatus === 'Rejected' && !reviewComment.trim() && (
                  <p className="text-xs text-red-500 mt-1">Rejection reason is required</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsReviewDialogOpen(false);
                setReviewComment('');
                setReviewStatus('Verified');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReview}
                disabled={reviewStatus === 'Rejected' && !reviewComment.trim()}
                className={reviewStatus === 'Verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {reviewStatus === 'Verified' ? '✅ Verify Result' : '❌ Reject Result'}
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
                onError={(e) => {
                  console.error('❌ Image preview error:', imagePreview);
                }}
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