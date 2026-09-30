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
  Users,
  UserCheck,
  UserX,
  MapPin,
  Building2,
  Layers,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Clock,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { API_BASE_URL } from '@/lib/config';
import {
  fetchAgents,
  fetchAgentById,
  updateAgent,
  deleteAgent,
  fetchZonesPaginated,
  fetchWardsPaginated,
  fetchAllData,
} from '@/lib/system-admin/api';

// ============================================
// TYPES
// ============================================

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending';
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  pollingUnitId?: string;
  pollingUnitName?: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
  incidentsReported?: number;
  resultsSubmitted?: number;
  assignments?: number;
}

interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  withIncidents: number;
  withResults: number;
  online: number;
  offline: number;
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
  hasIncidents: string;
  hasResults: string;
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
  return new Date(date).toLocaleDateString();
};

const formatTimeAgo = (date: string) => {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Active':
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    case 'Inactive':
      return <Badge variant="secondary">Inactive</Badge>;
    case 'Pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'Active':
      return <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-1.5" />;
    case 'Inactive':
      return <span className="h-2 w-2 rounded-full bg-gray-400 inline-block mr-1.5" />;
    case 'Pending':
      return <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block mr-1.5" />;
    default:
      return <span className="h-2 w-2 rounded-full bg-gray-300 inline-block mr-1.5" />;
  }
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SystemAgentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Agent>>({});

  // Stats
  const [stats, setStats] = useState<AgentStats>({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    withIncidents: 0,
    withResults: 0,
    online: 0,
    offline: 0,
  });

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    zone: 'all',
    ward: 'all',
    state: 'all',
    lga: 'all',
    hasIncidents: 'all',
    hasResults: 'all',
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
  // API FUNCTIONS
  // ============================================

  const fetchOptions = useCallback(async () => {
    try {
      const [zonesData, wardsData, allData] = await Promise.all([
        fetchZonesPaginated(API_BASE_URL, 1),
        fetchWardsPaginated(API_BASE_URL, 1, { limit: 1000 }),
        fetchAllData(API_BASE_URL)
      ]);

      if (zonesData.data) {
        setZones(zonesData.data.map((z: any) => ({ id: z.id, name: z.name })));
      }
      if (wardsData.data) {
        setWards(wardsData.data.map((w: any) => ({ id: w.id, name: w.name })));
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL]);

  const fetchAgentsData = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params: any = {
        limit: currentLimit,
      };
      
      if (currentFilters.search) params.search = currentFilters.search;
      if (currentFilters.status !== 'all') params.status = currentFilters.status;
      if (currentFilters.zone !== 'all') params.zoneId = currentFilters.zone;
      if (currentFilters.ward !== 'all') params.wardId = currentFilters.ward;
      if (currentFilters.hasIncidents !== 'all') params.hasIncidents = currentFilters.hasIncidents;
      if (currentFilters.hasResults !== 'all') params.hasResults = currentFilters.hasResults;
      if (currentFilters.sortBy !== 'name') params.sortBy = currentFilters.sortBy;

      setIsLoadingMore(pageNum > 1);

      const response = await fetchAgents(API_BASE_URL, pageNum, params);

      if (response.success && response.data) {
        if (pageNum === 1) {
          setAgents(response.data);
        } else {
          setAgents(prev => [...prev, ...response.data]);
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
      console.error('Error fetching agents:', error);
      setError('Failed to load agents');
      toast({
        title: "Error",
        description: "Failed to load agents",
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

    try {
      await Promise.all([
        fetchAgentsData(1, filters, limit),
        fetchOptions(),
      ]);
    } catch (error) {
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
  }, [filters, fetchAgentsData, fetchOptions, toast, limit]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setAgents([]);
    fetchAgentsData(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setAgents([]);
    fetchAgentsData(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAgentsData(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setAgents([]);
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
      hasIncidents: 'all',
      hasResults: 'all',
      sortBy: 'name',
    };
    setFilters(resetFilters);
    setPage(1);
    setAgents([]);
    fetchAgentsData(1, resetFilters, limit);
  };

  const handleViewAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsViewDialogOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm(agent);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAgent) return;

    try {
      const response = await updateAgent(API_BASE_URL, selectedAgent.id, editForm);
      if (response.success) {
        toast({
          title: "✅ Agent Updated",
          description: "Agent has been updated successfully.",
        });
        setIsEditDialogOpen(false);
        fetchData(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update agent",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) return;

    try {
      const response = await deleteAgent(API_BASE_URL, id);
      if (response.success) {
        toast({
          title: "🗑️ Agent Deleted",
          description: "Agent has been deleted successfully.",
        });
        fetchData(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Zone', 'Ward', 'Polling Unit', 'Incidents', 'Results', 'Last Active'];
    const rows = agents.map(agent => [
      agent.name,
      agent.email,
      agent.phone || '',
      agent.status,
      agent.zoneName || '',
      agent.wardName || '',
      agent.pollingUnitName || 'Unassigned',
      agent.incidentsReported || 0,
      agent.resultsSubmitted || 0,
      formatDate(agent.lastActive || ''),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents-${new Date().toISOString().split('T')[0]}.csv`;
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
    return Array.from(new Set(agents.map(a => a.zoneName))).filter(Boolean);
  }, [agents]);

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(agents.map(a => a.wardName))).filter(Boolean);
  }, [agents]);

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.zone !== 'all' || 
    filters.ward !== 'all' ||
    filters.state !== 'all' ||
    filters.lga !== 'all' ||
    filters.hasIncidents !== 'all' ||
    filters.hasResults !== 'all';

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="👥 Agents"
          subtitle="System Admin View - All Polling Agents"
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
        title="👥 Agents"
        subtitle="System Admin View - All Polling Agents"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Agents</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.active)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-700" />
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

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Inactive</p>
                  <p className="text-2xl font-bold text-red-900">{formatNumber(stats.inactive)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">With Incidents</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.withIncidents)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-700 font-medium">With Results</p>
                  <p className="text-2xl font-bold text-indigo-900">{formatNumber(stats.withResults)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-indigo-700" />
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
                placeholder="Search by name, email, or ward..."
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
                size="sm"
                onClick={() => router.push('/admin/system/agents/create')}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Agent
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
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
                <Label className="text-xs text-muted-foreground">Has Incidents</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.hasIncidents}
                  onChange={(e) => handleFilterChange('hasIncidents', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="true">Has Incidents</option>
                  <option value="false">No Incidents</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agents
              </CardTitle>
              <CardDescription>
                {agents.length === 0 ? 'No agents found' :
                  `Showing ${agents.length} of ${pagination.total || agents.length} agents`}
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
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No agents found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all agents
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                {getInitials(agent.name)}
                              </div>
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-xs text-muted-foreground">{agent.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">{agent.email}</span>
                              </div>
                              {agent.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{agent.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm">{agent.zoneName || 'Unknown Zone'}</p>
                              <p className="text-xs text-muted-foreground">{agent.wardName || 'Unassigned'}</p>
                              {agent.pollingUnitName && (
                                <p className="text-xs text-blue-600">{agent.pollingUnitName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getStatusDot(agent.status)}
                              {getStatusBadge(agent.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex gap-2 text-xs">
                                {agent.incidentsReported > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    🚨 {agent.incidentsReported}
                                  </Badge>
                                )}
                                {agent.resultsSubmitted > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    📄 {agent.resultsSubmitted}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatTimeAgo(agent.lastActive || '')}
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
                                <DropdownMenuItem onClick={() => handleViewAgent(agent)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAgent(agent)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Agent
                                </DropdownMenuItem>
                                {!agent.pollingUnitId && (
                                  <DropdownMenuItem onClick={() => router.push(`/admin/agents/${agent.id}/assign`)}>
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Assign to Polling Unit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAgent(agent.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Agent
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
                      Showing {agents.length} of {pagination.total} agents
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
                          setAgents([]);
                          fetchAgentsData(prevPage, filters, limit);
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

        {/* View Agent Dialog */}
        <Dialog open={isViewDialogOpen && selectedAgent !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Details
              </DialogTitle>
              <DialogDescription>
                {selectedAgent?.name} - {selectedAgent?.email}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedAgent && (
                <div className="space-y-4 py-4">
                  {/* Profile */}
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xl">
                      {getInitials(selectedAgent.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedAgent.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedAgent.role}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusDot(selectedAgent.status)}
                        {getStatusBadge(selectedAgent.status)}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedAgent.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedAgent.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedAgent.zoneName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedAgent.wardName || 'Unassigned'}</p>
                    </div>
                  </div>

                  {selectedAgent.pollingUnitName && (
                    <div>
                      <Label className="text-muted-foreground">Assigned Polling Unit</Label>
                      <p className="font-medium">{selectedAgent.pollingUnitName}</p>
                    </div>
                  )}

                  {/* Activity Stats */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Incidents Reported</Label>
                      <p className="text-2xl font-bold text-blue-600">{selectedAgent.incidentsReported || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Results Submitted</Label>
                      <p className="text-2xl font-bold text-green-600">{selectedAgent.resultsSubmitted || 0}</p>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-muted-foreground">Last Active</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.lastActive ? formatTimeAgo(selectedAgent.lastActive) : 'Never'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Joined</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.createdAt ? formatDate(selectedAgent.createdAt) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedAgent && !selectedAgent.pollingUnitId && (
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    router.push(`/admin/agents/${selectedAgent.id}/assign`);
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Assign to Polling Unit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedAgent) {
                    setIsViewDialogOpen(false);
                    handleEditAgent(selectedAgent);
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

        {/* Edit Agent Dialog */}
        <Dialog open={isEditDialogOpen && selectedAgent !== null} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Agent
              </DialogTitle>
              <DialogDescription>
                Update agent details
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
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.status || 'Active'}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as 'Active' | 'Inactive' | 'Pending' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
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
      </div>
    </div>
  );
}