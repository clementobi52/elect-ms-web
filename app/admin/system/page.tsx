"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { ROLES, getRoleBadgeColor } from '@/lib/types'; // Removed unused getRoleDisplayName
import { 
  Users, 
  MapPin, 
  Building2,
  Map,
  Eye,
  MoreVertical,
  Download,
  Filter,
  Plus,
  Edit,
  Trash2,
  Search,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Zone {
  id: string;
  name: string;
  code?: string;
  wards?: Ward[];
  createdAt?: string;
  updatedAt?: string;
}

interface Ward {
  id: string;
  name: string;
  code?: string;
  zoneId: string;
  zone?: Zone;
  pollingUnits?: PollingUnit[];
  createdAt?: string;
  updatedAt?: string;
}

interface PollingUnit {
  id: string;
  name: string;
  code?: string;
  wardId: string;
  ward?: Ward;
  latitude: number;
  longitude: number;
  registeredVoters?: number;
  createdAt?: string;
  updatedAt?: string;
  agent?: {
    id: string;
    name: string;
    email: string;
    status: string;
  } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: 'active' | 'inactive' | 'pending';
  pollingUnitId?: string;
  wardId?: string;
  zoneId?: string;
  pollingUnit?: PollingUnit;
  ward?: Ward;
  zone?: Zone;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  totalZones: number;
  totalWards: number;
  totalPollingUnits: number;
  totalAgents: number;
  totalWardAdmins: number;
  totalZoneAdmins: number;
  situationRoomUsers: number;
  systemAdmins: number;
  activeUsers: number;
  pendingApprovals: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Helper function to get the database role value
const getDatabaseRole = (roleKey: string): string => {
  switch (roleKey) {
    case ROLES.POLLING_AGENT:
      return 'Polling Agent';
    case ROLES.WARD_ADMIN:
      return 'Ward Admin';
    case ROLES.ZONE_ADMIN:
      return 'Zone Admin';
    case ROLES.SITUATION_ROOM:
      return 'Situation Room Admin';
    case ROLES.SYSTEM_ADMIN:
      return 'System Admin';
    default:
      return roleKey;
  }
};

export default function SystemAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalZones: 0,
    totalWards: 0,
    totalPollingUnits: 0,
    totalAgents: 0,
    totalWardAdmins: 0,
    totalZoneAdmins: 0,
    situationRoomUsers: 0,
    systemAdmins: 0,
    activeUsers: 0,
    pendingApprovals: 0,
  });
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Pagination states
  const [zonePagination, setZonePagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [pollingUnitPagination, setPollingUnitPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Filter states
  const [zoneSearch, setZoneSearch] = useState('');
  const [wardSearch, setWardSearch] = useState('');
  const [pollingUnitSearch, setPollingUnitSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Edit states
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [editingPollingUnit, setEditingPollingUnit] = useState<PollingUnit | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({
    open: false,
    type: '',
    id: '',
    name: ''
  });

  // View details
  const [viewingZone, setViewingZone] = useState<Zone | null>(null);
  const [viewingWard, setViewingWard] = useState<Ward | null>(null);
  const [viewingPollingUnit, setViewingPollingUnit] = useState<PollingUnit | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isCreateWardOpen, setIsCreateWardOpen] = useState(false);
  const [isCreatePollingUnitOpen, setIsCreatePollingUnitOpen] = useState(false);
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [isEditWardOpen, setIsEditWardOpen] = useState(false);
  const [isEditPollingUnitOpen, setIsEditPollingUnitOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isViewZoneOpen, setIsViewZoneOpen] = useState(false);
  const [isViewWardOpen, setIsViewWardOpen] = useState(false);
  const [isViewPollingUnitOpen, setIsViewPollingUnitOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    zoneId: '',
    wardId: '',
    pollingUnitId: '',
  });

  const [newZone, setNewZone] = useState({ name: '' });
  const [newWard, setNewWard] = useState({ name: '', zoneId: '' });
  const [newPollingUnit, setNewPollingUnit] = useState({ 
    name: '', 
    wardId: '', 
    latitude: '', 
    longitude: '' 
  });

  // Logs states
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPagination, setLogPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [logFilters, setLogFilters] = useState({
    action: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (showToast = false) => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch all data in parallel
      const [zonesRes, usersRes, statsRes, pollingUnitsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/zones`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/system/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/polling-units?limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        const zonesList = zonesData.zones || zonesData.data || [];
        setZones(zonesList);
        
        // Extract wards from zones
        const allWards: Ward[] = [];
        for (const zone of zonesList) {
          if (zone.wards) {
            allWards.push(...zone.wards);
          }
        }
        setWards(allWards);
      }

      if (pollingUnitsRes.ok) {
        const puData = await pollingUnitsRes.json();
        setPollingUnits(puData.data || []);
        setPollingUnitPagination(puData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const userList = usersData.users || usersData.data || [];
        setUsers(userList);
        
        // Calculate stats from actual data
        const newStats = {
          totalUsers: userList.length,
          totalZones: zones.length,
          totalWards: wards.length,
          totalPollingUnits: pollingUnits.length,
          totalAgents: userList.filter((u: User) => u.role === 'Polling Agent').length,
          totalWardAdmins: userList.filter((u: User) => u.role === 'Ward Admin').length,
          totalZoneAdmins: userList.filter((u: User) => u.role === 'Zone Admin').length,
          situationRoomUsers: userList.filter((u: User) => u.role === 'Situation Room Admin').length,
          systemAdmins: userList.filter((u: User) => u.role === 'System Admin').length,
          activeUsers: userList.length,
          pendingApprovals: 0,
        };
        setStats(newStats);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || statsData);
      }

      if (showToast) {
        toast({
          title: "Success",
          description: "Data refreshed successfully",
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchZonesPaginated = async (page: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/zones/paginated?page=${page - 1}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setZones(data.data || []);
        setZonePagination({
          page,
          limit: 10,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        });
      }
    } catch (error) {
      console.error('Error fetching paginated zones:', error);
    }
  };

  const fetchPollingUnits = async (page: number, filters?: any) => {
    try {
      const token = localStorage.getItem('authToken');
      let url = `${API_BASE_URL}/admin/polling-units?page=${page}&limit=10`;
      
      if (filters?.wardId) url += `&wardId=${filters.wardId}`;
      if (filters?.zoneId) url += `&zoneId=${filters.zoneId}`;
      if (filters?.search) url += `&search=${filters.search}`;
      if (filters?.hasAgent !== undefined) url += `&hasAgent=${filters.hasAgent}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPollingUnits(data.data || []);
        setPollingUnitPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Error fetching polling units:', error);
    }
  };

  const fetchUnassignedPollingUnits = async (page: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/polling-units/unassigned?page=${page}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPollingUnits(data.data || []);
        setPollingUnitPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Error fetching unassigned polling units:', error);
    }
  };

  const fetchWardsInZone = async (zoneId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/zones/${zoneId}/wards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWards(data.wards || []);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const handleCreateZone = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/zones`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newZone)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create zone');
      }

      toast({
        title: "Success",
        description: "Zone created successfully",
      });
      
      setIsCreateZoneOpen(false);
      setNewZone({ name: '' });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create zone",
        variant: "destructive",
      });
    }
  };

  const handleUpdateZone = async () => {
    if (!editingZone) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/zones/${editingZone.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editingZone.name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update zone');
      }

      toast({
        title: "Success",
        description: "Zone updated successfully",
      });
      
      setIsEditZoneOpen(false);
      setEditingZone(null);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update zone",
        variant: "destructive",
      });
    }
  };

  const handleCreateWard = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/wards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWard)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create ward');
      }

      toast({
        title: "Success",
        description: "Ward created successfully",
      });
      
      setIsCreateWardOpen(false);
      setNewWard({ name: '', zoneId: '' });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ward",
        variant: "destructive",
      });
    }
  };

  const handleUpdateWard = async () => {
    if (!editingWard) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/wards/${editingWard.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editingWard.name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update ward');
      }

      toast({
        title: "Success",
        description: "Ward updated successfully",
      });
      
      setIsEditWardOpen(false);
      setEditingWard(null);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update ward",
        variant: "destructive",
      });
    }
  };

  const handleCreatePollingUnit = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/polling-units`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newPollingUnit.name,
          wardId: newPollingUnit.wardId,
          latitude: parseFloat(newPollingUnit.latitude),
          longitude: parseFloat(newPollingUnit.longitude)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create polling unit');
      }

      toast({
        title: "Success",
        description: "Polling unit created successfully",
      });
      
      setIsCreatePollingUnitOpen(false);
      setNewPollingUnit({ name: '', wardId: '', latitude: '', longitude: '' });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create polling unit",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePollingUnit = async () => {
    if (!editingPollingUnit) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/polling-units/${editingPollingUnit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingPollingUnit.name,
          latitude: editingPollingUnit.latitude,
          longitude: editingPollingUnit.longitude
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update polling unit');
      }

      toast({
        title: "Success",
        description: "Polling unit updated successfully",
      });
      
      setIsEditPollingUnitOpen(false);
      setEditingPollingUnit(null);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update polling unit",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validate based on role
      if (newUser.role === ROLES.ZONE_ADMIN && !newUser.zoneId) {
        toast({
          title: "Validation Error",
          description: "Please select a zone for the Zone Admin",
          variant: "destructive",
        });
        return;
      }

      if (newUser.role === ROLES.WARD_ADMIN && !newUser.wardId) {
        toast({
          title: "Validation Error",
          description: "Please select a ward for the Ward Admin",
          variant: "destructive",
        });
        return;
      }

      if (newUser.role === ROLES.POLLING_AGENT && !newUser.pollingUnitId) {
        toast({
          title: "Validation Error",
          description: "Please select a polling unit for the Polling Agent",
          variant: "destructive",
        });
        return;
      }

      const token = localStorage.getItem('authToken');
      
      // Convert the role to the database format
      const userData = {
        name: newUser.name,
        email: newUser.email.toLowerCase(),
        password: newUser.password,
        role: getDatabaseRole(newUser.role),
        pollingUnitId: newUser.pollingUnitId || null,
        wardId: newUser.wardId || null,
        zoneId: newUser.zoneId || null,
      };

      console.log('📤 Sending user data:', userData);

      const response = await fetch(`${API_BASE_URL}/admin/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const responseData = await response.json();
      console.log('📥 Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create user');
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });
      
      setIsCreateUserOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: '',
        zoneId: '',
        wardId: '',
        pollingUnitId: '',
      });
      fetchAllData();
    } catch (error) {
      console.error('❌ Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          status: editingUser.status
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      
      setIsEditUserOpen(false);
      setEditingUser(null);
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = async () => {
    try {
      const token = localStorage.getItem('authToken');
      let pollingUnits;
      
      try {
        pollingUnits = JSON.parse(bulkImportData);
      } catch (e) {
        toast({
          title: "Error",
          description: "Invalid JSON format",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/polling-units/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pollingUnits })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import polling units');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "Bulk import completed",
      });
      
      setIsBulkImportOpen(false);
      setBulkImportData('');
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    
    try {
      const token = localStorage.getItem('authToken');
      let url = '';
      
      switch (type) {
        case 'zone':
          url = `${API_BASE_URL}/admin/zones/${id}`;
          break;
        case 'ward':
          url = `${API_BASE_URL}/admin/wards/${id}`;
          break;
        case 'pollingUnit':
          url = `${API_BASE_URL}/admin/polling-units/${id}`;
          break;
        case 'user':
          url = `${API_BASE_URL}/admin/users/${id}`;
          break;
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to delete ${type}`);
      }

      toast({
        title: "Success",
        description: `${type} deleted successfully`,
      });
      
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
      fetchAllData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to delete ${type}`,
        variant: "destructive",
      });
    }
  };

  // Fetch system logs
  const fetchSystemLogs = async (page = 1) => {
    try {
      setLogsLoading(true);
      const token = localStorage.getItem('authToken');
      let url = `${API_BASE_URL}/admin/logs?page=${page}&limit=20`;
      
      if (logFilters.action && logFilters.action !== 'all') {
        url += `&action=${logFilters.action}`;
      }
      if (logFilters.status && logFilters.status !== 'all') {
        url += `&status=${logFilters.status}`;
      }
      if (logFilters.startDate) {
        url += `&startDate=${logFilters.startDate}`;
      }
      if (logFilters.endDate) {
        url += `&endDate=${logFilters.endDate}`;
      }
      if (logFilters.search) {
        url += `&search=${logFilters.search}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
        setLogPagination(data.pagination || { 
          page: 1, 
          limit: 20, 
          total: 0, 
          totalPages: 0 
        });
        setAvailableActions(data.filters?.actions || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system logs",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  // Export logs as CSV
  const exportLogs = () => {
    if (logs.length === 0) {
      toast({
        title: "No Data",
        description: "No logs to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Action', 'User', 'Email', 'Target Type', 'Target Name', 'Details', 'Timestamp', 'Status'];
    const csvData = logs.map(log => [
      log.action,
      log.user?.name || log.userEmail || 'System',
      log.user?.email || log.userEmail || '',
      log.targetType || '',
      log.targetName || '',
      JSON.stringify(log.details || {}),
      new Date(log.createdAt).toLocaleString(),
      log.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Call fetchSystemLogs when the logs tab is first opened
  useEffect(() => {
    fetchSystemLogs();
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAssignmentDisplay = (user: User | null | undefined) => {
    if (!user) return '-';
    
    if (user.pollingUnit) {
      return user.pollingUnit.name;
    } else if (user.ward) {
      return user.ward.name;
    } else if (user.zone) {
      return user.zone.name;
    }
    return '-';
  };

  const getLocationDisplay = (user: User | null | undefined) => {
    if (!user) return '-';
    
    if (user.pollingUnit?.ward?.zone) {
      return `${user.pollingUnit.ward.zone.name} / ${user.pollingUnit.ward.name}`;
    } else if (user.ward?.zone) {
      return `${user.ward.zone.name} / ${user.ward.name}`;
    } else if (user.zone) {
      return user.zone.name;
    }
    return '-';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === getDatabaseRole(selectedRole);
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="System Administration" 
          subtitle="Loading system data..."
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="System Administration" 
        subtitle="Full system control and management"
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-green-600">{stats.activeUsers} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Zones</CardTitle>
              <Map className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalZones}</div>
              <p className="text-xs text-muted-foreground">{stats.totalZoneAdmins} admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wards</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWards}</div>
              <p className="text-xs text-muted-foreground">{stats.totalWardAdmins} admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Polling Units</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPollingUnits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.totalAgents} agents</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{stats.pendingApprovals}</div>
              <p className="text-xs text-yellow-700">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* User Distribution */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-700">Polling Agents</p>
                  <p className="text-xl font-bold text-blue-900">{stats.totalAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-700">Ward Admins</p>
                  <p className="text-xl font-bold text-green-900">{stats.totalWardAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Map className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-700">Zone Admins</p>
                  <p className="text-xl font-bold text-purple-900">{stats.totalZoneAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-orange-700">Situation Room</p>
                  <p className="text-xl font-bold text-orange-900">{stats.situationRoomUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-700">System Admins</p>
                  <p className="text-xl font-bold text-red-900">{stats.systemAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="zones" className="gap-2">
                <Map className="h-4 w-4" />
                Zones
              </TabsTrigger>
              <TabsTrigger value="wards" className="gap-2">
                <Building2 className="h-4 w-4" />
                Wards
              </TabsTrigger>
              <TabsTrigger value="polling-units" className="gap-2">
                <MapPin className="h-4 w-4" />
                Polling Units
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <Activity className="h-4 w-4" />
                System Logs
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsBulkImportOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all system users and their roles</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Create User Dialog */}
                    <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create New User</DialogTitle>
                          <DialogDescription>Add a new user to the system</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input 
                              id="name" 
                              value={newUser.name}
                              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                              placeholder="Enter full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                              id="email" 
                              type="email"
                              value={newUser.email}
                              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                              placeholder="Enter email address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                              id="password" 
                              type="password"
                              value={newUser.password}
                              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                              placeholder="Enter password"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select 
                              value={newUser.role} 
                              onValueChange={(value) => {
                                setNewUser({
                                  ...newUser, 
                                  role: value,
                                  zoneId: '',
                                  wardId: '',
                                  pollingUnitId: ''
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ROLES.POLLING_AGENT}>Polling Agent</SelectItem>
                                <SelectItem value={ROLES.WARD_ADMIN}>Ward Admin</SelectItem>
                                <SelectItem value={ROLES.ZONE_ADMIN}>Zone Admin</SelectItem>
                                <SelectItem value={ROLES.SITUATION_ROOM}>Situation Room</SelectItem>
                                <SelectItem value={ROLES.SYSTEM_ADMIN}>System Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Zone Admin Assignment */}
                          {newUser.role === ROLES.ZONE_ADMIN && (
                            <div className="space-y-2">
                              <Label>Assign Zone <span className="text-red-500">*</span></Label>
                              <Select 
                                value={newUser.zoneId} 
                                onValueChange={(value) => setNewUser({...newUser, zoneId: value})}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select zone" />
                                </SelectTrigger>
                                <SelectContent>
                                  {zones.map(zone => (
                                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!newUser.zoneId && (
                                <p className="text-xs text-red-500 mt-1">Zone is required for Zone Admin</p>
                              )}
                            </div>
                          )}

                          {/* Ward Admin Assignment */}
                          {newUser.role === ROLES.WARD_ADMIN && (
                            <div className="space-y-2">
                              <Label>Assign Ward <span className="text-red-500">*</span></Label>
                              <Select 
                                value={newUser.wardId} 
                                onValueChange={(value) => setNewUser({...newUser, wardId: value})}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ward" />
                                </SelectTrigger>
                                <SelectContent>
                                  {wards.map(ward => (
                                    <SelectItem key={ward.id} value={ward.id}>
                                      {ward.name} {ward.zone ? `(${ward.zone.name})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!newUser.wardId && (
                                <p className="text-xs text-red-500 mt-1">Ward is required for Ward Admin</p>
                              )}
                            </div>
                          )}

                          {/* Polling Agent Assignment */}
                          {newUser.role === ROLES.POLLING_AGENT && (
                            <div className="space-y-2">
                              <Label>Assign Polling Unit <span className="text-red-500">*</span></Label>
                              <Select 
                                value={newUser.pollingUnitId} 
                                onValueChange={(value) => setNewUser({...newUser, pollingUnitId: value})}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select polling unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pollingUnits.map(pu => (
                                    <SelectItem key={pu.id} value={pu.id}>
                                      {pu.name} {pu.ward ? `(${pu.ward.name})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!newUser.pollingUnitId && (
                                <p className="text-xs text-red-500 mt-1">Polling Unit is required for Polling Agent</p>
                              )}
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setIsCreateUserOpen(false);
                            setNewUser({
                              name: '',
                              email: '',
                              password: '',
                              role: '',
                              zoneId: '',
                              wardId: '',
                              pollingUnitId: '',
                            });
                          }}>Cancel</Button>
                          <Button 
                            onClick={handleCreateUser}
                            disabled={
                              !newUser.name || 
                              !newUser.email || 
                              !newUser.password || 
                              !newUser.role ||
                              (newUser.role === ROLES.ZONE_ADMIN && !newUser.zoneId) ||
                              (newUser.role === ROLES.WARD_ADMIN && !newUser.wardId) ||
                              (newUser.role === ROLES.POLLING_AGENT && !newUser.pollingUnitId)
                            }
                          >
                            Create User
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search users..." 
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value={ROLES.POLLING_AGENT}>Polling Agent</SelectItem>
                      <SelectItem value={ROLES.WARD_ADMIN}>Ward Admin</SelectItem>
                      <SelectItem value={ROLES.ZONE_ADMIN}>Zone Admin</SelectItem>
                      <SelectItem value={ROLES.SITUATION_ROOM}>Situation Room</SelectItem>
                      <SelectItem value={ROLES.SYSTEM_ADMIN}>System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{getAssignmentDisplay(user)}</TableCell>
                        <TableCell>{getLocationDisplay(user)}</TableCell>
                        <TableCell>{getStatusBadge(user.status || 'active')}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setViewingUser(user);
                                setIsViewUserOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingUser(user);
                                setIsEditUserOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'user',
                                  id: user.id,
                                  name: user.name
                                })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zones Tab */}
          <TabsContent value="zones">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Zone Management</CardTitle>
                    <CardDescription>Manage all electoral zones</CardDescription>
                  </div>
                  <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Zone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Zone</DialogTitle>
                        <DialogDescription>Add a new electoral zone</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Zone Name</Label>
                          <Input 
                            value={newZone.name}
                            onChange={(e) => setNewZone({ name: e.target.value })}
                            placeholder="Enter zone name"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateZoneOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateZone}>Create Zone</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search zones..."
                    value={zoneSearch}
                    onChange={(e) => setZoneSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Wards</TableHead>
                      <TableHead>Polling Units</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones
                      .filter(zone => zone.name.toLowerCase().includes(zoneSearch.toLowerCase()))
                      .map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell>{zone.wards?.length || 0}</TableCell>
                        <TableCell>
                          {zone.wards?.reduce((acc, ward) => acc + (ward.pollingUnits?.length || 0), 0) || 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {zone.createdAt ? new Date(zone.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setViewingZone(zone);
                                setIsViewZoneOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingZone(zone);
                                setIsEditZoneOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Zone
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'zone',
                                  id: zone.id,
                                  name: zone.name
                                })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Zone
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {zonePagination.totalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchZonesPaginated(zonePagination.page - 1)}
                      disabled={zonePagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {zonePagination.page} of {zonePagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchZonesPaginated(zonePagination.page + 1)}
                      disabled={zonePagination.page === zonePagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wards Tab */}
          <TabsContent value="wards">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ward Management</CardTitle>
                    <CardDescription>Manage all electoral wards</CardDescription>
                  </div>
                  <Dialog open={isCreateWardOpen} onOpenChange={setIsCreateWardOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ward
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Ward</DialogTitle>
                        <DialogDescription>Add a new electoral ward</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Ward Name</Label>
                          <Input 
                            value={newWard.name}
                            onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
                            placeholder="Enter ward name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Zone</Label>
                          <Select value={newWard.zoneId} onValueChange={(value) => setNewWard({ ...newWard, zoneId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select zone" />
                            </SelectTrigger>
                            <SelectContent>
                              {zones.map(zone => (
                                <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateWardOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateWard}>Create Ward</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4">
                  <Input
                    placeholder="Search wards..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select value={selectedZone} onValueChange={(value) => {
                    setSelectedZone(value);
                    if (value && value !== 'all') fetchWardsInZone(value);
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Polling Units</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards
                      .filter(ward => 
                        ward.name.toLowerCase().includes(wardSearch.toLowerCase()) &&
                        (selectedZone === 'all' || selectedZone === '' || ward.zoneId === selectedZone)
                      )
                      .map((ward) => (
                      <TableRow key={ward.id}>
                        <TableCell className="font-medium">{ward.name}</TableCell>
                        <TableCell>{ward.zone?.name || '-'}</TableCell>
                        <TableCell>{ward.pollingUnits?.length || 0}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ward.createdAt ? new Date(ward.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setViewingWard(ward);
                                setIsViewWardOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingWard(ward);
                                setIsEditWardOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Ward
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'ward',
                                  id: ward.id,
                                  name: ward.name
                                })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Ward
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polling Units Tab */}
          <TabsContent value="polling-units">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Polling Unit Management</CardTitle>
                    <CardDescription>Manage all polling units</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={showUnassigned ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowUnassigned(!showUnassigned);
                        if (!showUnassigned) {
                          fetchUnassignedPollingUnits(1);
                        } else {
                          fetchPollingUnits(1);
                        }
                      }}
                    >
                      {showUnassigned ? "Show All" : "Show Unassigned"}
                    </Button>
                    <Dialog open={isCreatePollingUnitOpen} onOpenChange={setIsCreatePollingUnitOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Polling Unit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Polling Unit</DialogTitle>
                          <DialogDescription>Add a new polling unit</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Polling Unit Name</Label>
                            <Input 
                              value={newPollingUnit.name}
                              onChange={(e) => setNewPollingUnit({ ...newPollingUnit, name: e.target.value })}
                              placeholder="Enter polling unit name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ward</Label>
                            <Select value={newPollingUnit.wardId} onValueChange={(value) => setNewPollingUnit({ ...newPollingUnit, wardId: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ward" />
                              </SelectTrigger>
                              <SelectContent>
                                {wards.map(ward => (
                                  <SelectItem key={ward.id} value={ward.id}>
                                    {ward.name} {ward.zone ? `(${ward.zone.name})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Latitude</Label>
                            <Input 
                              type="number"
                              step="any"
                              value={newPollingUnit.latitude}
                              onChange={(e) => setNewPollingUnit({ ...newPollingUnit, latitude: e.target.value })}
                              placeholder="e.g., 6.5244"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Longitude</Label>
                            <Input 
                              type="number"
                              step="any"
                              value={newPollingUnit.longitude}
                              onChange={(e) => setNewPollingUnit({ ...newPollingUnit, longitude: e.target.value })}
                              placeholder="e.g., 3.3792"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreatePollingUnitOpen(false)}>Cancel</Button>
                          <Button onClick={handleCreatePollingUnit}>Create Polling Unit</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4">
                  <Input
                    placeholder="Search polling units..."
                    value={pollingUnitSearch}
                    onChange={(e) => {
                      setPollingUnitSearch(e.target.value);
                      fetchPollingUnits(1, { search: e.target.value });
                    }}
                    className="max-w-sm"
                  />
                  <Select value={selectedZone} onValueChange={(value) => {
                    setSelectedZone(value);
                    fetchPollingUnits(1, { zoneId: value });
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedWard} onValueChange={(value) => {
                    setSelectedWard(value);
                    fetchPollingUnits(1, { wardId: value });
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by ward" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Wards</SelectItem>
                      {wards.map(ward => (
                        <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Coordinates</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pollingUnits.map((pu) => (
                      <TableRow key={pu.id}>
                        <TableCell className="font-medium">{pu.name}</TableCell>
                        <TableCell>{pu.code || '-'}</TableCell>
                        <TableCell>{pu.ward?.name || '-'}</TableCell>
                        <TableCell>{pu.ward?.zone?.name || '-'}</TableCell>
                        <TableCell>
                          {pu.latitude?.toFixed(4)}, {pu.longitude?.toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {pu.agent ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(pu.agent.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{pu.agent.name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pu.createdAt ? new Date(pu.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setViewingPollingUnit(pu);
                                setIsViewPollingUnitOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingPollingUnit(pu);
                                setIsEditPollingUnitOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Polling Unit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'pollingUnit',
                                  id: pu.id,
                                  name: pu.name
                                })}
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
                {pollingUnitPagination.totalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const filters = showUnassigned ? {} : { 
                          zoneId: selectedZone !== 'all' && selectedZone ? selectedZone : undefined,
                          wardId: selectedWard !== 'all' && selectedWard ? selectedWard : undefined,
                          search: pollingUnitSearch
                        };
                        if (showUnassigned) {
                          fetchUnassignedPollingUnits(pollingUnitPagination.page - 1);
                        } else {
                          fetchPollingUnits(pollingUnitPagination.page - 1, filters);
                        }
                      }}
                      disabled={pollingUnitPagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pollingUnitPagination.page} of {pollingUnitPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const filters = showUnassigned ? {} : { 
                          zoneId: selectedZone !== 'all' && selectedZone ? selectedZone : undefined,
                          wardId: selectedWard !== 'all' && selectedWard ? selectedWard : undefined,
                          search: pollingUnitSearch
                        };
                        if (showUnassigned) {
                          fetchUnassignedPollingUnits(pollingUnitPagination.page + 1);
                        } else {
                          fetchPollingUnits(pollingUnitPagination.page + 1, filters);
                        }
                      }}
                      disabled={pollingUnitPagination.page === pollingUnitPagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Logs</CardTitle>
                    <CardDescription>View all system activity logs</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setLogFilters({
                          action: '',
                          status: '',
                          startDate: '',
                          endDate: '',
                          search: ''
                        });
                        fetchSystemLogs(1);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Filters
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportLogs}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Logs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <Input
                    placeholder="Search logs..."
                    value={logFilters.search}
                    onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                    className="w-full"
                  />
                  <Select 
                    value={logFilters.action} 
                    onValueChange={(value) => setLogFilters({ ...logFilters, action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {availableActions.map(action => (
                        <SelectItem key={action} value={action}>{action.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={logFilters.status} 
                    onValueChange={(value) => setLogFilters({ ...logFilters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => fetchSystemLogs(1)}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>

                {/* Date Range Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={logFilters.startDate}
                      onChange={(e) => setLogFilters({ ...logFilters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={logFilters.endDate}
                      onChange={(e) => setLogFilters({ ...logFilters, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Logs Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="font-medium">{log.action.replace(/_/g, ' ')}</div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedLogDetails(log.details)}
                                >
                                  View Details
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.user ? (
                                <div>
                                  <p className="text-sm font-medium">{log.user.name}</p>
                                  <p className="text-xs text-muted-foreground">{log.user.email}</p>
                                </div>
                              ) : log.userEmail ? (
                                <span className="text-sm">{log.userEmail}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.targetName ? (
                                <div>
                                  <p className="text-sm">{log.targetName}</p>
                                  <p className="text-xs text-muted-foreground">{log.targetType}</p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.details ? (
                                <pre className="text-xs max-w-xs overflow-hidden bg-muted p-2 rounded">
                                  {JSON.stringify(log.details, null, 2).substring(0, 100)}
                                  {JSON.stringify(log.details).length > 100 ? '...' : ''}
                                </pre>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {log.status === 'success' ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {logPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((logPagination.page - 1) * logPagination.limit) + 1} to{' '}
                      {Math.min(logPagination.page * logPagination.limit, logPagination.total)} of{' '}
                      {logPagination.total} logs
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchSystemLogs(logPagination.page - 1)}
                        disabled={logPagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {logPagination.page} of {logPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchSystemLogs(logPagination.page + 1)}
                        disabled={logPagination.page === logPagination.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Log Details Dialog */}
            <Dialog open={!!selectedLogDetails} onOpenChange={() => setSelectedLogDetails(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Log Details</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  <pre className="text-sm bg-muted p-4 rounded-lg">
                    {JSON.stringify(selectedLogDetails, null, 2)}
                  </pre>
                </div>
                <DialogFooter>
                  <Button onClick={() => setSelectedLogDetails(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialogs */}
      <Dialog open={isEditZoneOpen} onOpenChange={setIsEditZoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input 
                value={editingZone?.name || ''}
                onChange={(e) => setEditingZone(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditZoneOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateZone}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditWardOpen} onOpenChange={setIsEditWardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ward Name</Label>
              <Input 
                value={editingWard?.name || ''}
                onChange={(e) => setEditingWard(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditWardOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateWard}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPollingUnitOpen} onOpenChange={setIsEditPollingUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Polling Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Polling Unit Name</Label>
              <Input 
                value={editingPollingUnit?.name || ''}
                onChange={(e) => setEditingPollingUnit(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input 
                type="number"
                step="any"
                value={editingPollingUnit?.latitude || ''}
                onChange={(e) => setEditingPollingUnit(prev => prev ? { 
                  ...prev, 
                  latitude: parseFloat(e.target.value) 
                } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input 
                type="number"
                step="any"
                value={editingPollingUnit?.longitude || ''}
                onChange={(e) => setEditingPollingUnit(prev => prev ? { 
                  ...prev, 
                  longitude: parseFloat(e.target.value) 
                } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPollingUnitOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePollingUnit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={editingUser?.name || ''}
                onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={editingUser?.email || ''}
                onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={editingUser?.role || ''} 
                onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, role: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Polling Agent">Polling Agent</SelectItem>
                  <SelectItem value="Ward Admin">Ward Admin</SelectItem>
                  <SelectItem value="Zone Admin">Zone Admin</SelectItem>
                  <SelectItem value="Situation Room Admin">Situation Room</SelectItem>
                  <SelectItem value="System Admin">System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editingUser?.status || ''} 
                onValueChange={(value) => setEditingUser(prev => prev ? { 
                  ...prev, 
                  status: value as 'active' | 'inactive' | 'pending' 
                } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialogs */}
      <Dialog open={isViewZoneOpen} onOpenChange={setIsViewZoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zone Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">ID:</div>
              <div className="col-span-2">{viewingZone?.id}</div>
              <div className="font-medium">Name:</div>
              <div className="col-span-2">{viewingZone?.name}</div>
              <div className="font-medium">Wards:</div>
              <div className="col-span-2">{viewingZone?.wards?.length || 0}</div>
              <div className="font-medium">Created:</div>
              <div className="col-span-2">
                {viewingZone?.createdAt ? new Date(viewingZone.createdAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewZoneOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewWardOpen} onOpenChange={setIsViewWardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ward Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">ID:</div>
              <div className="col-span-2">{viewingWard?.id}</div>
              <div className="font-medium">Name:</div>
              <div className="col-span-2">{viewingWard?.name}</div>
              <div className="font-medium">Zone:</div>
              <div className="col-span-2">{viewingWard?.zone?.name || '-'}</div>
              <div className="font-medium">Polling Units:</div>
              <div className="col-span-2">{viewingWard?.pollingUnits?.length || 0}</div>
              <div className="font-medium">Created:</div>
              <div className="col-span-2">
                {viewingWard?.createdAt ? new Date(viewingWard.createdAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewWardOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewPollingUnitOpen} onOpenChange={setIsViewPollingUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Polling Unit Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">ID:</div>
              <div className="col-span-2">{viewingPollingUnit?.id}</div>
              <div className="font-medium">Name:</div>
              <div className="col-span-2">{viewingPollingUnit?.name}</div>
              <div className="font-medium">Ward:</div>
              <div className="col-span-2">{viewingPollingUnit?.ward?.name || '-'}</div>
              <div className="font-medium">Zone:</div>
              <div className="col-span-2">{viewingPollingUnit?.ward?.zone?.name || '-'}</div>
              <div className="font-medium">Coordinates:</div>
              <div className="col-span-2">
                {viewingPollingUnit?.latitude?.toFixed(6)}, {viewingPollingUnit?.longitude?.toFixed(6)}
              </div>
              <div className="font-medium">Agent:</div>
              <div className="col-span-2">{viewingPollingUnit?.agent?.name || 'Unassigned'}</div>
              <div className="font-medium">Created:</div>
              <div className="col-span-2">
                {viewingPollingUnit?.createdAt ? new Date(viewingPollingUnit.createdAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewPollingUnitOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">ID:</div>
              <div className="col-span-2">{viewingUser?.id}</div>
              <div className="font-medium">Name:</div>
              <div className="col-span-2">{viewingUser?.name}</div>
              <div className="font-medium">Email:</div>
              <div className="col-span-2">{viewingUser?.email}</div>
              <div className="font-medium">Role:</div>
              <div className="col-span-2">{viewingUser?.role}</div>
              <div className="font-medium">Status:</div>
              <div className="col-span-2">{viewingUser?.status}</div>
              <div className="font-medium">Assignment:</div>
              <div className="col-span-2">{getAssignmentDisplay(viewingUser)}</div>
              <div className="font-medium">Created:</div>
              <div className="col-span-2">
                {viewingUser?.createdAt ? new Date(viewingUser.createdAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewUserOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Polling Units</DialogTitle>
            <DialogDescription>
              Paste JSON array of polling units. Format:{`[{"name":"string","wardId":"uuid","latitude":number,"longitude":number}]`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>JSON Data</Label>
              <textarea
                className="w-full h-64 p-2 border rounded-md font-mono text-sm"
                value={bulkImportData}
                onChange={(e) => setBulkImportData(e.target.value)}
                placeholder='[{"name":"PU 1","wardId":"uuid","latitude":6.5244,"longitude":3.3792}]'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteDialog.type} "{deleteDialog.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}