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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface Ward {
  id: string;
  name: string;
  zoneId: string;
  zoneName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  standardWardId?: string;
  pollingUnitCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Zone {
  id: string;
  name: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  zoneId: string;
  stateId: string;
  lgaId: string;
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminWardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    zoneId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    zoneId: 'all',
    stateId: 'all',
    lgaId: 'all',
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
  const [zones, setZones] = useState<Zone[]>([]);
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [lgas, setLgas] = useState<{ id: string; name: string }[]>([]);


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

      const [zonesRes, statesRes, lgasRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/system/zones?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        }),
        fetch(`${API_BASE_URL}/admin/system/states?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        }),
        fetch(`${API_BASE_URL}/admin/system/lgas?limit=1000`, {
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

      if (lgasRes.ok) {
        const data = await lgasRes.json();
        if (data.lgas) {
          setLgas(data.lgas);
        } else if (data.data) {
          setLgas(data.data);
        } else if (Array.isArray(data)) {
          setLgas(data);
        }
      }

    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL]);

  const fetchWards = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.zoneId && currentFilters.zoneId !== 'all') params.append('zoneId', currentFilters.zoneId);
      if (currentFilters.stateId && currentFilters.stateId !== 'all') params.append('stateId', currentFilters.stateId);
      if (currentFilters.lgaId && currentFilters.lgaId !== 'all') params.append('lgaId', currentFilters.lgaId);

      setIsLoadingMore(pageNum > 1);

      const url = `/admin/system/wards?${params.toString()}`;
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
          setWards(data.data);
        } else {
          setWards(prev => [...prev, ...data.data]);
        }
        
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error(data.message || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching wards:', error);
      setError(error.message || 'Failed to load wards');
      toast({
        title: "Error",
        description: error.message || "Failed to load wards",
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
        fetchWards(1, filters, limit),
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
  }, [filters, fetchWards, fetchOptions, toast, limit]);

  // ============================================
  // CRUD HANDLERS
  // ============================================

  const handleCreateWard = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      if (!formData.name.trim()) {
        setFormError('Ward name is required');
        return;
      }

      if (!formData.zoneId) {
        setFormError('Please select a zone');
        return;
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/wards`, {
        method: 'POST',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          name: formData.name.trim(),
          zoneId: formData.zoneId,
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Ward Created",
          description: `Ward "${formData.name}" has been created successfully.`,
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to create ward');
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to create ward');
      toast({
        title: "Error",
        description: error.message || "Failed to create ward",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWard = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      if (!selectedWard) return;

      if (!formData.name.trim()) {
        setFormError('Ward name is required');
        return;
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/wards/${selectedWard.id}`, {
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

      if (data.success || data.message) {
        toast({
          title: "✅ Ward Updated",
          description: `Ward has been updated successfully.`,
        });
        setIsEditDialogOpen(false);
        resetForm();
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to update ward');
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to update ward');
      toast({
        title: "Error",
        description: error.message || "Failed to update ward",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWard = async () => {
    try {
      if (!selectedWard) return;

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/wards/${selectedWard.id}`, {
        method: 'DELETE',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      const data = await response.json();

      if (data.success || data.message) {
        toast({
          title: "🗑️ Ward Deleted",
          description: `Ward "${selectedWard.name}" has been deleted successfully.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedWard(null);
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to delete ward');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ward",
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
      zoneId: '',
    });
    setFormError(null);
    setSelectedWard(null);
  };

  const openEditDialog = (ward: Ward) => {
    setSelectedWard(ward);
    setFormData({
      name: ward.name,
      zoneId: ward.zoneId,
    });
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (ward: Ward) => {
    setSelectedWard(ward);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (ward: Ward) => {
    setSelectedWard(ward);
    setIsViewDialogOpen(true);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setWards([]);
    fetchWards(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setWards([]);
    fetchWards(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWards(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setWards([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      zoneId: 'all',
      stateId: 'all',
      lgaId: 'all',
    };
    setFilters(resetFilters);
    setPage(1);
    setWards([]);
    fetchWards(1, resetFilters, limit);
  };

  const handleExport = () => {
    const headers = ['Name', 'Zone', 'State', 'LGA', 'Polling Units', 'Created At'];
    const rows = wards.map(ward => [
      ward.name,
      ward.zoneName || 'N/A',
      ward.stateName || 'N/A',
      ward.lgaName || 'N/A',
      ward.pollingUnitCount || 0,
      formatDate(ward.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wards-${new Date().toISOString().split('T')[0]}.csv`;
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

  const hasActiveFilters = filters.search || 
    (filters.zoneId && filters.zoneId !== 'all') ||
    (filters.stateId && filters.stateId !== 'all') ||
    (filters.lgaId && filters.lgaId !== 'all');

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="🏛️ Wards"
          subtitle="System Admin View - Manage All Wards"
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
        title="🏛️ Wards"
        subtitle="System Admin View - Manage All Wards"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ward name, zone..."
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
                Add Ward
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.zoneId}
                  onChange={(e) => handleFilterChange('zoneId', e.target.value)}
                >
                  <option value="all">All Zones</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </div>
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
              <div>
                <Label className="text-xs text-muted-foreground">LGA</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.lgaId}
                  onChange={(e) => handleFilterChange('lgaId', e.target.value)}
                >
                  <option value="all">All LGAs</option>
                  {lgas.map((lga) => (
                    <option key={lga.id} value={lga.id}>{lga.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Wards Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Wards
              </CardTitle>
              <CardDescription>
                {wards.length === 0 ? 'No wards found' :
                  `Showing ${wards.length} of ${pagination.total || wards.length} wards`}
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
            {wards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No wards found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all wards
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
                        <TableHead>Zone</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>LGA</TableHead>
                        <TableHead>Polling Units</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wards.map((ward) => (
                        <TableRow key={ward.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{ward.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ward.zoneName || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{ward.stateName || 'N/A'}</TableCell>
                          <TableCell>{ward.lgaName || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {formatNumber(ward.pollingUnitCount || 0)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(ward.createdAt)}
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
                                <DropdownMenuItem onClick={() => openViewDialog(ward)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(ward)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(ward)}
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
                      Showing {wards.length} of {pagination.total} wards
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
                          setWards([]);
                          fetchWards(prevPage, filters, limit);
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

        {/* View Ward Dialog */}
        <Dialog open={isViewDialogOpen && selectedWard !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ward Details
              </DialogTitle>
              <DialogDescription>
                {selectedWard?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedWard && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedWard.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Zone</Label>
                    <p className="font-medium">{selectedWard.zoneName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">State</Label>
                    <p className="font-medium">{selectedWard.stateName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">LGA</Label>
                    <p className="font-medium">{selectedWard.lgaName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Polling Units</Label>
                    <p className="font-medium">{formatNumber(selectedWard.pollingUnitCount || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">{formatDate(selectedWard.createdAt)}</p>
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

        {/* Create Ward Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Ward
              </DialogTitle>
              <DialogDescription>
                Add a new ward to the system
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
                <Label htmlFor="wardName">Ward Name *</Label>
                <Input
                  id="wardName"
                  placeholder="Enter ward name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="zoneId">Zone *</Label>
                <select
                  id="zoneId"
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                  value={formData.zoneId}
                  onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                >
                  <option value="">Select a zone...</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateWard} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Ward
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Ward Dialog */}
        <Dialog open={isEditDialogOpen && selectedWard !== null} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Ward
              </DialogTitle>
              <DialogDescription>
                Update ward details
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
                <Label htmlFor="editWardName">Ward Name *</Label>
                <Input
                  id="editWardName"
                  placeholder="Enter ward name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editZoneId">Zone</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {zones.find(z => z.id === selectedWard?.zoneId)?.name || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Zone cannot be changed after creation</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateWard} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Ward
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Ward Dialog */}
        <Dialog open={isDeleteDialogOpen && selectedWard !== null} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Ward
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this ward?
              </DialogDescription>
            </DialogHeader>

            {selectedWard && (
              <div className="py-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <span className="font-bold">Ward:</span> {selectedWard.name}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    This action cannot be undone. All associated polling units will be affected.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteWard}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Ward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}