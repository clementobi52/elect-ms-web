"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Users, MapPin, Building2, Map, Activity, RefreshCw, Loader2, Upload, Clock, Flag } from 'lucide-react';

// Import components
import { UserDistributionCards } from '@/components/admin/system-admin/charts/UserDistributionCards';
import { UsersTab } from '@/components/admin/system-admin/tabs/UsersTab';
import { ZonesTab } from '@/components/admin/system-admin/tabs/ZonesTab';
import { WardsTab } from '@/components/admin/system-admin/tabs/WardsTab';
import { PollingUnitsTab } from '@/components/admin/system-admin/tabs/PollingUnitsTab';
import { LogsTab } from '@/components/admin/system-admin/tabs/LogsTab';
import { BulkImportDialog } from '@/components/admin/system-admin/dialogs/BulkImportDialog';
import { DeleteConfirmationDialog } from '@/components/admin/system-admin/dialogs/DeleteConfirmationDialog';
import { PartiesTab } from '@/components/admin/system-admin/tabs/PartiesTab';

// Import types
import { Zone, Ward, PollingUnit, User, SystemStats, Pagination, LogFilters, Party } from '@/components/admin/system-admin/types';
import { ROLES } from '@/lib/types';

// API functions
import { 
  fetchAllData, 
  fetchZonesPaginated, 
  fetchPollingUnits, 
  fetchUnassignedPollingUnits, 
  fetchWardsInZone,
  fetchSystemLogs,
  exportLogs as exportLogsUtil,
  deleteZone,
  deleteWard,
  deletePollingUnit,
  deleteUser,
  bulkImportPollingUnits,
  fetchParties,
  deleteParty
} from '@/lib/system-admin/api';

export default function SystemAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0, totalZones: 0, totalWards: 0, totalPollingUnits: 0,
    totalAgents: 0, totalWardAdmins: 0, totalZoneAdmins: 0,
    situationRoomUsers: 0, systemAdmins: 0, activeUsers: 0, pendingApprovals: 0,
  });

  const [zones, setZones] = useState<Zone[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  // Pagination states
  const [zonePagination, setZonePagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [pollingUnitPagination, setPollingUnitPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [logPagination, setLogPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Filter states
  const [zoneSearch, setZoneSearch] = useState('');
  const [wardSearch, setWardSearch] = useState('');
  const [pollingUnitSearch, setPollingUnitSearch] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Log filters
  const [logFilters, setLogFilters] = useState<LogFilters>({
    action: '', status: '', startDate: '', endDate: '', search: ''
  });

  // UI states
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({
    open: false, type: '', id: '', name: ''
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Fetch all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (showToast = false) => {
    setRefreshing(true);
    try {
      const [data, partiesData] = await Promise.all([
        fetchAllData(API_BASE_URL),
        fetchParties(API_BASE_URL)
      ]);
      
      setZones(data.zones || []);
      setWards(data.wards || []);
      setPollingUnits(data.pollingUnits || []);
      setUsers(data.users || []);
      
      // Safely set stats with fallback values
      setStats({
        totalUsers: data.stats?.totalUsers || 0,
        totalZones: data.stats?.totalZones || 0,
        totalWards: data.stats?.totalWards || 0,
        totalPollingUnits: data.stats?.totalPollingUnits || 0,
        totalAgents: data.stats?.totalAgents || 0,
        totalWardAdmins: data.stats?.totalWardAdmins || 0,
        totalZoneAdmins: data.stats?.totalZoneAdmins || 0,
        situationRoomUsers: data.stats?.situationRoomUsers || 0,
        systemAdmins: data.stats?.systemAdmins || 0,
        activeUsers: data.stats?.activeUsers || 0,
        pendingApprovals: data.stats?.pendingApprovals || 0,
      });
      
      setParties(partiesData || []);
      setPollingUnitPagination(data.pollingUnitPagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      
      if (showToast) {
        toast({ title: "Success", description: "Data refreshed successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadZonesPaginated = async (page: number) => {
    try {
      const data = await fetchZonesPaginated(API_BASE_URL, page);
      setZones(data.data || []);
      setZonePagination({
        page,
        limit: 10,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load zones", variant: "destructive" });
    }
  };

  const loadPollingUnits = async (page: number, filters?: any) => {
    try {
      const data = await fetchPollingUnits(API_BASE_URL, page, filters);
      setPollingUnits(data.data || []);
      setPollingUnitPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 0 });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load polling units", variant: "destructive" });
    }
  };

  const loadUnassignedPollingUnits = async (page: number) => {
    try {
      const data = await fetchUnassignedPollingUnits(API_BASE_URL, page);
      setPollingUnits(data.data || []);
      setPollingUnitPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 0 });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load unassigned polling units", variant: "destructive" });
    }
  };

  const loadWardsInZone = async (zoneId: string) => {
    try {
      const data = await fetchWardsInZone(API_BASE_URL, zoneId);
      setWards(data.wards || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load wards", variant: "destructive" });
    }
  };

  const loadSystemLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const data = await fetchSystemLogs(API_BASE_URL, page, logFilters);
      setLogs(data.data || []);
      setLogPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      setAvailableActions(data.filters?.actions || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch system logs", variant: "destructive" });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string, name: string) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteDialog;
    
    try {
      let response;
      switch (type) {
        case 'zone':
          response = await deleteZone(API_BASE_URL, id);
          break;
        case 'ward':
          response = await deleteWard(API_BASE_URL, id);
          break;
        case 'pollingUnit':
          response = await deletePollingUnit(API_BASE_URL, id);
          break;
        case 'user':
          response = await deleteUser(API_BASE_URL, id);
          break;
        case 'party':
          response = await deleteParty(API_BASE_URL, id);
          break;
        default:
          return;
      }
      
      toast({ title: "Success", description: `${type} deleted successfully` });
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
      await loadAllData();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : `Failed to delete ${type}`, 
        variant: "destructive" 
      });
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
    }
  };

  const handleBulkImport = async () => {
    try {
      let pollingUnits;
      try {
        pollingUnits = JSON.parse(bulkImportData);
      } catch (e) {
        toast({ title: "Error", description: "Invalid JSON format", variant: "destructive" });
        return;
      }

      if (!Array.isArray(pollingUnits) || pollingUnits.length === 0) {
        toast({ title: "Error", description: "Please provide an array of polling units", variant: "destructive" });
        return;
      }

      await bulkImportPollingUnits(API_BASE_URL, pollingUnits);
      toast({ title: "Success", description: "Bulk import completed" });
      setIsBulkImportOpen(false);
      setBulkImportData('');
      await loadAllData();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to import", 
        variant: "destructive" 
      });
    }
  };

  const exportLogs = () => {
    exportLogsUtil(logs);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span>;
      case 'inactive': return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Inactive</span>;
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pending</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  const getAssignmentDisplay = (user: User | null) => {
    if (!user) return '-';
    if (user.pollingUnit) return user.pollingUnit.name;
    if (user.ward) return user.ward.name;
    if (user.zone) return user.zone.name;
    return '-';
  };

  const getLocationDisplay = (user: User | null) => {
    if (!user) return '-';
    if (user.pollingUnit?.ward?.zone) return `${user.pollingUnit.ward.zone.name} / ${user.pollingUnit.ward.name}`;
    if (user.ward?.zone) return `${user.ward.zone.name} / ${user.ward.name}`;
    if (user.zone) return user.zone.name;
    return '-';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="System Administration" subtitle="Loading system data..." />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader title="System Administration" subtitle="Full system control and management" />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers?.toLocaleString() || '0'}</div>
                <p className="text-xs text-green-600">{stats.activeUsers || 0} active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Zones</CardTitle>
                <Map className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalZones?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">{stats.totalZoneAdmins || 0} admins</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Wards</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWards?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">{stats.totalWardAdmins || 0} admins</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Polling Units</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPollingUnits?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">{stats.totalAgents || 0} agents</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">{stats.pendingApprovals?.toLocaleString() || '0'}</div>
                <p className="text-xs text-yellow-700">Require attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Distribution Cards */}
        {stats && <UserDistributionCards stats={stats} />}

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
              <TabsTrigger value="zones" className="gap-2"><Map className="h-4 w-4" /> Zones</TabsTrigger>
              <TabsTrigger value="wards" className="gap-2"><Building2 className="h-4 w-4" /> Wards</TabsTrigger>
              <TabsTrigger value="polling-units" className="gap-2"><MapPin className="h-4 w-4" /> Polling Units</TabsTrigger>
              <TabsTrigger value="parties" className="gap-2"><Flag className="h-4 w-4" /> Parties</TabsTrigger>
              <TabsTrigger value="logs" className="gap-2"><Activity className="h-4 w-4" /> System Logs</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadAllData(true)} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>

          <TabsContent value="users">
            <UsersTab
              users={filteredUsers}
              zones={zones}
              wards={wards}
              pollingUnits={pollingUnits}
              onRefresh={() => loadAllData()}
              onDelete={handleDelete}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              getInitials={getInitials}
              getStatusBadge={getStatusBadge}
              getAssignmentDisplay={getAssignmentDisplay}
              getLocationDisplay={getLocationDisplay}
            />
          </TabsContent>

          <TabsContent value="zones">
            <ZonesTab
              zones={zones}
              pagination={zonePagination}
              onPageChange={loadZonesPaginated}
              onRefresh={() => loadAllData()}
              onDelete={handleDelete}
              searchQuery={zoneSearch}
              setSearchQuery={setZoneSearch}
            />
          </TabsContent>

          <TabsContent value="wards">
            <WardsTab
              wards={wards}
              zones={zones}
              onRefresh={() => loadAllData()}
              onDelete={handleDelete}
              onFetchWardsInZone={loadWardsInZone}
              searchQuery={wardSearch}
              setSearchQuery={setWardSearch}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
            />
          </TabsContent>

          <TabsContent value="polling-units">
            <PollingUnitsTab
              pollingUnits={pollingUnits}
              wards={wards}
              zones={zones}
              pagination={pollingUnitPagination}
              showUnassigned={showUnassigned}
              onToggleUnassigned={() => {
                setShowUnassigned(!showUnassigned);
                if (!showUnassigned) {
                  loadUnassignedPollingUnits(1);
                } else {
                  loadPollingUnits(1);
                }
              }}
              onPageChange={loadPollingUnits}
              onRefresh={() => loadAllData()}
              onDelete={handleDelete}
              onFetchPollingUnits={loadPollingUnits}
              searchQuery={pollingUnitSearch}
              setSearchQuery={setPollingUnitSearch}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
              selectedWard={selectedWard}
              setSelectedWard={setSelectedWard}
              getInitials={getInitials}
            />
          </TabsContent>

          <TabsContent value="parties">
            <PartiesTab
              parties={parties}
              onRefresh={() => loadAllData()}
              onDelete={handleDelete}
              searchQuery={partySearch}
              setSearchQuery={setPartySearch}
            />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab
              logs={logs}
              loading={logsLoading}
              pagination={logPagination}
              filters={logFilters}
              availableActions={availableActions}
              onFilterChange={setLogFilters}
              onFetchLogs={loadSystemLogs}
              onResetFilters={() => {
                setLogFilters({ action: '', status: '', startDate: '', endDate: '', search: '' });
                loadSystemLogs(1);
              }}
              onExportLogs={exportLogs}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        data={bulkImportData}
        onDataChange={setBulkImportData}
        onImport={handleBulkImport}
      />

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        type={deleteDialog.type}
        name={deleteDialog.name}
        onConfirm={confirmDelete}
      />
    </div>
  );
}