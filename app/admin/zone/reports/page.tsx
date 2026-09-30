// app/admin/zone/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Building2,
  Users,
  RefreshCw,
  Eye,
  CheckCircle,
  FileText,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  File,
  FileSpreadsheet,
  FilePieChart,
  FileCheck,
  FileX,
  Loader2,
  Search,
  Download,
  Info,
  Plus,
  Trash2,
  MoreVertical,
  Clock,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { withTenantHeaders } from '@/lib/tenant';

// Types
interface Report {
  id: string;
  name: string;
  type: 'summary' | 'results' | 'incidents' | 'agents' | 'wards';
  format: 'pdf' | 'csv' | 'excel';
  zoneId: string;
  wardId?: string;
  generatedBy: string;
  generatedByName?: string;
  filePath?: string;
  fileSize?: number;
  size?: string;
  status: 'processing' | 'ready' | 'failed';
  errorMessage?: string;
  data?: any;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

interface ReportStats {
  totalReports: number;
  ready: number;
  processing: number;
  failed: number;
  recentReports: Report[];
}

// Reports API functions
const reportsApi = {
  getReports: async (zoneId: string): Promise<{ success: boolean; reports: Report[]; stats: ReportStats }> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        reports: Report[];
        stats: ReportStats;
      }>(`/admin/zone/${zoneId}/reports`);
      
      return {
        success: response.success || true,
        reports: response.reports || [],
        stats: response.stats || {
          totalReports: 0,
          ready: 0,
          processing: 0,
          failed: 0,
          recentReports: [],
        },
      };
    } catch (error) {
      console.error('Error fetching reports:', error);
      return {
        success: false,
        reports: [],
        stats: {
          totalReports: 0,
          ready: 0,
          processing: 0,
          failed: 0,
          recentReports: [],
        },
      };
    }
  },

  generateReport: async (
    zoneId: string,
    options: { type: string; format: string; wardId?: string | null }
  ): Promise<{ success: boolean; report?: Report; message?: string }> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        report: Report;
        message?: string;
      }>(`/admin/zone/${zoneId}/reports/generate`, options);
      
      return {
        success: response.success || true,
        report: response.report,
        message: response.message || 'Report generated successfully',
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate report',
      };
    }
  },

  downloadReport: async (reportId: string): Promise<Blob> => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/reports/download/${reportId}`, {
        headers: withTenantHeaders({
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  downloadReportWithFilename: async (reportId: string, filename: string): Promise<void> => {
    try {
      const blob = await reportsApi.downloadReport(reportId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report with filename:', error);
      throw error;
    }
  },

  deleteReport: async (zoneId: string, reportId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message?: string;
      }>(`/admin/zone/${zoneId}/reports/${reportId}`);
      
      return {
        success: response.success || true,
        message: response.message || 'Report deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting report:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete report',
      };
    }
  },

  getReportTypes: () => {
    return [
      { value: 'summary', label: 'Summary' },
      { value: 'results', label: 'Results' },
      { value: 'incidents', label: 'Incidents' },
      { value: 'agents', label: 'Agents' },
      { value: 'wards', label: 'Wards' },
    ];
  },

  getReportFormats: () => {
    return [
      { value: 'pdf', label: 'PDF' },
      { value: 'csv', label: 'CSV' },
      { value: 'excel', label: 'Excel' },
    ];
  },
};

export default function ZoneReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    totalReports: 0,
    ready: 0,
    processing: 0,
    failed: 0,
    recentReports: [],
  });
  const [zoneName, setZoneName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateType, setGenerateType] = useState<string>('summary');
  const [generateFormat, setGenerateFormat] = useState<string>('pdf');
  const [generateWardId, setGenerateWardId] = useState<string>('all');
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);

  const reportTypes = reportsApi.getReportTypes();
  const reportFormats = reportsApi.getReportFormats();

  // Fetch reports and stats
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      // Fetch reports using the reports API
      const response = await reportsApi.getReports(zoneId);
      
      console.log('📡 Reports Response:', response);

      if (response.success) {
        // Map the reports data properly
        const mappedReports = (response.reports || []).map((report: any) => ({
          id: report.id || '',
          name: report.name || 'Untitled Report',
          type: report.type || 'summary',
          format: report.format || 'pdf',
          zoneId: report.zoneId || zoneId,
          wardId: report.wardId || null,
          generatedBy: report.generatedBy || report.generator?.name || 'Unknown',
          generatedByName: report.generatedByName || report.generator?.name || 'Unknown',
          filePath: report.filePath || null,
          fileSize: report.fileSize || 0,
          size: report.size || `${report.fileSize || 0}`,
          status: report.status || 'processing',
          errorMessage: report.errorMessage || null,
          data: report.data || null,
          generatedAt: report.generatedAt || report.createdAt || new Date().toISOString(),
          createdAt: report.createdAt || new Date().toISOString(),
          updatedAt: report.updatedAt || new Date().toISOString(),
          url: report.url || null,
        }));

        setReports(mappedReports);
        
        // Calculate stats from the reports
        const totalReports = mappedReports.length;
        const ready = mappedReports.filter((r: Report) => r.status === 'ready').length;
        const processing = mappedReports.filter((r: Report) => r.status === 'processing').length;
        const failed = mappedReports.filter((r: Report) => r.status === 'failed').length;
        
        // Get recent reports (last 5)
        const recentReports = [...mappedReports]
          .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
          .slice(0, 5);

        setStats({
          totalReports,
          ready,
          processing,
          failed,
          recentReports,
        });
      }

      // Fetch wards for filter
      try {
        const wardsResponse = await apiClient.get<{ success: boolean; wards: any[] }>(
          `/admin/zone/${zoneId}/wards?page=1&limit=100`
        );
        
        if (wardsResponse.success && wardsResponse.wards) {
          setWards(wardsResponse.wards.map((w: any) => ({
            id: w.id,
            name: w.name,
          })));
        }
      } catch (wardsError) {
        console.log('Could not fetch wards for filter');
      }

      // Set zone name
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  // Initial load
  useEffect(() => {
    if (user?.zoneId) {
      fetchData(true);
    }
  }, [fetchData, user?.zoneId]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData(false);
  };

  // Handle generate report
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      console.log('📡 Generating report with options:', {
        zoneId,
        type: generateType,
        format: generateFormat,
        wardId: generateWardId === 'all' ? null : generateWardId,
      });

      const response = await reportsApi.generateReport(zoneId, {
        type: generateType as any,
        format: generateFormat as any,
        wardId: generateWardId === 'all' ? null : generateWardId,
      });

      console.log('📡 Generate response:', response);

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Report generated successfully",
        });
        setIsGenerateDialogOpen(false);
        // Refresh the reports list
        await fetchData(false);
      } else {
        throw new Error(response.message || "Failed to generate report");
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download report
  const handleDownload = async (report: Report) => {
    try {
      if (report.id) {
        await reportsApi.downloadReportWithFilename(report.id, report.name || `report_${report.id}.${report.format}`);
        toast({
          title: "Download Started",
          description: `Downloading ${report.name}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Report file not available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  // Handle delete report
  const handleDelete = async (reportId: string) => {
    try {
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      const response = await reportsApi.deleteReport(zoneId, reportId);

      if (response.success) {
        toast({
          title: "Success",
          description: "Report deleted successfully",
        });
        await fetchData(false);
      } else {
        throw new Error(response.message || "Failed to delete report");
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.generatedBy?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesFormat = filterFormat === 'all' || report.format === filterFormat;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;

    return matchesSearch && matchesType && matchesFormat && matchesStatus;
  });

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'results':
        return <FileCheck className="h-4 w-4" />;
      case 'incidents':
        return <AlertTriangle className="h-4 w-4" />;
      case 'agents':
        return <Users className="h-4 w-4" />;
      case 'wards':
        return <Building2 className="h-4 w-4" />;
      case 'summary':
        return <FilePieChart className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-blue-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500 text-white">Ready</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500 text-white">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Format file size
  const formatSize = (size: string | number | undefined) => {
    if (!size) return 'Unknown';
    const bytes = typeof size === 'string' ? parseInt(size) : size;
    if (isNaN(bytes)) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterFormat('all');
    setFilterStatus('all');
  };

  // Format date
  const formatDate = (date: string) => {
    if (!date) return 'Unknown';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Reports" 
          subtitle="Generate and manage reports for your zone"
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex justify-end">
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        title="Zone Reports" 
        subtitle={`Generate and manage reports for ${zoneName || 'your zone'}`}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header with Generate Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-sm text-muted-foreground">
              {reports.length > 0 ? `${reports.length} Reports available` : 'No reports yet'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReports || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ready</CardTitle>
              <FileCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ready || 0}</div>
              <p className="text-xs text-green-700">Available for download</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.processing || 0}</div>
              <p className="text-xs text-yellow-700">Generating...</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <FileX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
              <p className="text-xs text-red-700">Generation failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports by name, type, or creator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Report Type</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Format</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                >
                  <option value="all">All Formats</option>
                  {reportFormats.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="ready">Ready</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          )}

          {/* Active filters chips */}
          {(filterType !== 'all' || filterFormat !== 'all' || filterStatus !== 'all' || searchTerm) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filterType !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {reportTypes.find(t => t.value === filterType)?.label || filterType}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterType('all')} />
                </Badge>
              )}
              {filterFormat !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Format: {reportFormats.find(f => f.value === filterFormat)?.label || filterFormat}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterFormat('all')} />
                </Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filterStatus}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                {reports.length === 0 ? 'No reports found' :
                  `Showing ${filteredReports.length} of ${reports.length} reports`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No reports found</p>
                <p className="text-sm">Generate your first report to get started.</p>
                <Button 
                  variant="link" 
                  onClick={() => setIsGenerateDialogOpen(true)}
                  className="mt-2"
                >
                  Generate your first report
                </Button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No reports match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
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
                      <TableHead>By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{report.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(report.type)}
                            <span className="capitalize text-sm">{report.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getFormatIcon(report.format)}
                            <span className="uppercase text-sm">{report.format}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(report.status)}
                            {getStatusBadge(report.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatSize(report.fileSize || report.size)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(report.generatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(report.generatedBy || report.generatedByName || '')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{report.generatedBy || report.generatedByName || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {report.status === 'ready' && (
                                <DropdownMenuItem onClick={() => handleDownload(report)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => {
                                setSelectedReport(report);
                                setIsViewDialogOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this report?')) {
                                    handleDelete(report.id);
                                  }
                                }}
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
            )}
          </CardContent>
        </Card>

        {/* View Report Dialog */}
        <Dialog open={isViewDialogOpen && selectedReport !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Details
              </DialogTitle>
              <DialogDescription>
                {selectedReport?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium capitalize">{selectedReport.type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Format</Label>
                    <p className="font-medium uppercase">{selectedReport.format}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedReport.status)}
                      {getStatusBadge(selectedReport.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Size</Label>
                    <p className="font-medium">{formatSize(selectedReport.fileSize || selectedReport.size)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Generated</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedReport.generatedAt)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Generated By</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.generatedBy || selectedReport.generatedByName || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Show report data preview if available */}
                {selectedReport.data && (
                  <div>
                    <Label className="text-muted-foreground">Report Data</Label>
                    <ScrollArea className="h-[200px] mt-2 p-3 bg-muted rounded-lg">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(selectedReport.data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {selectedReport.status === 'ready' && (
                  <Button className="w-full" onClick={() => handleDownload(selectedReport)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                )}

                {selectedReport.status === 'failed' && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      This report failed to generate. Please try again.
                      {selectedReport.errorMessage && (
                        <span className="block mt-1 text-xs text-red-500">
                          Error: {selectedReport.errorMessage}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Report Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generate Report
              </DialogTitle>
              <DialogDescription>
                Create a new report for your zone
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">Report Type</Label>
                <select
                  id="report-type"
                  className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                  value={generateType}
                  onChange={(e) => setGenerateType(e.target.value)}
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-format">Format</Label>
                <select
                  id="report-format"
                  className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                  value={generateFormat}
                  onChange={(e) => setGenerateFormat(e.target.value)}
                >
                  {reportFormats.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              {generateType !== 'summary' && (
                <div className="space-y-2">
                  <Label htmlFor="report-ward">Ward (Optional)</Label>
                  <select
                    id="report-ward"
                    className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                    value={generateWardId}
                    onChange={(e) => setGenerateWardId(e.target.value)}
                  >
                    <option value="all">All Wards</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <Info className="h-4 w-4 inline mr-2" />
                  This report will include data from all wards in your zone.
                  {generateType !== 'summary' && generateWardId !== 'all' && 
                    ` Only data from the selected ward will be included.`}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate
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