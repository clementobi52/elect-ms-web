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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Calendar,
  MapPin,
  Users,
  Building2,
  Layers,
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Globe,
  Printer,
  Mail,
  Share2,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Plus,
  BarChart3,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';
import { getSocket, onConnectionChange, onSocketMessage, sendSocketMessage } from '@/lib/socket-service';

// ============================================
// TYPES
// ============================================

interface Report {
  id: string;
  name: string;
  type: 'incident' | 'result' | 'agent' | 'ward' | 'zone' | 'summary';
  format: 'pdf' | 'csv' | 'excel' | 'image';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: any;
  fileUrl?: string;
  fileSize?: number;
  generatedBy: string;
  generatorName: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadCount: number;
}

interface ReportStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byType: { type: string; count: number }[];
  recentReports: Report[];
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  type: string;
  status: string;
  format: string;
  dateFrom: string;
  dateTo: string;
}

interface ReportFormData {
  name: string;
  type: string;
  format: string;
  filters: {
    zoneId?: string;
    wardId?: string;
    stateId?: string;
    lgaId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    severity?: string;
  };
}

// ============================================
// HELPERS
// ============================================

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500 text-white">Completed</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    case 'processing':
      return <Badge className="bg-blue-500 text-white animate-pulse">Processing</Badge>;
    case 'failed':
      return <Badge className="bg-red-500 text-white">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'incident': return <AlertTriangle className="h-4 w-4" />;
    case 'result': return <FileText className="h-4 w-4" />;
    case 'agent': return <Users className="h-4 w-4" />;
    case 'ward': return <Building2 className="h-4 w-4" />;
    case 'zone': return <Layers className="h-4 w-4" />;
    case 'summary': return <File className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
};

const getFormatIcon = (format: string) => {
  switch (format) {
    case 'pdf': return <File className="h-4 w-4" />;
    case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
    case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
    case 'image': return <FileImage className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SituationRoomReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    byType: [],
    recentReports: [],
  });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportForm, setReportForm] = useState<ReportFormData>({
    name: '',
    type: 'summary',
    format: 'pdf',
    filters: {},
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    status: 'all',
    format: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
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
      console.log(`🔌 Reports: Socket connection status: ${connected}`);
      setIsConnected(connected);
      
      if (connected && user?.id) {
        sendSocketMessage('join-situation-room', {
          userId: user.id,
          role: user.role,
          userName: user.name
        });
      }
    });

    const unsubMessages = onSocketMessage((event, data) => {
      console.log(`📨 Reports: Handling socket event: ${event}`, data);
      
      switch (event) {
        case 'report-generated':
          if (data && data.report) {
            setReports(prev => [data.report, ...prev]);
            toast({
              title: "📄 Report Generated",
              description: `${data.report.name} has been generated successfully.`,
              duration: 4000,
            });
            fetchStats();
          }
          break;
        case 'report-status-update':
          if (data && data.reportId) {
            setReports(prev => 
              prev.map(r => 
                r.id === data.reportId 
                  ? { ...r, status: data.status, fileUrl: data.fileUrl, completedAt: data.completedAt }
                  : r
              )
            );
            fetchStats();
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

  const fetchReports = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.type !== 'all') params.append('type', currentFilters.type);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.format !== 'all') params.append('format', currentFilters.format);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);

      setIsLoadingMore(pageNum > 1);

      const url = `/situation/reports?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        reports: Report[];
        pagination: PaginationData;
        stats: ReportStats;
      }>(url);

      console.log('📡 Response received:', response);

      if (response.success && response.reports) {
        if (pageNum === 1) {
          setReports(response.reports);
        } else {
          setReports(prev => [...prev, ...response.reports]);
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
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [limit, filters, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        stats: ReportStats;
      }>('/situation/reports/stats');

      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching report stats:', error);
    }
  }, []);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      await Promise.all([
        fetchReports(1, filters, limit),
        fetchStats()
      ]);
      setupSocketListeners();
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load reports');
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchReports, fetchStats, toast, setupSocketListeners, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setReports([]);
    fetchReports(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setReports([]);
    fetchReports(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReports(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setReports([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      type: 'all',
      status: 'all',
      format: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(resetFilters);
    setPage(1);
    setReports([]);
    fetchReports(1, resetFilters, limit);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const handleDownloadReport = async (report: Report) => {
    if (!report.fileUrl) {
      toast({
        title: "Error",
        description: "Report file not available",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.post(`/situation/reports/${report.id}/download`);
      window.open(report.fileUrl, '_blank');
      toast({
        title: "📥 Download Started",
        description: `${report.name} is downloading.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async () => {
    if (!reportForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report name",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const response = await apiClient.post<{
        success: boolean;
        report: Report;
      }>('/situation/reports/generate', reportForm);

      if (response.success && response.report) {
        setReports(prev => [response.report, ...prev]);
        toast({
          title: "✅ Report Generation Started",
          description: `${reportForm.name} is being generated. You'll be notified when it's ready.`,
          duration: 5000,
        });
        setIsGenerateDialogOpen(false);
        setReportForm({
          name: '',
          type: 'summary',
          format: 'pdf',
          filters: {},
        });
        fetchStats();
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await apiClient.delete(`/situation/reports/${reportId}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({
        title: "🗑️ Report Deleted",
        description: "The report has been deleted successfully.",
        duration: 3000,
      });
      fetchStats();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const openGenerateDialog = () => {
    setReportForm({
      name: `${new Date().toISOString().split('T')[0]} - ${getTypeLabel('summary')}`,
      type: 'summary',
      format: 'pdf',
      filters: {},
    });
    setIsGenerateDialogOpen(true);
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

  const hasActiveFilters = filters.search || 
    filters.type !== 'all' || 
    filters.status !== 'all' ||
    filters.format !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="📄 Situation Room - Reports"
          subtitle="Generate and manage reports"
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
        title="📄 Situation Room - Reports"
        subtitle={`Generate and manage reports ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
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
            <Button onClick={openGenerateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Connection Banner */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span>Real-time connection lost. Report status updates may be delayed.</span>
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
                  <p className="text-sm text-blue-700 font-medium">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
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
                  <p className="text-sm text-green-700 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pending + stats.processing}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                {stats.processing > 0 && `${stats.processing} processing`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
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
                  <p className="text-sm text-purple-700 font-medium">Report Types</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.byType.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types Summary */}
        {stats.byType.length > 0 && (
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-slate-600" />
                <p className="text-sm font-medium text-slate-800">Report Types</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.byType.map((type) => (
                  <Badge key={type.type} variant="outline" className="px-3 py-1 text-sm">
                    {getTypeLabel(type.type)}: {type.count}
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
                placeholder="Search reports by name..."
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
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Report Type</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="incident">Incident</option>
                  <option value="result">Result</option>
                  <option value="agent">Agent</option>
                  <option value="ward">Ward</option>
                  <option value="zone">Zone</option>
                  <option value="summary">Summary</option>
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
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Format</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.format}
                  onChange={(e) => handleFilterChange('format', e.target.value)}
                >
                  <option value="all">All Formats</option>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="image">Image</option>
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

        {/* Reports Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reports
              </CardTitle>
              <CardDescription>
                {reports.length === 0 ? 'No reports found' :
                  `Showing ${reports.length} of ${pagination.total || reports.length} reports`}
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
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <Badge variant="outline" className="text-xs">
                Total: {pagination.total || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No reports found</p>
                <Button variant="link" onClick={openGenerateDialog} className="mt-2">
                  Generate your first report
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Downloads</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{report.name}</p>
                              <p className="text-xs text-muted-foreground">{report.id.slice(0, 8)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getTypeIcon(report.type)}
                              <span className="text-sm">{getTypeLabel(report.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getFormatIcon(report.format)}
                              <span className="text-sm uppercase">{report.format}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(report.status)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatFileSize(report.fileSize)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(report.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {report.generatorName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{report.downloadCount}</span>
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
                                <DropdownMenuItem onClick={() => handleViewReport(report)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {report.status === 'completed' && report.fileUrl && (
                                  <DropdownMenuItem onClick={() => handleDownloadReport(report)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                )}
                                {report.status === 'pending' || report.status === 'processing' && (
                                  <DropdownMenuItem disabled>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Generating...
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteReport(report.id)}
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
                      Showing {reports.length} of {pagination.total} reports
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
                          setReports([]);
                          fetchReports(prevPage, filters, limit);
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

        {/* View Report Dialog */}
        <Dialog open={isViewDialogOpen && selectedReport !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Details
              </DialogTitle>
              <DialogDescription>
                {selectedReport?.name}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedReport && (
                <div className="space-y-4 py-4">
                  {/* Status */}
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {getStatusBadge(selectedReport.status)}
                    {selectedReport.status === 'completed' && selectedReport.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(selectedReport)}
                        className="ml-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="font-medium">{getTypeLabel(selectedReport.type)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Format</Label>
                      <p className="font-medium uppercase">{selectedReport.format}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">File Size</Label>
                      <p className="font-medium">{formatFileSize(selectedReport.fileSize)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Downloads</Label>
                      <p className="font-medium">{selectedReport.downloadCount}</p>
                    </div>
                  </div>

                  {/* Filters */}
                  {selectedReport.filters && Object.keys(selectedReport.filters).length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Filters Applied</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(selectedReport.filters).map(([key, value]) => (
                          value && value !== 'all' && (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Generated By</Label>
                      <p className="font-medium">{selectedReport.generatorName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Generated At</Label>
                      <p className="font-medium">{formatDate(selectedReport.createdAt)}</p>
                    </div>
                  </div>

                  {selectedReport.completedAt && (
                    <div>
                      <Label className="text-muted-foreground">Completed At</Label>
                      <p className="font-medium">{formatDate(selectedReport.completedAt)}</p>
                    </div>
                  )}

                  {selectedReport.expiresAt && (
                    <div>
                      <Label className="text-muted-foreground">Expires At</Label>
                      <p className="font-medium text-yellow-600">{formatDate(selectedReport.expiresAt)}</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedReport?.status === 'completed' && selectedReport?.fileUrl && (
                <Button onClick={() => handleDownloadReport(selectedReport)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Report Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Generate Report
              </DialogTitle>
              <DialogDescription>
                Create a new report with custom filters
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Report Name</Label>
                <Input
                  placeholder="Enter report name"
                  value={reportForm.name}
                  onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Report Type</Label>
                  <Select
                    value={reportForm.type}
                    onValueChange={(value) => setReportForm({ ...reportForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary Report</SelectItem>
                      <SelectItem value="incident">Incident Report</SelectItem>
                      <SelectItem value="result">Result Report</SelectItem>
                      <SelectItem value="agent">Agent Report</SelectItem>
                      <SelectItem value="ward">Ward Report</SelectItem>
                      <SelectItem value="zone">Zone Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Format</Label>
                  <Select
                    value={reportForm.format}
                    onValueChange={(value) => setReportForm({ ...reportForm, format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filters</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Zone</Label>
                    <Select
                      value={reportForm.filters.zoneId || 'all'}
                      onValueChange={(value) => setReportForm({
                        ...reportForm,
                        filters: { ...reportForm.filters, zoneId: value === 'all' ? undefined : value }
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ward</Label>
                    <Select
                      value={reportForm.filters.wardId || 'all'}
                      onValueChange={(value) => setReportForm({
                        ...reportForm,
                        filters: { ...reportForm.filters, wardId: value === 'all' ? undefined : value }
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date From</Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={reportForm.filters.dateFrom || ''}
                      onChange={(e) => setReportForm({
                        ...reportForm,
                        filters: { ...reportForm.filters, dateFrom: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date To</Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={reportForm.filters.dateTo || ''}
                      onChange={(e) => setReportForm({
                        ...reportForm,
                        filters: { ...reportForm.filters, dateTo: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReport} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}