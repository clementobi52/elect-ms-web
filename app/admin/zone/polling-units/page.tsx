// app/admin/zone/polling-units/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Globe,
  Users,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Mail,
  CheckCircle,
  Clock,
  Shield,
  FileText,
  BarChart3,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  MapPin as MapPinIcon,
  Calendar,
  UserCheck,
  UserX,
  Plus,
  Upload,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { pollingUnitsApi, PollingUnit, PollingUnitStats } from '@/lib/api/pollingUnits';

export default function ZonePollingUnitsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<PollingUnit | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWard, setFilterWard] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
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
  const [zoneName, setZoneName] = useState<string>('');

  // Fetch polling units and stats
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // Get polling units for this zone
      const response = await pollingUnitsApi.getPollingUnitsByZone(user?.zoneId || '');
      
      console.log('📡 Polling Units Response:', response);
      
      if (response.success && response.pollingUnits) {
        setPollingUnits(response.pollingUnits);
        
        // Calculate stats from the data
        const units = response.pollingUnits;
        const newStats: PollingUnitStats = {
          total: units.length,
          withAgents: units.filter(u => u.agentId).length,
          withoutAgents: units.filter(u => !u.agentId).length,
          withResults: units.filter(u => u.resultStatus !== 'Not Submitted').length,
          withoutResults: units.filter(u => u.resultStatus === 'Not Submitted').length,
          verifiedResults: units.filter(u => u.resultStatus === 'Verified').length,
          pendingResults: units.filter(u => u.resultStatus === 'Pending').length,
          rejectedResults: units.filter(u => u.resultStatus === 'Rejected').length,
        };
        setStats(newStats);
      }

      // Set zone name from user
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }
    } catch (error) {
      console.error('Error fetching polling units:', error);
      toast({
        title: "Error",
        description: "Failed to load polling units",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData(false);
  };

  // Get unique wards for filter
  const uniqueWards = Array.from(new Set(pollingUnits.map(u => u.wardName))).filter(Boolean);

  // Filter polling units
  const filteredUnits = pollingUnits.filter(unit => {
    const matchesSearch =
      unit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.wardName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.agentName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || unit.agentStatus?.toLowerCase() === filterStatus.toLowerCase();
    const matchesWard = filterWard === 'all' || unit.wardName === filterWard;

    return matchesSearch && matchesStatus && matchesWard;
  });

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

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterWard('all');
  };

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              {(filterStatus !== 'all' || filterWard !== 'all' || searchTerm) && (
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
                <Label className="text-xs text-muted-foreground">Agent Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
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
                  value={filterWard}
                  onChange={(e) => setFilterWard(e.target.value)}
                >
                  <option value="all">All Wards</option>
                  {uniqueWards.map((ward) => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
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
                  `Showing ${filteredUnits.length} of ${pollingUnits.length} units`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            {pollingUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No polling units found in your zone</p>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No polling units match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
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
                      {getResultStatusBadge(selectedUnit.resultStatus)}
                    </div>
                  </div>

                  {/* Location */}
                  {selectedUnit.location && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm">
                          Latitude: {selectedUnit.location.latitude}
                        </p>
                        <p className="text-sm">
                          Longitude: {selectedUnit.location.longitude}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4">
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

            <DialogFooter className="gap-2">
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