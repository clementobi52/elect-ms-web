// app/admin/zone/wards/page.tsx
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
  AlertTriangle,
  Building2,
  MapPin,
  Users,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  MoreVertical,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';

// Types
interface Ward {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zoneName: string;
  pollingUnits: number;
  agents: number;
  activeAgents: number;
  resultsSubmitted: number;
  pendingResults: number;
  incidents: number;
  adminName?: string;
  adminId?: string;
  adminEmail?: string;
  progress: number;
  createdAt?: string;
  updatedAt?: string;
}

interface WardStats {
  totalWards: number;
  totalPollingUnits: number;
  totalAgents: number;
  activeAgents: number;
  totalResults: number;
  pendingResults: number;
  verifiedResults: number;
  totalIncidents: number;
  criticalIncidents: number;
  averageProgress: number;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Progress Bar Component
function ProgressBar({ 
  value, 
  className = '', 
  indicatorClassName = 'bg-primary',
  ...props 
}: { 
  value: number; 
  className?: string; 
  indicatorClassName?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-primary/20 ${className}`}
      {...props}
    >
      <div
        className={`h-full rounded-full transition-all ${indicatorClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function ZoneWardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [stats, setStats] = useState<WardStats>({
    totalWards: 0,
    totalPollingUnits: 0,
    totalAgents: 0,
    activeAgents: 0,
    totalResults: 0,
    pendingResults: 0,
    verifiedResults: 0,
    totalIncidents: 0,
    criticalIncidents: 0,
    averageProgress: 0,
  });
  const [zoneName, setZoneName] = useState<string>('');

  // Fetch wards with pagination
  const fetchWards = useCallback(async (pageNum: number = 1, search: string = '') => {
    try {
      const zoneId = user?.zoneId;
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      setIsLoadingMore(pageNum > 1);

      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);

      const response = await apiClient.get<{ 
        success: boolean; 
        wards: any[]; 
        pagination: PaginationData;
      }>(
        `/admin/zone/${zoneId}/wards?${params.toString()}`
      );
      
      console.log('📡 Wards Response:', response);

      if (response.success && response.wards) {
        // ✅ Map the data properly
        const mappedWards: Ward[] = response.wards.map((ward: any) => ({
          id: ward.id || '',
          name: ward.name || 'Unknown Ward',
          code: ward.code || `W-${ward.id?.slice(0, 4) || '0000'}`,
          zoneId: ward.zoneId || zoneId,
          zoneName: ward.zoneName || ward.zone?.name || zoneName || 'Unknown Zone',
          // ✅ Use the correct field names from your API
          pollingUnits: ward.pollingUnits || ward.polling_unit_count || ward.totalPollingUnits || 0,
          agents: ward.agents || ward.agentCount || ward.totalAgents || 0,
          activeAgents: ward.activeAgents || ward.active_agents || 0,
          resultsSubmitted: ward.resultsSubmitted || ward.results_submitted || ward.totalResults || 0,
          pendingResults: ward.pendingResults || ward.pending_results || 0,
          incidents: ward.incidents || ward.incidentCount || ward.totalIncidents || 0,
          adminName: ward.adminName || ward.admin?.name || null,
          adminId: ward.adminId || ward.admin?.id || null,
          adminEmail: ward.adminEmail || ward.admin?.email || null,
          progress: ward.progress || ward.completionRate || 0,
          createdAt: ward.createdAt,
          updatedAt: ward.updatedAt
        }));

        console.log('📡 Mapped wards sample:', mappedWards[0]);

        if (pageNum === 1) {
          setWards(mappedWards);
        } else {
          setWards(prev => [...prev, ...mappedWards]);
        }
        
        if (response.pagination) {
          setPagination(response.pagination);
        }
        
        // ✅ Calculate stats from mapped wards
        calculateStats(mappedWards);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  }, [user?.zoneId, limit, zoneName]);

  // Calculate stats
  const calculateStats = useCallback((wardList: Ward[]) => {
    console.log('📊 Calculating stats from:', wardList.length, 'wards');
    
    if (wardList.length === 0) {
      setStats({
        totalWards: 0,
        totalPollingUnits: 0,
        totalAgents: 0,
        activeAgents: 0,
        totalResults: 0,
        pendingResults: 0,
        verifiedResults: 0,
        totalIncidents: 0,
        criticalIncidents: 0,
        averageProgress: 0,
      });
      return;
    }

    // Log sample data
    console.log('📊 Sample ward data:', {
      pollingUnits: wardList[0].pollingUnits,
      agents: wardList[0].agents,
      activeAgents: wardList[0].activeAgents,
      resultsSubmitted: wardList[0].resultsSubmitted,
      incidents: wardList[0].incidents,
      progress: wardList[0].progress
    });

    const totalPollingUnits = wardList.reduce((sum, w) => sum + (Number(w.pollingUnits) || 0), 0);
    const totalAgents = wardList.reduce((sum, w) => sum + (Number(w.agents) || 0), 0);
    const activeAgents = wardList.reduce((sum, w) => sum + (Number(w.activeAgents) || 0), 0);
    const totalResults = wardList.reduce((sum, w) => sum + (Number(w.resultsSubmitted) || 0), 0);
    const pendingResults = wardList.reduce((sum, w) => sum + (Number(w.pendingResults) || 0), 0);
    const totalIncidents = wardList.reduce((sum, w) => sum + (Number(w.incidents) || 0), 0);
    
    const criticalIncidents = wardList.filter(w => (Number(w.incidents) || 0) > 0).length;
    
    const totalProgress = wardList.reduce((sum, w) => sum + (Number(w.progress) || 0), 0);
    const averageProgress = wardList.length > 0 
      ? Math.round(totalProgress / wardList.length)
      : 0;

    const verifiedResults = Math.max(0, totalResults - pendingResults);

    const newStats: WardStats = {
      totalWards: wardList.length,
      totalPollingUnits,
      totalAgents,
      activeAgents,
      totalResults,
      pendingResults,
      verifiedResults,
      totalIncidents,
      criticalIncidents,
      averageProgress,
    };

    console.log('📊 Calculated stats:', newStats);
    setStats(newStats);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      console.log('📡 Fetching wards for zone:', zoneId);

      // Fetch wards with pagination
      await fetchWards(1, searchTerm);

      // ✅ Also fetch zone stats for accurate numbers
      try {
        const statsResponse = await apiClient.get<{ success: boolean; stats: any }>(
          `/admin/zone/${zoneId}/stats`
        );
        
        console.log('📡 Zone Stats Response:', statsResponse);
        
        if (statsResponse.success && statsResponse.stats) {
          const s = statsResponse.stats;
          setStats(prev => ({
            ...prev,
            totalPollingUnits: s.totalPollingUnits || prev.totalPollingUnits,
            totalAgents: s.totalAgents || prev.totalAgents,
            activeAgents: s.activeAgents || prev.activeAgents,
            totalResults: s.totalResults || prev.totalResults,
            pendingResults: s.pendingResults || prev.pendingResults,
            totalIncidents: s.totalIncidents || prev.totalIncidents,
            criticalIncidents: s.criticalIncidents || prev.criticalIncidents,
            averageProgress: s.resultsProgress || prev.averageProgress,
          }));
        }
      } catch (statsError) {
        console.log('Could not fetch separate stats, using ward data');
      }

      // Set zone name
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }
    } catch (error: any) {
      console.error('Error fetching wards:', error);
      setError(error?.message || 'Failed to load wards');
      toast({
        title: "Error",
        description: error?.message || "Failed to load wards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, searchTerm, fetchWards, toast]);

  // Handle search
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setPage(1);
    setWards([]);
    fetchWards(1, search);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWards(nextPage, searchTerm);
    }
  };

  // Initial load
  useEffect(() => {
    if (user?.zoneId) {
      fetchData(true);
    }
  }, [fetchData, user?.zoneId]);

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    setWards([]);
    fetchData(false);
  };

  // Filter wards client-side
  const filteredWards = useMemo(() => {
    let result = wards;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(ward =>
        ward.name?.toLowerCase().includes(term) ||
        ward.code?.toLowerCase().includes(term) ||
        ward.adminName?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus === 'excellent') {
      result = result.filter(w => w.progress >= 80);
    } else if (filterStatus === 'ontrack') {
      result = result.filter(w => w.progress >= 50 && w.progress < 80);
    } else if (filterStatus === 'attention') {
      result = result.filter(w => w.progress < 50);
    }

    return result;
  }, [wards, searchTerm, filterStatus]);

  // Get progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setPage(1);
    setWards([]);
    fetchWards(1, '');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Wards"
          subtitle="Manage wards across your zone"
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

  // Error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Wards"
          subtitle="Manage wards across your zone"
        />
        <div className="flex-1 container p-4 md:p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium text-red-600">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Zone Wards"
        subtitle={`Manage wards across ${zoneName || 'your zone'}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Wards</p>
                  <p className="text-2xl font-bold">{pagination.total || stats.totalWards || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Polling Units</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalPollingUnits || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeAgents || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Results</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.totalResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Incidents</p>
                  <p className="text-2xl font-bold text-red-600">{stats.totalIncidents || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Average Progress</p>
            <p className="text-2xl font-bold">{stats.averageProgress || 0}%</p>
            <ProgressBar value={stats.averageProgress || 0} className="mt-2" />
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Pending Results</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingResults || 0}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Verified Results</p>
            <p className="text-2xl font-bold text-green-600">{stats.verifiedResults || 0}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Critical Incidents</p>
            <p className="text-2xl font-bold text-red-600">{stats.criticalIncidents || 0}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wards by name, code, or admin..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
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
              {(filterStatus !== 'all' || searchTerm) && (
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
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Performance Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Wards</option>
                  <option value="excellent">Excellent (≥80%)</option>
                  <option value="ontrack">On Track (50-79%)</option>
                  <option value="attention">Needs Attention (&lt;50%)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Wards Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Wards</CardTitle>
              <CardDescription>
                {wards.length === 0 ? 'No wards found' :
                  `Showing ${filteredWards.length} of ${pagination.total || wards.length} wards`}
                {pagination.totalPages > 1 && (
                  <span className="ml-2 text-xs">
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {wards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No wards found in your zone</p>
              </div>
            ) : filteredWards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No wards match your filters</p>
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
                        <TableHead>Ward</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Polling Units</TableHead>
                        <TableHead>Agents</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Incidents</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((ward) => (
                        <TableRow key={ward.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ward.name}</p>
                              <p className="text-sm text-muted-foreground">{ward.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ward.adminName ? (
                              <div>
                                <p className="font-medium">{ward.adminName}</p>
                                <p className="text-sm text-muted-foreground">{ward.adminEmail}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No admin assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ward.pollingUnits}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{ward.agents}</span>
                              <span className="text-xs text-green-600">
                                ({ward.activeAgents} active)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span>{ward.resultsSubmitted}</span>
                              {ward.pendingResults > 0 && (
                                <span className="text-xs text-yellow-600">
                                  ({ward.pendingResults} pending)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {ward.incidents > 0 ? (
                              <Badge variant="destructive">{ward.incidents}</Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ProgressBar 
                                value={ward.progress} 
                                className="w-20"
                                indicatorClassName={getProgressColor(ward.progress)}
                              />
                              <span className="text-sm font-medium">{ward.progress}%</span>
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedWard(ward);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(`/admin/wards/${ward.id}`);
                                  }}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  View Agents
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(`/admin/wards/${ward.id}/polling-units`);
                                  }}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  View Polling Units
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(`/admin/wards/${ward.id}/incidents`);
                                  }}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  View Incidents
                                </DropdownMenuItem>
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
                      Showing {filteredWards.length} of {pagination.total} wards
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
                          fetchWards(prevPage, searchTerm);
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
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ward Details
              </DialogTitle>
              <DialogDescription>
                {selectedWard?.name} - {selectedWard?.code}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedWard && (
                <div className="space-y-4 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedWard.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Code</Label>
                      <p className="font-medium">{selectedWard.code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedWard.zoneName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Progress</Label>
                      <div className="flex items-center gap-2">
                        <ProgressBar 
                          value={selectedWard.progress} 
                          className="flex-1"
                          indicatorClassName={getProgressColor(selectedWard.progress)}
                        />
                        <span className="font-medium">{selectedWard.progress}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Info */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-muted-foreground">Ward Admin</Label>
                    {selectedWard.adminName ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-medium">{selectedWard.adminName}</p>
                        <p className="text-sm text-muted-foreground">{selectedWard.adminEmail}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No admin assigned</p>
                    )}
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Polling Units</p>
                      <p className="text-xl font-bold">{selectedWard.pollingUnits}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Agents</p>
                      <p className="text-xl font-bold">
                        {selectedWard.agents}
                        <span className="text-sm font-normal text-green-600 ml-1">
                          ({selectedWard.activeAgents} active)
                        </span>
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Results</p>
                      <p className="text-xl font-bold">
                        {selectedWard.resultsSubmitted}
                        {selectedWard.pendingResults > 0 && (
                          <span className="text-sm font-normal text-yellow-600 ml-1">
                            ({selectedWard.pendingResults} pending)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Incidents</p>
                      <p className="text-xl font-bold">{selectedWard.incidents}</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        router.push(`/admin/wards/${selectedWard.id}/polling-units`);
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      View Units
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        router.push(`/admin/wards/${selectedWard.id}/agents`);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Agents
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
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