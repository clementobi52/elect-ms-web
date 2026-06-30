// app/admin/zone/agents/page.tsx
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  User,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Activity,
  MapPin as MapPinIcon,
  FileText,
  BarChart3,
  Award,
  Phone,
  Calendar,
} from 'lucide-react';
import { Agent, AgentStats } from '@/lib/api/agents';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgentsApi } from '@/lib/api/agents';
import AdminHeader from '@/components/admin/AdminHeader';

export default function ZoneAgentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getAgentsByZone, getAgentStats, updateAgentStatus, reconcileLocation } = useAgentsApi();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<AgentStats>({
    total: 0,
    online: 0,
    offline: 0,
    withResults: 0,
    withoutResults: 0,
  });
  const [zoneName, setZoneName] = useState<string>('');

  // Fetch agents and stats
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // Get agents for this zone
      const agentsResponse = await getAgentsByZone(user?.zoneId || '');
      
      console.log('📡 Agents Response:', agentsResponse);
      
      if (agentsResponse.success && agentsResponse.agents) {
        setAgents(agentsResponse.agents);
        
        // Calculate stats from the agents data
        const agentList = agentsResponse.agents;
        const newStats: AgentStats = {
          total: agentList.length,
          online: agentList.filter(a => a.status?.toLowerCase() === 'online').length,
          offline: agentList.filter(a => a.status?.toLowerCase() === 'offline').length,
          withResults: agentList.filter(a => (a.resultsSubmitted || 0) > 0).length,
          withoutResults: agentList.filter(a => (a.resultsSubmitted || 0) === 0).length,
        };
        setStats(newStats);
      }

      // Set zone name from user or first agent
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else if (agentsResponse.agents && agentsResponse.agents.length > 0) {
        const firstAgent = agentsResponse.agents[0];
        if (firstAgent.zoneName) {
          setZoneName(firstAgent.zoneName);
        }
      }
    } catch (error) {
      console.error('Error fetching zone agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, getAgentsByZone, toast]);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData(false);
  };

  // Handle status update
  const handleStatusUpdate = async (agentId: string, status: 'Online' | 'Offline') => {
    try {
      const response = await updateAgentStatus(agentId, status);
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Agent marked as ${status}`,
        });
        await fetchData(false);
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive",
      });
    }
  };

  // Handle location reconciliation
  const handleReconcileLocation = async (agentId: string) => {
    setIsReconciling(true);
    try {
      const response = await reconcileLocation(agentId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Location reconciled successfully",
        });
        setIsReconcileDialogOpen(false);
        await fetchData(false);
      }
    } catch (error) {
      console.error('Error reconciling location:', error);
      toast({
        title: "Error",
        description: "Failed to reconcile location",
        variant: "destructive",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Get unique polling units for filter
  const uniquePollingUnits = Array.from(new Set(agents.map(a => a.pollingUnitName))).filter(Boolean);

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.pollingUnitName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || agent.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesUnit = filterUnit === 'all' || agent.pollingUnitName === filterUnit;

    return matchesSearch && matchesStatus && matchesUnit;
  });

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    if (status?.toLowerCase() === 'online') {
      return <Badge className="bg-green-500 text-white">Online</Badge>;
    }
    return <Badge variant="secondary">Offline</Badge>;
  };

  // Get status dot
  const getStatusDot = (status: string) => {
    if (status?.toLowerCase() === 'online') {
      return <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block mr-1.5" />;
    }
    return <span className="h-2 w-2 rounded-full bg-gray-400 inline-block mr-1.5" />;
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterUnit('all');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Agents"
          subtitle="Manage polling agents across all wards in your zone"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
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
        title="Zone Agents"
        subtitle={`Manage polling agents across all wards in ${zoneName || 'your zone'}`}
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-600">{stats.online || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-gray-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.offline || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Results</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.withResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">No Results</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.withoutResults || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-yellow-600" />
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
                placeholder="Search agents by name, email, or polling unit..."
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
              {(filterStatus !== 'all' || filterUnit !== 'all' || searchTerm) && (
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
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Polling Unit</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                >
                  <option value="all">All Polling Units</option>
                  {uniquePollingUnits.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Polling Agents</CardTitle>
              <CardDescription>
                {agents.length === 0 ? 'No agents found' :
                  `Showing ${filteredAgents.length} of ${agents.length} agents`}
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
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No agents found in your zone</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No agents match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {agent.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPinIcon className="h-3 w-3" />
                            {agent.pollingUnitName || 'Unassigned'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getStatusDot(agent.status)}
                            {getStatusBadge(agent.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {agent.resultsSubmitted || 0} submitted
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {agent.lastActive || 'Never'}
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
                                  setSelectedAgent(agent);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(
                                  agent.id,
                                  agent.status === 'Online' ? 'Offline' : 'Online'
                                )}
                              >
                                {agent.status === 'Online' ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Mark Offline
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Mark Online
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setIsReconcileDialogOpen(true);
                                }}
                              >
                                <MapPinIcon className="h-4 w-4 mr-2" />
                                Reconcile Location
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  router.push(`/admin/agents/${agent.id}`);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
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

        {/* View Agent Dialog */}
        <Dialog open={isViewDialogOpen && selectedAgent !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Agent Details
              </DialogTitle>
              <DialogDescription>
                {selectedAgent?.name} - {selectedAgent?.email}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedAgent && (
                <div className="space-y-4 py-4">
                  {/* Agent Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-xl">
                        {getInitials(selectedAgent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedAgent.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedAgent.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusDot(selectedAgent.status)}
                        {getStatusBadge(selectedAgent.status)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Polling Unit</Label>
                      <p className="font-medium">{selectedAgent.pollingUnitName || 'Unassigned'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedAgent.wardName || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Results Submitted</Label>
                      <p className="font-medium">{selectedAgent.resultsSubmitted || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Active</Label>
                      <p className="font-medium">{selectedAgent.lastActive || 'Never'}</p>
                    </div>
                  </div>

                  {selectedAgent.location && (
                    <div>
                      <Label className="text-muted-foreground">Current Location</Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm">
                          Latitude: {selectedAgent.location.latitude}
                        </p>
                        <p className="text-sm">
                          Longitude: {selectedAgent.location.longitude}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Created At</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.createdAt ? new Date(selectedAgent.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.updatedAt ? new Date(selectedAgent.updatedAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button
                variant="default"
                onClick={() => {
                  setIsViewDialogOpen(false);
                  if (selectedAgent) {
                    setSelectedAgent(selectedAgent);
                    setIsReconcileDialogOpen(true);
                  }
                }}
              >
                <MapPinIcon className="h-4 w-4 mr-2" />
                Reconcile Location
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedAgent) {
                    handleStatusUpdate(
                      selectedAgent.id,
                      selectedAgent.status === 'Online' ? 'Offline' : 'Online'
                    );
                  }
                }}
              >
                {selectedAgent?.status === 'Online' ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Mark Offline
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Mark Online
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reconcile Location Dialog */}
        <Dialog open={isReconcileDialogOpen && selectedAgent !== null} onOpenChange={setIsReconcileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Reconcile Agent Location
              </DialogTitle>
              <DialogDescription>
                Update polling unit location based on agent's current GPS coordinates
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  This will update the polling unit's location to match the agent's current GPS coordinates.
                </p>
              </div>

              {selectedAgent && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Agent</Label>
                      <p className="font-medium">{selectedAgent.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Polling Unit</Label>
                      <p className="font-medium">{selectedAgent.pollingUnitName || 'Unassigned'}</p>
                    </div>
                  </div>

                  {selectedAgent.location ? (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Label className="text-muted-foreground">Current Location</Label>
                      <p className="text-sm mt-1">
                        Latitude: {selectedAgent.location.latitude}
                      </p>
                      <p className="text-sm">
                        Longitude: {selectedAgent.location.longitude}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        This agent has not shared their location yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReconcileDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedAgent && handleReconcileLocation(selectedAgent.id)}
                disabled={isReconciling || !selectedAgent?.location}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReconciling ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MapPinIcon className="h-4 w-4 mr-2" />
                )}
                {isReconciling ? 'Reconciling...' : 'Reconcile Location'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}