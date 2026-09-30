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
  Flag,
  AlertOctagon,
  Info,
  Shield,
  Phone,
  Mail,
  User,
  Clock as ClockIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface Incident {
  id: string;
  pollingUnitId: string;
  pollingUnitName?: string;
  wardId?: string;
  wardName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  reportedBy: string;
  reporterName?: string;
  reporterEmail?: string;
  latitude?: number;
  longitude?: number;
  type: 'Violence' | 'Fraud' | 'Intimidation' | 'Technical' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  mediaUrl?: string;
  status: 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed';
  reviewedBy?: string;
  reviewerName?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

interface IncidentStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  byType: {
    type: string;
    count: number;
  }[];
  bySeverity: {
    severity: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
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
  type: string;
  severity: string;
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
    case 'Resolved':
      return <Badge className="bg-green-500 text-white">Resolved</Badge>;
    case 'Under Review':
      return <Badge className="bg-blue-500 text-white">Under Review</Badge>;
    case 'Pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    case 'Dismissed':
      return <Badge className="bg-gray-500 text-white">Dismissed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Resolved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Under Review':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'Pending':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'Dismissed':
      return <X className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'Critical':
      return <Badge className="bg-red-600 text-white">Critical</Badge>;
    case 'High':
      return <Badge className="bg-red-500 text-white">High</Badge>;
    case 'Medium':
      return <Badge className="bg-orange-500 text-white">Medium</Badge>;
    case 'Low':
      return <Badge className="bg-yellow-500 text-white">Low</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Violence':
      return <AlertOctagon className="h-4 w-4 text-red-500" />;
    case 'Fraud':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'Intimidation':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'Technical':
      return <WifiOff className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SystemIncidentsPage() {
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
  const [reviewStatus, setReviewStatus] = useState<string>('Under Review');
  const [reviewComment, setReviewComment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<IncidentStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    resolved: 0,
    dismissed: 0,
    byType: [],
    bySeverity: [],
    recentActivity: [],
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    type: 'all',
    severity: 'all',
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
      }

    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL]);

  const fetchIncidents = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.type !== 'all') params.append('type', currentFilters.type);
      if (currentFilters.severity !== 'all') params.append('severity', currentFilters.severity);
      if (currentFilters.zone !== 'all') params.append('zoneId', currentFilters.zone);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
      if (currentFilters.sortBy !== 'createdAt') params.append('sortBy', currentFilters.sortBy);

      setIsLoadingMore(pageNum > 1);

      const url = `/admin/system/incidents?${params.toString()}`;
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

      if (data.success && data.incidents) {
        if (pageNum === 1) {
          setIncidents(data.incidents);
        } else {
          setIncidents(prev => [...prev, ...data.incidents]);
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
      console.error('Error fetching incidents:', error);
      setError(error.message || 'Failed to load incidents');
      toast({
        title: "Error",
        description: error.message || "Failed to load incidents",
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
        fetchIncidents(1, filters, limit),
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
  }, [filters, fetchIncidents, fetchOptions, toast, limit]);

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
      status: 'all',
      type: 'all',
      severity: 'all',
      zone: 'all',
      ward: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
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
    setReviewStatus(incident.status);
    setReviewComment(incident.reviewComment || '');
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedIncident) return;

    try {
      const token = localStorage.getItem('authToken');
      const endpoint = `/admin/system/incidents/${selectedIncident.id}/review`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ 
          status: reviewStatus,
          reviewComment: reviewComment 
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: `✅ Incident ${reviewStatus}`,
          description: data.message || `Incident has been ${reviewStatus.toLowerCase()}.`,
        });
        setIsReviewDialogOpen(false);
        setReviewComment('');
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to review incident');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to review incident",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/incidents/${id}`, {
        method: 'DELETE',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "🗑️ Incident Deleted",
          description: data.message || "Incident has been deleted successfully.",
        });
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to delete incident');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete incident",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const headers = ['Polling Unit', 'Ward', 'Zone', 'Type', 'Severity', 'Status', 'Description', 'Reported By', 'Reported At'];
    const rows = incidents.map(incident => [
      incident.pollingUnitName || 'N/A',
      incident.wardName || 'N/A',
      incident.zoneName || 'N/A',
      incident.type,
      incident.severity,
      incident.status,
      incident.description.substring(0, 100),
      incident.reporterName || incident.reportedBy,
      formatDate(incident.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${new Date().toISOString().split('T')[0]}.csv`;
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
    return Array.from(new Set(incidents.map(i => i.zoneName))).filter(Boolean);
  }, [incidents]);

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(incidents.map(i => i.wardName))).filter(Boolean);
  }, [incidents]);

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.type !== 'all' ||
    filters.severity !== 'all' ||
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
          title="🚨 Incidents"
          subtitle="System Admin View - All Reported Incidents"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
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
        title="🚨 Incidents"
        subtitle="System Admin View - All Reported Incidents"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Flag className="h-5 w-5 text-blue-700" />
                </div>
              </div>
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
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Under Review</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.underReview)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-700" />
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

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Dismissed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.dismissed)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <X className="h-5 w-5 text-gray-700" />
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
                placeholder="Search by polling unit, ward, description..."
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
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
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
                  <option value="Violence">Violence</option>
                  <option value="Fraud">Fraud</option>
                  <option value="Intimidation">Intimidation</option>
                  <option value="Technical">Technical</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
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
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reported</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(incident.type)}
                              <span className="font-medium">{incident.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{incident.pollingUnitName || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{incident.wardName || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(incident.status)}
                              {getStatusBadge(incident.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[200px]">
                              {incident.description}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(incident.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {incident.reporterName || incident.reportedBy}
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
                                <DropdownMenuItem onClick={() => handleViewIncident(incident)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {incident.mediaUrl && (
                                  <DropdownMenuItem onClick={() => setImagePreview(incident.mediaUrl!)}>
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    View Image
                                  </DropdownMenuItem>
                                )}
                                {incident.status !== 'Resolved' && incident.status !== 'Dismissed' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleReviewIncident(incident)}
                                    className="text-blue-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Review Incident
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteIncident(incident.id)}
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
                {selectedIncident?.pollingUnitName || 'Unknown Location'}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedIncident && (
                <div className="space-y-4 py-4">
                  {/* Status & Severity */}
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg flex-wrap">
                    {getStatusIcon(selectedIncident.status)}
                    {getStatusBadge(selectedIncident.status)}
                    <span className="mx-2 text-muted-foreground">|</span>
                    {getSeverityBadge(selectedIncident.severity)}
                    {selectedIncident.reviewerName && (
                      <span className="text-sm text-muted-foreground ml-2">
                        Reviewed by {selectedIncident.reviewerName}
                      </span>
                    )}
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedIncident.type)}
                    <span className="font-medium text-lg">{selectedIncident.type}</span>
                  </div>

                  {/* Image */}
                  {selectedIncident.mediaUrl && (
                    <div className="border rounded-lg p-4">
                      <Label className="text-muted-foreground">Evidence Image</Label>
                      <div className="mt-3 relative group">
                        <img 
                          src={selectedIncident.mediaUrl}
                          alt="Incident evidence"
                          className="w-full max-h-[400px] object-contain rounded-lg border bg-muted/20"
                          onClick={() => setImagePreview(selectedIncident.mediaUrl!)}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/90 hover:bg-white shadow-md"
                            onClick={() => setImagePreview(selectedIncident.mediaUrl!)}
                          >
                            <Maximize2 className="h-4 w-4 mr-1" />
                            Full Screen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 p-3 bg-muted/50 rounded-lg">{selectedIncident.description}</p>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Polling Unit</Label>
                      <p className="font-medium">{selectedIncident.pollingUnitName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedIncident.wardName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedIncident.zoneName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State/LGA</Label>
                      <p className="font-medium">{selectedIncident.stateName || 'N/A'} / {selectedIncident.lgaName || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Reporter Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Reported By</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedIncident.reporterName || selectedIncident.reportedBy}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reported At</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(selectedIncident.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedIncident.reviewComment && (
                    <div>
                      <Label className="text-muted-foreground">Review Comment</Label>
                      <p className="p-2 bg-muted rounded-lg text-sm">{selectedIncident.reviewComment}</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedIncident?.status !== 'Resolved' && selectedIncident?.status !== 'Dismissed' && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    if (selectedIncident) handleReviewIncident(selectedIncident);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review Incident
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
                <AlertTriangle className="h-5 w-5" />
                Review Incident
              </DialogTitle>
              <DialogDescription>
                {selectedIncident?.pollingUnitName || 'Unknown Location'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Current Status</Label>
                <p className="font-medium">{getStatusBadge(selectedIncident?.status || '')}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">New Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
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
                alt="Evidence preview"
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