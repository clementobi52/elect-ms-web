// app/admin/zone/polling-units/page.tsx
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
  Users,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle,
  Clock,
  FileText,
  MoreVertical,
  Edit,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserX,
  MapPin,
  Calendar,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { apiClient } from '@/lib/api/client';

// Type Definitions
interface PollingUnit {
  id: string;
  name: string;
  code: string;
  wardId?: string;
  wardName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  registeredVoters?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  agentId?: string;
  agentName?: string;
  agentStatus?: string;
  resultStatus?: string;
  hasResults?: boolean;
  createdAt?: string;
  updatedAt?: string;
  zoneId?: string;
  zoneName?: string;
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

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  status: string;
  ward: string;
  hasAgent: string;
  hasResult: string;
}

// Helper Functions
const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const getInitials = (name: string): string => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function ZonePollingUnitsPage() {
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
  const [showFilters, setShowFilters] = useState(false);
  const [zoneName, setZoneName] = useState<string>('');

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    ward: 'all',
    hasAgent: 'all',
    hasResult: 'all',
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

  // Stats State
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

  // Fetch polling units with pagination and filters
  const fetchPollingUnits = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters) => {
    try {
      const zoneId = user?.zoneId;
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      setIsLoadingMore(pageNum > 1);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', limit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.ward !== 'all') params.append('wardId', currentFilters.ward);
      if (currentFilters.hasAgent !== 'all') params.append('hasAgent', currentFilters.hasAgent);
      if (currentFilters.hasResult !== 'all') params.append('hasResult', currentFilters.hasResult);

      const url = `/admin/zone/${zoneId}/polling-units?${params.toString()}`;
      console.log('📡 Fetching URL:', url);

      const response = await apiClient.get<{
        success: boolean;
        pollingUnits: PollingUnit[];
        pagination: PaginationData;
        stats?: PollingUnitStats;
      }>(url);

      console.log('📡 Response:', response);

      if (response.success && response.pollingUnits) {
        const uniqueUnits = deduplicateById(response.pollingUnits);
        
        if (pageNum === 1) {
          setPollingUnits(uniqueUnits);
        } else {
          setPollingUnits(prev => {
            const merged = [...prev, ...uniqueUnits];
            return deduplicateById(merged);
          });
        }
        
        if (response.pagination) {
          setPagination(response.pagination);
        }

        // Update stats
        if (response.stats) {
          setStats(response.stats);
        } else {
          calculateStats(uniqueUnits, response.pagination?.total || uniqueUnits.length);
        }
      }
    } catch (error) {
      console.error('Error fetching polling units:', error);
      setError('Failed to load polling units');
    } finally {
      setIsLoadingMore(false);
    }
  }, [user?.zoneId, limit, filters]);

  // Calculate stats from data
  const calculateStats = (units: PollingUnit[], totalUnits: number) => {
    const withAgents = units.filter(u => u.agentId && u.agentId !== null && u.agentId !== '').length;
    const withoutAgents = units.filter(u => !u.agentId || u.agentId === null || u.agentId === '').length;
    
    const withResults = units.filter(u => 
      u.resultStatus && 
      u.resultStatus !== 'Not Submitted' && 
      u.resultStatus !== 'not_submitted'
    ).length;
    
    const withoutResults = units.filter(u => 
      !u.resultStatus || 
      u.resultStatus === 'Not Submitted' || 
      u.resultStatus === 'not_submitted'
    ).length;
    
    const verifiedResults = units.filter(u => 
      u.resultStatus === 'Verified' || 
      u.resultStatus === 'verified'
    ).length;
    
    const pendingResults = units.filter(u => 
      u.resultStatus === 'Pending' || 
      u.resultStatus === 'pending'
    ).length;
    
    const rejectedResults = units.filter(u => 
      u.resultStatus === 'Rejected' || 
      u.resultStatus === 'rejected'
    ).length;

    setStats({
      total: totalUnits || units.length,
      withAgents,
      withoutAgents,
      withResults,
      withoutResults,
      verifiedResults,
      pendingResults,
      rejectedResults,
    });
  };

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

      // Set zone name
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }

      // Fetch polling units with current filters
      await fetchPollingUnits(1, filters);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load polling units');
      toast({
        title: "Error",
        description: "Failed to load polling units",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filters, fetchPollingUnits, toast]);

  // Handle filter change
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnits(1, newFilters);
  };

  // Handle search
  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPollingUnits(nextPage, filters);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    setPollingUnits([]);
    fetchData(false);
  };

  // Clear all filters
  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      status: 'all',
      ward: 'all',
      hasAgent: 'all',
      hasResult: 'all',
    };
    setFilters(resetFilters);
    setPage(1);
    setPollingUnits([]);
    fetchPollingUnits(1, resetFilters);
  };

  // Initial load
  useEffect(() => {
    if (user?.zoneId) {
      fetchData(true);
    }
  }, [user?.zoneId]);

  // Get unique wards for filter
  const uniqueWards = useMemo(() => {
    return Array.from(new Set(pollingUnits.map(u => u.wardName))).filter(Boolean);
  }, [pollingUnits]);

  // Filter polling units client-side (for additional filtering)
  const filteredUnits = useMemo(() => {
    let units = pollingUnits;

    // Client-side filtering for fields not handled by API
    if (filters.status === 'online') {
      units = units.filter(u => u.agentStatus === 'Online');
    } else if (filters.status === 'offline') {
      units = units.filter(u => u.agentStatus === 'Offline');
    } else if (filters.status === 'unassigned') {
      units = units.filter(u => !u.agentId);
    }

    return units;
  }, [pollingUnits, filters.status]);

  // Get status badge
  const getAgentStatusBadge = (status: string) => {
    if (status === 'Online') {
      return <Badge className="bg-green-500 text-white">Online</Badge>;
    } else if (status === 'Offline') {
      return <Badge variant="secondary">Offline</Badge>;
    } else {
      return <Badge variant="outline">Unassigned</Badge>;
    }
  };

  // Get status dot
  const getStatusDot = (status: string) => {
    if (status === 'Online') {
      return <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-1.5" />;
    } else if (status === 'Offline') {
      return <span className="h-2 w-2 rounded-full bg-gray-400 inline-block mr-1.5" />;
    }
    return <span className="h-2 w-2 rounded-full bg-gray-300 inline-block mr-1.5" />;
  };

  // Get result status badge
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

  // Check if any filters are active
  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.ward !== 'all' || 
    filters.hasAgent !== 'all' || 
    filters.hasResult !== 'all';

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Polling Units"
          subtitle="Manage polling units across all wards in your zone"
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
        title="Zone Polling Units"
        subtitle={`Manage polling units across all wards in ${zoneName || 'your zone'}`}
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              {pagination.total > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing {pollingUnits.length} of {pagination.total} total
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Agents</p>
                  <p className="text-2xl font-bold text-green-600">{stats.withAgents || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? Math.round((stats.withAgents / stats.total) * 100) : 0}% assigned
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Results</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.withResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? Math.round((stats.withResults / stats.total) * 100) : 0}% submitted
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified Results</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.verifiedResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.withResults > 0 ? Math.round((stats.verifiedResults / stats.withResults) * 100) : 0}% verified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, ward, or agent..."
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
                <Label className="text-xs text-muted-foreground">Agent Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unassigned">Unassigned</option>
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
                <Label className="text-xs text-muted-foreground">Agent Assignment</Label>
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
                <Label className="text-xs text-muted-foreground">Result Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.hasResult}
                  onChange={(e) => handleFilterChange('hasResult', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="true">Has Result</option>
                  <option value="false">No Result</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Polling Units Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Polling Units</CardTitle>
              <CardDescription>
                {pollingUnits.length === 0 ? 'No polling units found' :
                  `Showing ${filteredUnits.length} of ${pagination.total || pollingUnits.length} units`}
                {pagination.totalPages > 1 && (
                  <span className="ml-2 text-xs">
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
                {hasActiveFilters && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    • Filters active
                  </span>
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {pollingUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No polling units found in your zone</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all units
                  </Button>
                )}
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No polling units match your filters</p>
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
                        <TableHead>Name / Code</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Voters</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{unit.name}</p>
                              <p className="text-sm text-muted-foreground">{unit.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>{unit.wardName || 'Unknown'}</TableCell>
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
                              {getStatusDot(unit.agentStatus)}
                              {getAgentStatusBadge(unit.agentStatus)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {unit.registeredVoters || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getResultStatusBadge(unit.resultStatus)}
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
                                    setSelectedUnit(unit);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(`/admin/polling-units/${unit.id}/edit`);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Unit
                                </DropdownMenuItem>
                                {!unit.agentId && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      router.push(`/admin/polling-units/${unit.id}/assign-agent`);
                                    }}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Assign Agent
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

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredUnits.length} of {pagination.total} units
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
                          fetchPollingUnits(prevPage, filters);
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
                <Building2 className="h-5 w-5" />
                Polling Unit Details
              </DialogTitle>
              <DialogDescription>
                {selectedUnit?.name} - {selectedUnit?.code}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedUnit && (
                <div className="space-y-4 py-4">
                  {/* Basic Info */}
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
                      <Label className="text-muted-foreground">Registered Voters</Label>
                      <p className="font-medium">{selectedUnit.registeredVoters || 0}</p>
                    </div>
                  </div>

                  {/* Agent Info */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-muted-foreground">Assigned Agent</Label>
                    {selectedUnit.agentName ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-medium">{selectedUnit.agentName}</p>
                        <div className="flex items-center gap-2">
                          {getStatusDot(selectedUnit.agentStatus)}
                          {getAgentStatusBadge(selectedUnit.agentStatus)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No agent assigned</p>
                    )}
                  </div>

                  {/* Result Status */}
                  <div>
                    <Label className="text-muted-foreground">Result Status</Label>
                    <div className="mt-1">
                      {getResultStatusBadge(selectedUnit.resultStatus || 'Not Submitted')}
                    </div>
                  </div>

                  {/* Location */}
                  {(selectedUnit.latitude || selectedUnit.longitude) && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        {selectedUnit.latitude && (
                          <p className="text-sm">Latitude: {selectedUnit.latitude}</p>
                        )}
                        {selectedUnit.longitude && (
                          <p className="text-sm">Longitude: {selectedUnit.longitude}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUnit.createdAt ? new Date(selectedUnit.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUnit.updatedAt ? new Date(selectedUnit.updatedAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedUnit && !selectedUnit.agentId && (
                <Button
                  variant="default"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    router.push(`/admin/polling-units/${selectedUnit.id}/assign-agent`);
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Agent
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedUnit) {
                    router.push(`/admin/polling-units/${selectedUnit.id}/edit`);
                  }
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
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