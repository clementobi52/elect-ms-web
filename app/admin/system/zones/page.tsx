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
import {
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
  Plus,
  Save,
  AlertTriangle,
  Globe,
  Map,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface Zone {
  id: string;
  name: string;
  stateId?: string;
  stateName?: string;
  stateCode?: string;
  pollingUnitCount: number | string;
  wardCount: number | string;
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
  stateId: string;
}

// ============================================
// HELPERS
// ============================================

const formatNumber = (num: any) => {
  if (num === null || num === undefined) return '0';
  const parsed = typeof num === 'string' ? parseInt(num) : num;
  if (isNaN(parsed)) return '0';
  return parsed.toLocaleString();
};

const formatDate = (date: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminZonesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    stateId: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

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
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);


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

      const statesRes = await fetch(`${API_BASE_URL}/admin/system/states?limit=1000`, {
        headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
      });

      if (statesRes.ok) {
        const data = await statesRes.json();
        if (data.states) {
          setStates(data.states);
        } else if (data.data) {
          setStates(data.data);
        } else if (Array.isArray(data)) {
          setStates(data);
        }
      }

    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL]);

  const fetchZones = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.stateId && currentFilters.stateId !== 'all') params.append('stateId', currentFilters.stateId);

      setIsLoadingMore(pageNum > 1);

      const url = `/admin/system/zones/paginated?${params.toString()}`;
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

      if (data.success && data.data) {
        if (pageNum === 1) {
          setZones(data.data);
        } else {
          setZones(prev => [...prev, ...data.data]);
        }
        
        setPagination({
          total: data.total || data.data?.length || 0,
          page: data.currentPage || pageNum,
          limit: data.limit || currentLimit,
          totalPages: data.totalPages || 1
        });
      } else if (Array.isArray(data)) {
        if (pageNum === 1) {
          setZones(data);
        } else {
          setZones(prev => [...prev, ...data]);
        }
        setPagination({
          total: data.length,
          page: pageNum,
          limit: currentLimit,
          totalPages: Math.ceil(data.length / currentLimit)
        });
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      setError(error.message || 'Failed to load zones');
      toast({
        title: "Error",
        description: error.message || "Failed to load zones",
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
        fetchZones(1, filters, limit),
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
  }, [filters, fetchZones, fetchOptions, toast, limit]);

  // ============================================
  // CRUD HANDLERS
  // ============================================

  const handleCreateZone = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      if (!formData.name.trim()) {
        setFormError('Zone name is required');
        return;
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/zones`, {
        method: 'POST',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          name: formData.name.trim(),
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Zone Created",
          description: `Zone "${formData.name}" has been created successfully.`,
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to create zone');
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to create zone');
      toast({
        title: "Error",
        description: error.message || "Failed to create zone",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateZone = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      if (!selectedZone) return;

      if (!formData.name.trim()) {
        setFormError('Zone name is required');
        return;
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/zones/${selectedZone.id}`, {
        method: 'PUT',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          name: formData.name.trim(),
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Zone Updated",
          description: `Zone has been updated successfully.`,
        });
        setIsEditDialogOpen(false);
        resetForm();
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to update zone');
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to update zone');
      toast({
        title: "Error",
        description: error.message || "Failed to update zone",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteZone = async () => {
    try {
      if (!selectedZone) return;

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/zones/${selectedZone.id}`, {
        method: 'DELETE',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "🗑️ Zone Deleted",
          description: `Zone "${selectedZone.name}" has been deleted successfully.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedZone(null);
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to delete zone');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete zone",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // UI HANDLERS
  // ============================================

  const resetForm = () => {
    setFormData({
      name: '',
    });
    setFormError(null);
    setSelectedZone(null);
  };

  const openEditDialog = (zone: Zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
    });
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (zone: Zone) => {
    setSelectedZone(zone);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (zone: Zone) => {
    setSelectedZone(zone);
    setIsViewDialogOpen(true);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setZones([]);
    fetchZones(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setZones([]);
    fetchZones(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchZones(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setZones([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      stateId: 'all',
    };
    setFilters(resetFilters);
    setPage(1);
    setZones([]);
    fetchZones(1, resetFilters, limit);
  };

  const handleExport = () => {
    const headers = ['Name', 'State', 'Wards', 'Polling Units', 'Created At'];
    const rows = zones.map(zone => [
      zone.name,
      zone.stateName || 'N/A',
      formatNumber(zone.wardCount),
      formatNumber(zone.pollingUnitCount),
      formatDate(zone.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zones-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate stats with proper number formatting
  const stats = useMemo(() => {
    const totalZones = pagination.total || zones.length;
    const totalWards = zones.reduce((sum, z) => sum + (parseInt(String(z.wardCount)) || 0), 0);
    const totalPollingUnits = zones.reduce((sum, z) => sum + (parseInt(String(z.pollingUnitCount)) || 0), 0);
    const uniqueStates = new Set(zones.map(z => z.stateId).filter(Boolean)).size;

    return {
      totalZones,
      totalWards,
      totalPollingUnits,
      uniqueStates
    };
  }, [zones, pagination]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchData(true);
  }, []);

  // ============================================
  // MEMOIZED VALUES
  // ============================================

  const hasActiveFilters = filters.search || 
    (filters.stateId && filters.stateId !== 'all');

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="🗺️ Zones"
          subtitle="System Admin View - Manage All Zones"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
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
        title="🗺️ Zones"
        subtitle="System Admin View - Manage All Zones"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Zones</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.totalZones)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Map className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Wards</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.totalWards)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Polling Units</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.totalPollingUnits)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">States</p>
                  <p className="text-2xl font-bold text-orange-900">{formatNumber(stats.uniqueStates)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-orange-700" />
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
                placeholder="Search by zone name, state..."
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
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">State</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.stateId}
                  onChange={(e) => handleFilterChange('stateId', e.target.value)}
                >
                  <option value="all">All States</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>{state.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Zones Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Zones
              </CardTitle>
              <CardDescription>
                {zones.length === 0 ? 'No zones found' :
                  `Showing ${zones.length} of ${pagination.total || zones.length} zones`}
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
                Total: {formatNumber(pagination.total)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Map className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No zones found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all zones
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Wards</TableHead>
                        <TableHead>Polling Units</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Map className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{zone.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{zone.stateName || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {formatNumber(zone.wardCount)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {formatNumber(zone.pollingUnitCount)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(zone.createdAt)}
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
                                <DropdownMenuItem onClick={() => openViewDialog(zone)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(zone)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(zone)}
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
                      Showing {zones.length} of {formatNumber(pagination.total)} zones
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
                          setZones([]);
                          fetchZones(prevPage, filters, limit);
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

        {/* View Zone Dialog */}
        <Dialog open={isViewDialogOpen && selectedZone !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Zone Details
              </DialogTitle>
              <DialogDescription>
                {selectedZone?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedZone && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedZone.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">State</Label>
                    <p className="font-medium">{selectedZone.stateName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Wards</Label>
                    <p className="font-medium">{formatNumber(selectedZone.wardCount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Polling Units</Label>
                    <p className="font-medium">{formatNumber(selectedZone.pollingUnitCount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">{formatDate(selectedZone.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Updated</Label>
                    <p className="font-medium">{formatDate(selectedZone.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Zone Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Zone
              </DialogTitle>
              <DialogDescription>
                Add a new zone to the system
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <Label htmlFor="zoneName">Zone Name *</Label>
                <Input
                  id="zoneName"
                  placeholder="Enter zone name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateZone} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Zone
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Zone Dialog */}
        <Dialog open={isEditDialogOpen && selectedZone !== null} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Zone
              </DialogTitle>
              <DialogDescription>
                Update zone details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <Label htmlFor="editZoneName">Zone Name *</Label>
                <Input
                  id="editZoneName"
                  placeholder="Enter zone name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateZone} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Zone
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Zone Dialog */}
        <Dialog open={isDeleteDialogOpen && selectedZone !== null} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Zone
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this zone?
              </DialogDescription>
            </DialogHeader>

            {selectedZone && (
              <div className="py-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <span className="font-bold">Zone:</span> {selectedZone.name}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    This will also delete all associated wards and polling units.
                  </p>
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteZone}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Zone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}