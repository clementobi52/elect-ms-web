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
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Layers,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Upload,
  FileSpreadsheet,
  UserPlus,
  UserX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';
import {
  fetchPollingUnits,
  fetchUnassignedPollingUnits,
  updatePollingUnit,
  deletePollingUnit,
  bulkImportPollingUnits,
  fetchZonesPaginated,
  fetchWardsPaginated,
  fetchAllData,
} from '@/lib/system-admin/api';

// ============================================
// TYPES
// ============================================

interface PollingUnit {
  id: string;
  name: string;
  code: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  registeredVoters?: number;
  agentId?: string;
  agentName?: string;
  agentStatus?: 'Online' | 'Offline' | null;
  resultStatus?: 'Verified' | 'Pending' | 'Rejected' | null;
  hasResults?: boolean;
  createdAt: string;
  updatedAt: string;
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
  ward: string;
  state: string;
  lga: string;
  hasAgent: string;
  hasResults: string;
  status: string;
  sortBy: string;
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

// ============================================
// HELPERS
// ============================================

const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0';
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
};

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

// ============================================
// MAIN COMPONENT
// ============================================

export default function SystemPollingUnitsPage() {
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignAgentDialogOpen, setIsAssignAgentDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PollingUnit>>({});
  const [assignAgentForm, setAssignAgentForm] = useState({
    agentId: '',
    pollingUnitId: '',
  });
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);

  // Stats
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

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    zone: 'all',
    ward: 'all',
    state: 'all',
    lga: 'all',
    hasAgent: 'all',
    hasResults: 'all',
    status: 'all',
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

  // Options for selects
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);


  // ============================================
  // HELPER - Calculate Stats from Data
  // ============================================

  // ✅ Define this function before it's used
  const calculateStatsFromData = useCallback((data: PollingUnit[]) => {
    if (!data || data.length === 0) {
      return {
        total: 0,
        withAgents: 0,
        withoutAgents: 0,
        withResults: 0,
        withoutResults: 0,
        verifiedResults: 0,
        pendingResults: 0,
        rejectedResults: 0,
      };
    }

    const withAgents = data.filter(pu => pu.agentId).length;
    const withoutAgents = data.length - withAgents;
    const withResults = data.filter(pu => pu.hasResults).length;
    const withoutResults = data.length - withResults;
    const verifiedResults = data.filter(pu => pu.resultStatus === 'Verified').length;
    const pendingResults = data.filter(pu => pu.resultStatus === 'Pending').length;
    const rejectedResults = data.filter(pu => pu.resultStatus === 'Rejected').length;

    return {
      total: data.length,
      withAgents,
      withoutAgents,
      withResults,
      withoutResults,
      verifiedResults,
      pendingResults,
      rejectedResults,
    };
  }, []);

  // ============================================
  // API FUNCTIONS
  // ============================================

  // fetchAllData fans out five requests, two of them large: wards?limit=1000 is
  // about 460kb and polling-units?limit=1000 about 800kb. This page used to
  // call it twice on a single mount - once from fetchOptions for `users`, once
  // from fetchStatsData for `stats` - so ten requests went out and the same
  // megabyte was downloaded twice. Both callers read different slices of one
  // response, so the request is shared and the in-flight promise reused.
  const allDataRef = useRef<Promise<any> | null>(null);

  const loadAllData = useCallback(() => {
    if (!allDataRef.current) {
      allDataRef.current = fetchAllData(API_BASE_URL).catch((error) => {
        // Don't cache a failure; a later mount should be able to retry.
        allDataRef.current = null;
        throw error;
      });
    }
    return allDataRef.current;
  }, [API_BASE_URL]);

  const fetchOptions = useCallback(async () => {
    try {
      const zonesData = await fetchZonesPaginated(API_BASE_URL, 1);
      if (zonesData.data) {
        setZones(zonesData.data.map((z: any) => ({ id: z.id, name: z.name })));
      }

      const wardsData = await fetchWardsPaginated(API_BASE_URL, 1, { limit: 1000 });
      if (wardsData.data) {
        setWards(wardsData.data.map((w: any) => ({ id: w.id, name: w.name })));
      }

      const allData = await loadAllData();
      if (allData.users) {
        const agents = allData.users.filter((u: any) => u.role === 'Polling Agent');
        setAvailableAgents(agents);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL, loadAllData]);

  // app/admin/system/polling-units/page.tsx - Update fetchStatsData

const fetchStatsData = useCallback(async () => {
  try {
    // Shared with fetchOptions, so a mount issues this once rather than twice.
    const data = await loadAllData();
    console.log('📊 Stats from shared all-data request:', data.stats);
    
    const statsData = data.stats || {};
    
    // ✅ Get the correct values
    const totalPollingUnits = statsData.totalPollingUnits || 0;
    const totalAgents = statsData.totalAgents || 0;
    
    // ✅ These should come from ElectionResults
    const totalResults = statsData.totalResults || 0;
    const verifiedResults = statsData.verifiedResults || 0;
    const pendingResults = statsData.pendingResults || 0;
    const rejectedResults = statsData.rejectedResults || 0;
    
    console.log('📊 Stats Breakdown:', {
      totalPollingUnits,
      totalAgents,
      totalResults,
      verifiedResults,
      pendingResults,
      rejectedResults,
    });
    
    // ✅ Use the actual values
    setStats({
      total: totalPollingUnits,
      withAgents: totalAgents,
      withoutAgents: totalPollingUnits - totalAgents,
      withResults: totalResults,  // ✅ Should be 5
      withoutResults: totalPollingUnits - totalResults,
      verifiedResults: verifiedResults,  // ✅ Should be 4
      pendingResults: pendingResults,    // ✅ Should be 1
      rejectedResults: rejectedResults || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Fallback: calculate from current data
    if (pollingUnits.length > 0) {
      const calculated = calculateStatsFromData(pollingUnits);
      setStats(calculated);
    }
  }
}, [API_BASE_URL, pollingUnits, calculateStatsFromData, loadAllData]);

  const fetchPollingUnitsData = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const queryFilters: any = {
        limit: currentLimit,
      };
      
      if (currentFilters.search) queryFilters.search = currentFilters.search;
      if (currentFilters.zone !== 'all') queryFilters.zoneId = currentFilters.zone;
      if (currentFilters.ward !== 'all') queryFilters.wardId = currentFilters.ward;
      if (currentFilters.state !== 'all') queryFilters.stateId = currentFilters.state;
      if (currentFilters.lga !== 'all') queryFilters.lgaId = currentFilters.lga;
      if (currentFilters.hasAgent !== 'all') queryFilters.hasAgent = currentFilters.hasAgent;
      if (currentFilters.hasResults !== 'all') queryFilters.hasResults = currentFilters.hasResults;
      if (currentFilters.status !== 'all') queryFilters.status = currentFilters.status;

      setIsLoadingMore(pageNum > 1);

      const response = await fetchPollingUnits(API_BASE_URL, pageNum, queryFilters);
      
      console.log('📊 Full API Response:', response);

      if (response.success && response.data) {
        if (pageNum === 1) {
          setPollingUnits(response.data);
        } else {
          setPollingUnits(prev => [...prev, ...response.data]);
        }
        
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching polling units:', error);
      const offline = isNetworkError(error);
      const message = offline ? SERVER_OFFLINE_MESSAGE : 'Failed to load polling units';
      setError(message);
      toast({
        title: offline ? 'Server Offline' : 'Error',
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [API_BASE_URL, limit, filters, toast]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    // An explicit refresh should re-fetch the shared payload rather than reuse
    // the one cached from the last mount.
    allDataRef.current = null;

    try {
      await Promise.all([
        fetchStatsData(),
        fetchPollingUnitsData(1, filters, limit),
        fetchOptions(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      const offline = isNetworkError(error);
      const message = offline ? SERVER_OFFLINE_MESSAGE : 'Failed to load data';
      setError(message);
      toast({
        title: offline ? 'Server Offline' : 'Error',
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, fetchPollingUnitsData, fetchOptions, fetchStatsData, toast, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnitsData(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnitsData(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPollingUnitsData(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setPollingUnits([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      zone: 'all',
      ward: 'all',
      state: 'all',
      lga: 'all',
      hasAgent: 'all',
      hasResults: 'all',
      status: 'all',
      sortBy: 'name',
    };
    setFilters(resetFilters);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnitsData(1, resetFilters, limit);
  };

  const handleViewPollingUnit = (unit: PollingUnit) => {
    setSelectedUnit(unit);
    setIsViewDialogOpen(true);
  };

  const handleEditPollingUnit = (unit: PollingUnit) => {
    setSelectedUnit(unit);
    setEditForm(unit);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUnit) return;

    try {
      const response = await updatePollingUnit(API_BASE_URL, selectedUnit.id, editForm);
      if (response.success) {
        toast({
          title: "✅ Polling Unit Updated",
          description: "Polling unit has been updated successfully.",
        });
        setIsEditDialogOpen(false);
        fetchData(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update polling unit",
        variant: "destructive",
      });
    }
  };

  const handleDeletePollingUnit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this polling unit? This action cannot be undone.')) return;

    try {
      const response = await deletePollingUnit(API_BASE_URL, id);
      if (response.success) {
        toast({
          title: "🗑️ Polling Unit Deleted",
          description: "Polling unit has been deleted successfully.",
        });
        fetchData(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete polling unit",
        variant: "destructive",
      });
    }
  };

  const handleAssignAgent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/system/polling-units/assign-agent`, {
        method: 'POST',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(assignAgentForm),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "✅ Agent Assigned",
            description: "Agent has been assigned to polling unit successfully.",
          });
          setIsAssignAgentDialogOpen(false);
          setAssignAgentForm({ agentId: '', pollingUnitId: '' });
          fetchData(false);
        } else {
          throw new Error(data.message || 'Failed to assign agent');
        }
      } else {
        throw new Error('Failed to assign agent');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign agent",
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async () => {
    try {
      let units;
      try {
        units = JSON.parse(bulkImportData);
      } catch (e) {
        toast({
          title: "Error",
          description: "Invalid JSON format. Please check your data.",
          variant: "destructive",
        });
        return;
      }

      if (!Array.isArray(units) || units.length === 0) {
        toast({
          title: "Error",
          description: "Please provide an array of polling units.",
          variant: "destructive",
        });
        return;
      }

      setImporting(true);
      const response = await bulkImportPollingUnits(API_BASE_URL, units);
      
      if (response.success) {
        toast({
          title: "✅ Bulk Import Successful",
          description: `Imported ${units.length} polling units successfully.`,
        });
        setIsBulkImportDialogOpen(false);
        setBulkImportData('');
        fetchData(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import polling units",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Code', 'Ward', 'Zone', 'Agent', 'Status', 'Results', 'Created'];
    const rows = pollingUnits.map(pu => [
      pu.name,
      pu.code,
      pu.wardName || '',
      pu.zoneName || '',
      pu.agentName || 'Unassigned',
      pu.agentStatus || 'Unassigned',
      pu.resultStatus || 'Not Submitted',
      formatDate(pu.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polling-units-${new Date().toISOString().split('T')[0]}.csv`;
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
    return Array.from(new Set(pollingUnits.map(pu => pu.zoneName))).filter(Boolean);
  }, [pollingUnits]);

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(pollingUnits.map(pu => pu.wardName))).filter(Boolean);
  }, [pollingUnits]);

  const hasActiveFilters = filters.search || 
    filters.zone !== 'all' || 
    filters.ward !== 'all' ||
    filters.state !== 'all' ||
    filters.lga !== 'all' ||
    filters.hasAgent !== 'all' ||
    filters.hasResults !== 'all' ||
    filters.status !== 'all';

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="📋 Polling Units"
          subtitle="System Admin View - All Polling Units"
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
        title="📋 Polling Units"
        subtitle="System Admin View - All Polling Units"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Units</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-700" />
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
                  <Users className="h-5 w-5 text-green-700" />
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
                  <CheckCircle className="h-5 w-5 text-yellow-700" />
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
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.verifiedResults)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-red-900">{formatNumber(stats.pendingResults)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-red-700" />
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
                placeholder="Search by name, code, or ward..."
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
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAssignAgentForm({ agentId: '', pollingUnitId: '' });
                  setIsAssignAgentDialogOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Agent
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
                <Label className="text-xs text-muted-foreground">Has Agent</Label>
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
                <Label className="text-xs text-muted-foreground">Has Results</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.hasResults}
                  onChange={(e) => handleFilterChange('hasResults', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="true">Has Results</option>
                  <option value="false">No Results</option>
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
                <MapPin className="h-5 w-5" />
                Polling Units
              </CardTitle>
              <CardDescription>
                {pollingUnits.length === 0 ? 'No polling units found' :
                  `Showing ${pollingUnits.length} of ${pagination.total || pollingUnits.length} units`}
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
            {pollingUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No polling units found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all units
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name / Code</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Voters</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pollingUnits.map((unit) => (
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
                              {getStatusDot(unit.agentStatus || '')}
                              {getStatusBadge(unit.agentStatus || '')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getResultStatusBadge(unit.resultStatus || '')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatNumber(unit.registeredVoters || 0)}
                            </Badge>
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
                                <DropdownMenuItem onClick={() => handleViewPollingUnit(unit)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditPollingUnit(unit)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {!unit.agentId && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setAssignAgentForm({
                                        agentId: '',
                                        pollingUnitId: unit.id,
                                      });
                                      setIsAssignAgentDialogOpen(true);
                                    }}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign Agent
                                  </DropdownMenuItem>
                                )}
                                {unit.agentId && (
                                  <DropdownMenuItem className="text-orange-600">
                                    <UserX className="h-4 w-4 mr-2" />
                                    Unassign Agent
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeletePollingUnit(unit.id)}
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
                      Showing {pollingUnits.length} of {pagination.total} units
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
                          fetchPollingUnitsData(prevPage, filters, limit);
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
                <MapPin className="h-5 w-5" />
                Polling Unit Details
              </DialogTitle>
              <DialogDescription>
                {selectedUnit?.name} - {selectedUnit?.code}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedUnit && (
                <div className="space-y-4 py-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Registered Voters</Label>
                      <p className="font-medium">{formatNumber(selectedUnit.registeredVoters || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{selectedUnit.address || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Agent</Label>
                      <p className="font-medium">{selectedUnit.agentName || 'Unassigned'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Agent Status</Label>
                      <div className="flex items-center mt-1">
                        {getStatusDot(selectedUnit.agentStatus || '')}
                        {getStatusBadge(selectedUnit.agentStatus || '')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Result Status</Label>
                    <div className="mt-1">
                      {getResultStatusBadge(selectedUnit.resultStatus || '')}
                    </div>
                  </div>

                  {(selectedUnit.latitude || selectedUnit.longitude) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Latitude</Label>
                        <p className="font-medium">{selectedUnit.latitude || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Longitude</Label>
                        <p className="font-medium">{selectedUnit.longitude || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedUnit.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedUnit.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedUnit && !selectedUnit.agentId && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    setAssignAgentForm({
                      agentId: '',
                      pollingUnitId: selectedUnit.id,
                    });
                    setIsAssignAgentDialogOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Agent
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Polling Unit Dialog */}
        <Dialog open={isEditDialogOpen && selectedUnit !== null} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Polling Unit
              </DialogTitle>
              <DialogDescription>
                Update polling unit details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={editForm.code || ''}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Registered Voters</Label>
                <Input
                  type="number"
                  value={editForm.registeredVoters || 0}
                  onChange={(e) => setEditForm({ ...editForm, registeredVoters: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editForm.latitude || ''}
                    onChange={(e) => setEditForm({ ...editForm, latitude: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editForm.longitude || ''}
                    onChange={(e) => setEditForm({ ...editForm, longitude: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>
              <div>
                <Label>Ward</Label>
                <Select
                  value={editForm.wardId || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, wardId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Agent Dialog */}
        <Dialog open={isAssignAgentDialogOpen} onOpenChange={setIsAssignAgentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign Agent
              </DialogTitle>
              <DialogDescription>
                Assign an agent to a polling unit
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Polling Unit</Label>
                <Select
                  value={assignAgentForm.pollingUnitId}
                  onValueChange={(value) => setAssignAgentForm({ ...assignAgentForm, pollingUnitId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select polling unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {pollingUnits
                      .filter(pu => !pu.agentId)
                      .map((pu) => (
                        <SelectItem key={pu.id} value={pu.id}>
                          {pu.name} ({pu.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agent</Label>
                <Select
                  value={assignAgentForm.agentId}
                  onValueChange={(value) => setAssignAgentForm({ ...assignAgentForm, agentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignAgentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignAgent}>
                Assign Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Import Polling Units
              </DialogTitle>
              <DialogDescription>
                Import multiple polling units at once using JSON format
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>JSON Data</Label>
                <Textarea
                  className="font-mono text-sm"
                  placeholder={`[
  {
    "name": "Polling Unit 1",
    "code": "PU001",
    "wardId": "ward-uuid-here",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "registeredVoters": 500
  }
]`}
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  rows={10}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Required fields: name, code, wardId</p>
                <p>Optional fields: latitude, longitude, registeredVoters, address</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
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