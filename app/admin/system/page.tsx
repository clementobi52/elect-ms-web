"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { ROLES, getRoleDisplayName, getRoleBadgeColor } from '@/lib/types';
import { 
  Users, 
  MapPin, 
  FileText, 
  AlertTriangle, 
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
  Settings,
  Shield,
  Database,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

// Demo data for System Admin
const systemStats = {
  totalUsers: 2520,
  totalZones: 12,
  totalWards: 96,
  totalPollingUnits: 2400,
  totalAgents: 2350,
  totalWardAdmins: 96,
  totalZoneAdmins: 12,
  situationRoomUsers: 8,
  systemAdmins: 4,
  activeUsers: 2180,
  pendingApprovals: 15,
};

const allUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: ROLES.POLLING_AGENT, status: 'active', assignedTo: 'PU-001', zone: 'Zone A', ward: 'Ward 1', createdAt: '2024-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: ROLES.POLLING_AGENT, status: 'active', assignedTo: 'PU-002', zone: 'Zone A', ward: 'Ward 1', createdAt: '2024-01-16' },
  { id: '3', name: 'Alice Johnson', email: 'alice@example.com', role: ROLES.WARD_ADMIN, status: 'active', assignedTo: 'Ward 1', zone: 'Zone A', ward: 'Ward 1', createdAt: '2024-01-10' },
  { id: '4', name: 'Bob Williams', email: 'bob@example.com', role: ROLES.ZONE_ADMIN, status: 'active', assignedTo: 'Zone A', zone: 'Zone A', ward: '-', createdAt: '2024-01-05' },
  { id: '5', name: 'Carol White', email: 'carol@example.com', role: ROLES.SITUATION_ROOM, status: 'active', assignedTo: 'HQ', zone: '-', ward: '-', createdAt: '2024-01-01' },
  { id: '6', name: 'David Brown', email: 'david@example.com', role: ROLES.SYSTEM_ADMIN, status: 'active', assignedTo: 'System', zone: '-', ward: '-', createdAt: '2024-01-01' },
  { id: '7', name: 'Eva Green', email: 'eva@example.com', role: ROLES.POLLING_AGENT, status: 'inactive', assignedTo: 'PU-045', zone: 'Zone B', ward: 'Ward 5', createdAt: '2024-02-01' },
  { id: '8', name: 'Frank Miller', email: 'frank@example.com', role: ROLES.WARD_ADMIN, status: 'pending', assignedTo: 'Ward 3', zone: 'Zone A', ward: 'Ward 3', createdAt: '2024-03-01' },
];

const zones = [
  { id: '1', name: 'Zone A', code: 'ZA', wards: 12, pollingUnits: 280, admin: 'Bob Williams', status: 'active' },
  { id: '2', name: 'Zone B', code: 'ZB', wards: 10, pollingUnits: 220, admin: 'Mike Johnson', status: 'active' },
  { id: '3', name: 'Zone C', code: 'ZC', wards: 8, pollingUnits: 180, admin: 'Sarah Davis', status: 'active' },
  { id: '4', name: 'Zone D', code: 'ZD', wards: 11, pollingUnits: 250, admin: 'Tom Wilson', status: 'active' },
  { id: '5', name: 'Zone E', code: 'ZE', wards: 9, pollingUnits: 200, admin: 'Lisa Anderson', status: 'active' },
  { id: '6', name: 'Zone F', code: 'ZF', wards: 7, pollingUnits: 160, admin: 'James Taylor', status: 'active' },
];

const wards = [
  { id: '1', name: 'Ward 1', code: 'W1', zone: 'Zone A', pollingUnits: 25, admin: 'Alice Johnson', status: 'active' },
  { id: '2', name: 'Ward 2', code: 'W2', zone: 'Zone A', pollingUnits: 22, admin: 'Mark Brown', status: 'active' },
  { id: '3', name: 'Ward 3', code: 'W3', zone: 'Zone A', pollingUnits: 28, admin: 'Pending', status: 'pending' },
  { id: '4', name: 'Ward 4', code: 'W4', zone: 'Zone B', pollingUnits: 20, admin: 'Emma White', status: 'active' },
  { id: '5', name: 'Ward 5', code: 'W5', zone: 'Zone B', pollingUnits: 24, admin: 'Chris Lee', status: 'active' },
];

const pollingUnits = [
  { id: '1', name: 'Polling Unit 001', code: 'PU-001', ward: 'Ward 1', zone: 'Zone A', registeredVoters: 450, agent: 'John Doe', status: 'active', latitude: 6.5244, longitude: 3.3792 },
  { id: '2', name: 'Polling Unit 002', code: 'PU-002', ward: 'Ward 1', zone: 'Zone A', registeredVoters: 380, agent: 'Jane Smith', status: 'active', latitude: 6.5250, longitude: 3.3800 },
  { id: '3', name: 'Polling Unit 003', code: 'PU-003', ward: 'Ward 2', zone: 'Zone A', registeredVoters: 520, agent: 'Unassigned', status: 'pending', latitude: 6.5260, longitude: 3.3810 },
  { id: '4', name: 'Polling Unit 004', code: 'PU-004', ward: 'Ward 3', zone: 'Zone A', registeredVoters: 290, agent: 'Mike Wilson', status: 'active', latitude: 6.5270, longitude: 3.3820 },
];

const systemLogs = [
  { id: '1', action: 'User Created', user: 'admin@system.com', target: 'new.agent@example.com', timestamp: '2024-03-15 10:30:00', status: 'success' },
  { id: '2', action: 'Role Updated', user: 'admin@system.com', target: 'john@example.com', timestamp: '2024-03-15 10:25:00', status: 'success' },
  { id: '3', action: 'Zone Created', user: 'admin@system.com', target: 'Zone F', timestamp: '2024-03-15 10:20:00', status: 'success' },
  { id: '4', action: 'Login Failed', user: 'unknown@test.com', target: '-', timestamp: '2024-03-15 10:15:00', status: 'failed' },
  { id: '5', action: 'Bulk Import', user: 'admin@system.com', target: '50 polling units', timestamp: '2024-03-15 10:00:00', status: 'success' },
];

export default function SystemAdminDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    zoneId: '',
    wardId: '',
    pollingUnitId: '',
  });

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

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = () => {
    console.log('Creating user:', newUser);
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
  };

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
              <div className="text-2xl font-bold">{systemStats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-green-600">{systemStats.activeUsers} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Zones</CardTitle>
              <Map className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalZones}</div>
              <p className="text-xs text-muted-foreground">{systemStats.totalZoneAdmins} admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wards</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalWards}</div>
              <p className="text-xs text-muted-foreground">{systemStats.totalWardAdmins} admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Polling Units</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalPollingUnits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{systemStats.totalAgents} agents</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{systemStats.pendingApprovals}</div>
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
                  <p className="text-xl font-bold text-blue-900">{systemStats.totalAgents}</p>
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
                  <p className="text-xl font-bold text-green-900">{systemStats.totalWardAdmins}</p>
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
                  <p className="text-xl font-bold text-purple-900">{systemStats.totalZoneAdmins}</p>
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
                  <p className="text-xl font-bold text-orange-900">{systemStats.situationRoomUsers}</p>
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
                  <p className="text-xl font-bold text-red-900">{systemStats.systemAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
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
                            <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
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
                          {newUser.role === ROLES.ZONE_ADMIN && (
                            <div className="space-y-2">
                              <Label>Assign Zone</Label>
                              <Select value={newUser.zoneId} onValueChange={(value) => setNewUser({...newUser, zoneId: value})}>
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
                          )}
                          {newUser.role === ROLES.WARD_ADMIN && (
                            <div className="space-y-2">
                              <Label>Assign Ward</Label>
                              <Select value={newUser.wardId} onValueChange={(value) => setNewUser({...newUser, wardId: value})}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ward" />
                                </SelectTrigger>
                                <SelectContent>
                                  {wards.map(ward => (
                                    <SelectItem key={ward.id} value={ward.id}>{ward.name} ({ward.zone})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {newUser.role === ROLES.POLLING_AGENT && (
                            <div className="space-y-2">
                              <Label>Assign Polling Unit</Label>
                              <Select value={newUser.pollingUnitId} onValueChange={(value) => setNewUser({...newUser, pollingUnitId: value})}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select polling unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pollingUnits.map(pu => (
                                    <SelectItem key={pu.id} value={pu.id}>{pu.name} ({pu.ward})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Cancel</Button>
                          <Button onClick={handleCreateUser}>Create User</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
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
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Zone</TableHead>
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
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.assignedTo}</TableCell>
                        <TableCell>{user.zone}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{user.createdAt}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
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
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Zone
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Wards</TableHead>
                      <TableHead>Polling Units</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell>{zone.code}</TableCell>
                        <TableCell>{zone.wards}</TableCell>
                        <TableCell>{zone.pollingUnits}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(zone.admin)}</AvatarFallback>
                            </Avatar>
                            {zone.admin}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(zone.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Zone</DropdownMenuItem>
                              <DropdownMenuItem>Assign Admin</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">Delete Zone</DropdownMenuItem>
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

          {/* Wards Tab */}
          <TabsContent value="wards">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ward Management</CardTitle>
                    <CardDescription>Manage all electoral wards</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ward
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Polling Units</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards.map((ward) => (
                      <TableRow key={ward.id}>
                        <TableCell className="font-medium">{ward.name}</TableCell>
                        <TableCell>{ward.code}</TableCell>
                        <TableCell>{ward.zone}</TableCell>
                        <TableCell>{ward.pollingUnits}</TableCell>
                        <TableCell>
                          {ward.admin === 'Pending' ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Unassigned</Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{getInitials(ward.admin)}</AvatarFallback>
                              </Avatar>
                              {ward.admin}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(ward.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Ward</DropdownMenuItem>
                              <DropdownMenuItem>Assign Admin</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">Delete Ward</DropdownMenuItem>
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
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Polling Unit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Registered Voters</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pollingUnits.map((pu) => (
                      <TableRow key={pu.id}>
                        <TableCell className="font-medium">{pu.name}</TableCell>
                        <TableCell>{pu.code}</TableCell>
                        <TableCell>{pu.ward}</TableCell>
                        <TableCell>{pu.zone}</TableCell>
                        <TableCell>{pu.registeredVoters.toLocaleString()}</TableCell>
                        <TableCell>
                          {pu.agent === 'Unassigned' ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Unassigned</Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{getInitials(pu.agent)}</AvatarFallback>
                              </Avatar>
                              {pu.agent}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(pu.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Polling Unit</DropdownMenuItem>
                              <DropdownMenuItem>Assign Agent</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Logs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.target}</TableCell>
                        <TableCell className="text-muted-foreground">{log.timestamp}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
