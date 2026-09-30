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
  Users,
  UserPlus,
  Save,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Shield,
  UserCheck,
  UserX,
  Key,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  pollingUnitId?: string;
  pollingUnitName?: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
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
  role: string;
  status: string;
  zoneId: string;
  wardId: string;
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

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'System Admin':
      return <Badge className="bg-purple-600 text-white">System Admin</Badge>;
    case 'Situation Room Admin':
      return <Badge className="bg-blue-600 text-white">Situation Room</Badge>;
    case 'Zone Admin':
      return <Badge className="bg-green-600 text-white">Zone Admin</Badge>;
    case 'Ward Admin':
      return <Badge className="bg-yellow-600 text-white">Ward Admin</Badge>;
    case 'Polling Agent':
      return <Badge className="bg-orange-500 text-white">Polling Agent</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Active':
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    case 'Inactive':
      return <Badge className="bg-gray-500 text-white">Inactive</Badge>;
    case 'Pending':
      return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
    case 'Suspended':
      return <Badge className="bg-red-500 text-white">Suspended</Badge>;
    default:
      return <Badge variant="outline">{status || 'Active'}</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Active':
      return <UserCheck className="h-4 w-4 text-green-500" />;
    case 'Inactive':
      return <UserX className="h-4 w-4 text-gray-500" />;
    case 'Pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'Suspended':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <User className="h-4 w-4 text-gray-400" />;
  }
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    pollingUnitId: '',
    wardId: '',
    zoneId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: 'all',
    status: 'all',
    zoneId: 'all',
    wardId: 'all',
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
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [pollingUnits, setPollingUnits] = useState<{ id: string; name: string }[]>([]);


  const roleOptions = [
    { value: 'System Admin', label: 'System Admin' },
    { value: 'Situation Room Admin', label: 'Situation Room Admin' },
    { value: 'Zone Admin', label: 'Zone Admin' },
    { value: 'Ward Admin', label: 'Ward Admin' },
    { value: 'Polling Agent', label: 'Polling Agent' },
  ];

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

      const [zonesRes, wardsRes, pollingUnitsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/system/zones?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        }),
        fetch(`${API_BASE_URL}/admin/system/wards?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        }),
        fetch(`${API_BASE_URL}/admin/system/polling-units?limit=1000`, {
          headers: withTenantHeaders({ 'Authorization': `Bearer ${token}` })
        })
      ]);

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.zones || data.data || []);
      }

      if (wardsRes.ok) {
        const data = await wardsRes.json();
        setWards(data.wards || data.data || []);
      }

      if (pollingUnitsRes.ok) {
        const data = await pollingUnitsRes.json();
        setPollingUnits(data.pollingUnits || data.data || []);
      }

    } catch (error) {
      console.error('Error fetching options:', error);
    }
  }, [API_BASE_URL]);

  const fetchUsers = useCallback(async (pageNum: number = 1, currentFilters: FilterState = filters, currentLimit: number = limit) => {
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', currentLimit.toString());
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.role && currentFilters.role !== 'all') params.append('role', currentFilters.role);
      if (currentFilters.status && currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.zoneId && currentFilters.zoneId !== 'all') params.append('zoneId', currentFilters.zoneId);
      if (currentFilters.wardId && currentFilters.wardId !== 'all') params.append('wardId', currentFilters.wardId);

      setIsLoadingMore(pageNum > 1);

      const url = `/admin/system/users?${params.toString()}`;
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

      if (data.success && data.users) {
        if (pageNum === 1) {
          setUsers(data.users);
        } else {
          setUsers(prev => [...prev, ...data.users]);
        }
        
        setPagination({
          total: data.pagination?.total || data.users.length || 0,
          page: data.pagination?.page || pageNum,
          limit: data.pagination?.limit || currentLimit,
          totalPages: data.pagination?.totalPages || 1
        });
      } else if (Array.isArray(data)) {
        if (pageNum === 1) {
          setUsers(data);
        } else {
          setUsers(prev => [...prev, ...data]);
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
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to load users');
      toast({
        title: "Error",
        description: error.message || "Failed to load users",
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
        fetchUsers(1, filters, limit),
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
  }, [filters, fetchUsers, fetchOptions, toast, limit]);

  // ============================================
  // CRUD HANDLERS
  // ============================================

  const handleCreateUser = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      if (!formData.name.trim()) {
        setFormError('Name is required');
        return;
      }

      if (!formData.email.trim()) {
        setFormError('Email is required');
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        setFormError('Password must be at least 6 characters');
        return;
      }

      if (!formData.role) {
        setFormError('Please select a role');
        return;
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/create-user`, {
        method: 'POST',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          pollingUnitId: formData.pollingUnitId || undefined,
          wardId: formData.wardId || undefined,
          zoneId: formData.zoneId || undefined,
        })
      });

      const data = await response.json();

      if (data.message || data.success) {
        toast({
          title: "✅ User Created",
          description: `User "${formData.name}" has been created successfully.`,
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to create user');
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to create user');
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      setFormError(null);
      setIsSubmitting(true);

      if (!selectedUser) return;

      if (!formData.name.trim()) {
        setFormError('Name is required');
        return;
      }

      if (!formData.email.trim()) {
        setFormError('Email is required');
        return;
      }

      if (!formData.role) {
        setFormError('Please select a role');
        return;
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          pollingUnitId: formData.pollingUnitId || undefined,
          wardId: formData.wardId || undefined,
          zoneId: formData.zoneId || undefined,
          status: formData.status || 'Active',
        })
      });

      const data = await response.json();

      if (data.success || data.message) {
        toast({
          title: "✅ User Updated",
          description: `User has been updated successfully.`,
        });
        setIsEditDialogOpen(false);
        resetForm();
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to update user');
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to update user');
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/system/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: withTenantHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      });

      const data = await response.json();

      if (data.success || data.message) {
        toast({
          title: "🗑️ User Deleted",
          description: `User "${selectedUser.name}" has been deleted successfully.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchData(false);
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
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
      email: '',
      password: '',
      role: '',
      pollingUnitId: '',
      wardId: '',
      zoneId: '',
    });
    setFormError(null);
    setSelectedUser(null);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      pollingUnitId: user.pollingUnitId || '',
      wardId: user.wardId || '',
      zoneId: user.zoneId || '',
    });
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (user: User) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    setUsers([]);
    fetchUsers(1, newFilters, limit);
  };

  const handleSearch = (search: string) => {
    handleFilterChange('search', search);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setUsers([]);
    fetchUsers(1, filters, newLimit);
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage, filters, limit);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setUsers([]);
    fetchData(false);
  };

  const clearFilters = () => {
    const resetFilters: FilterState = {
      search: '',
      role: 'all',
      status: 'all',
      zoneId: 'all',
      wardId: 'all',
    };
    setFilters(resetFilters);
    setPage(1);
    setUsers([]);
    fetchUsers(1, resetFilters, limit);
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Zone', 'Ward', 'Polling Unit', 'Created At'];
    const rows = users.map(user => [
      user.name,
      user.email,
      user.role,
      user.status || 'Active',
      user.zoneName || 'N/A',
      user.wardName || 'N/A',
      user.pollingUnitName || 'N/A',
      formatDate(user.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = pagination.total || users.length;
    const systemAdmins = users.filter(u => u.role === 'System Admin').length;
    const situationRoom = users.filter(u => u.role === 'Situation Room Admin').length;
    const zoneAdmins = users.filter(u => u.role === 'Zone Admin').length;
    const wardAdmins = users.filter(u => u.role === 'Ward Admin').length;
    const pollingAgents = users.filter(u => u.role === 'Polling Agent').length;
    const active = users.filter(u => u.status === 'Active' || !u.status).length;

    return {
      total,
      systemAdmins,
      situationRoom,
      zoneAdmins,
      wardAdmins,
      pollingAgents,
      active,
    };
  }, [users, pagination]);

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
    (filters.role && filters.role !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    (filters.zoneId && filters.zoneId !== 'all') ||
    (filters.wardId && filters.wardId !== 'all');

  // ============================================
  // LOADING SKELETON
  // ============================================

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="👥 Users"
          subtitle="System Admin View - Manage All Users"
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
        title="👥 Users"
        subtitle="System Admin View - Manage All Users"
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">System Admins</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.systemAdmins)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Situation Room</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.situationRoom)}</p>
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
                  <p className="text-sm text-green-700 font-medium">Zone Admins</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.zoneAdmins)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Ward Admins</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatNumber(stats.wardAdmins)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Polling Agents</p>
                  <p className="text-2xl font-bold text-orange-900">{formatNumber(stats.pollingAgents)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-orange-700" />
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
                placeholder="Search by name, email, role..."
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
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
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
                <Label className="text-xs text-muted-foreground">Ward</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filters.wardId}
                  onChange={(e) => handleFilterChange('wardId', e.target.value)}
                >
                  <option value="all">All Wards</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>{ward.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users
              </CardTitle>
              <CardDescription>
                {users.length === 0 ? 'No users found' :
                  `Showing ${users.length} of ${pagination.total || users.length} users`}
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
            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No users found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters to see all users
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {getInitials(user.name)}
                              </div>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(user.status || 'Active')}
                              {getStatusBadge(user.status || 'Active')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.zoneName && <p className="text-xs">{user.zoneName}</p>}
                              {user.wardName && <p className="text-xs text-muted-foreground">{user.wardName}</p>}
                              {user.pollingUnitName && <p className="text-xs text-muted-foreground">{user.pollingUnitName}</p>}
                              {!user.zoneName && !user.wardName && !user.pollingUnitName && (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(user.createdAt)}
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
                                <DropdownMenuItem onClick={() => openViewDialog(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(user)}
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
                      Showing {users.length} of {formatNumber(pagination.total)} users
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
                          setUsers([]);
                          fetchUsers(prevPage, filters, limit);
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

        {/* View User Dialog */}
        <Dialog open={isViewDialogOpen && selectedUser !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Details
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {getInitials(selectedUser.name)}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(selectedUser.role)}
                      {getStatusBadge(selectedUser.status || 'Active')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="font-medium">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium">{selectedUser.status || 'Active'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Zone</Label>
                    <p className="font-medium">{selectedUser.zoneName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ward</Label>
                    <p className="font-medium">{selectedUser.wardName || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Polling Unit</Label>
                    <p className="font-medium">{selectedUser.pollingUnitName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Updated</Label>
                    <p className="font-medium">{formatDate(selectedUser.updatedAt)}</p>
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

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </DialogTitle>
              <DialogDescription>
                Add a new user to the system
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 py-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="userName">Full Name *</Label>
                  <Input
                    id="userName"
                    placeholder="Enter full name..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="userEmail">Email *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="Enter email address..."
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="userPassword">Password *</Label>
                  <Input
                    id="userPassword"
                    type="password"
                    placeholder="Enter password (min 6 characters)..."
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="userRole">Role *</Label>
                  <select
                    id="userRole"
                    className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="">Select a role...</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {formData.role === 'Polling Agent' && (
                  <div>
                    <Label htmlFor="pollingUnit">Polling Unit *</Label>
                    <select
                      id="pollingUnit"
                      className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                      value={formData.pollingUnitId}
                      onChange={(e) => setFormData({ ...formData, pollingUnitId: e.target.value })}
                    >
                      <option value="">Select a polling unit...</option>
                      {pollingUnits.map((pu) => (
                        <option key={pu.id} value={pu.id}>{pu.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role === 'Ward Admin' && (
                  <div>
                    <Label htmlFor="ward">Ward *</Label>
                    <select
                      id="ward"
                      className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                      value={formData.wardId}
                      onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                    >
                      <option value="">Select a ward...</option>
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id}>{ward.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role === 'Zone Admin' && (
                  <div>
                    <Label htmlFor="zone">Zone *</Label>
                    <select
                      id="zone"
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
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen && selectedUser !== null} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit User
              </DialogTitle>
              <DialogDescription>
                Update user details
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 py-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="editUserName">Full Name *</Label>
                  <Input
                    id="editUserName"
                    placeholder="Enter full name..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="editUserEmail">Email *</Label>
                  <Input
                    id="editUserEmail"
                    type="email"
                    placeholder="Enter email address..."
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="editUserRole">Role *</Label>
                  <select
                    id="editUserRole"
                    className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="">Select a role...</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="editUserStatus">Status</Label>
                  <select
                    id="editUserStatus"
                    className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                {formData.role === 'Polling Agent' && (
                  <div>
                    <Label htmlFor="editPollingUnit">Polling Unit</Label>
                    <select
                      id="editPollingUnit"
                      className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                      value={formData.pollingUnitId}
                      onChange={(e) => setFormData({ ...formData, pollingUnitId: e.target.value })}
                    >
                      <option value="">Select a polling unit...</option>
                      {pollingUnits.map((pu) => (
                        <option key={pu.id} value={pu.id}>{pu.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role === 'Ward Admin' && (
                  <div>
                    <Label htmlFor="editWard">Ward</Label>
                    <select
                      id="editWard"
                      className="w-full mt-1 px-3 py-2 bg-background border rounded-md"
                      value={formData.wardId}
                      onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                    >
                      <option value="">Select a ward...</option>
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id}>{ward.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role === 'Zone Admin' && (
                  <div>
                    <Label htmlFor="editZone">Zone</Label>
                    <select
                      id="editZone"
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
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteDialogOpen && selectedUser !== null} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user?
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="py-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                      {getInitials(selectedUser.name)}
                    </div>
                    <div>
                      <p className="font-medium text-red-700">{selectedUser.name}</p>
                      <p className="text-sm text-red-600">{selectedUser.email}</p>
                      <p className="text-xs text-red-500 mt-1">{selectedUser.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 mt-3">
                    This action cannot be undone. All associated data will be removed.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}