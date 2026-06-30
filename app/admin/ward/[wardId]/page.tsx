// app/admin/ward/[wardId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { MessagingWidget } from '@/components/admin/MessagingWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
  RefreshCw,
  MapPin,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Filter,
  Eye,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface WardStats {
  totalAgents: number;
  totalPollingUnits: number;
  activeAgents: number;
  offlineAgents: number;
  totalResults: number;
  pendingResults: number;
  approvedResults: number;
  rejectedResults: number;
  totalIncidents: number;
  criticalIncidents: number;
}

interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agentName?: string;
  agentId?: string;
  agentStatus?: 'Online' | 'Offline';
  resultsSubmitted: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface WardAdmin {
  id: string;
  name: string;
  email: string;
  status: 'Online' | 'Offline';
  lastActive: string;
}

export default function WardDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const wardId = params.wardId as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wardName, setWardName] = useState<string>('');
  const [wardStats, setWardStats] = useState<WardStats>({
    totalAgents: 0,
    totalPollingUnits: 0,
    activeAgents: 0,
    offlineAgents: 0,
    totalResults: 0,
    pendingResults: 0,
    approvedResults: 0,
    rejectedResults: 0,
    totalIncidents: 0,
    criticalIncidents: 0,
  });
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [wardAdmin, setWardAdmin] = useState<WardAdmin | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);

  // Messaging Modal State
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Fetch ward details
  const fetchWardDetails = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch ward details
      const wardResponse = await fetch(`${API_BASE_URL}/admin/wards/${wardId}`, { headers });
      if (wardResponse.ok) {
        const data = await wardResponse.json();
        setWardName(data.name);
      }

      // Fetch ward stats
      const statsResponse = await fetch(`${API_BASE_URL}/admin/ward/${wardId}/stats`, { headers });
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setWardStats(data);
      }

      // Fetch polling units
      const unitsResponse = await fetch(`${API_BASE_URL}/admin/ward/${wardId}/polling-units`, { headers });
      if (unitsResponse.ok) {
        const data = await unitsResponse.json();
        setPollingUnits(data);
      }

      // Fetch incidents for this ward
      const incidentsResponse = await fetch(`${API_BASE_URL}/admin/ward/${wardId}/incidents`, { headers });
      if (incidentsResponse.ok) {
        const data = await incidentsResponse.json();
        setRecentIncidents(data.slice(0, 5));
      }

      // Fetch ward admin - Use the correct endpoint
      try {
        // First, try to get ward admins from the zone endpoint if we have zoneId
        if (user?.zoneId) {
          const zoneAdminsResponse = await fetch(`${API_BASE_URL}/admin/zone/${user.zoneId}/ward-admins`, { headers });
          if (zoneAdminsResponse.ok) {
            const data = await zoneAdminsResponse.json();
            if (data.wardAdmins && data.wardAdmins.length > 0) {
              const wardAdminData = data.wardAdmins.find((admin: any) => admin.wardId === wardId);
              if (wardAdminData) {
                setWardAdmin({
                  id: wardAdminData.id,
                  name: wardAdminData.name,
                  email: wardAdminData.email,
                  status: wardAdminData.status || 'Offline',
                  lastActive: wardAdminData.lastActive || 'Unknown'
                });
              }
            }
          }
        }

        // If not found, try to get from ward details (some APIs return admin info)
        if (!wardAdmin) {
          const wardDetailsResponse = await fetch(`${API_BASE_URL}/admin/wards/${wardId}`, { headers });
          if (wardDetailsResponse.ok) {
            const data = await wardDetailsResponse.json();
            if (data.adminId && data.adminName) {
              setWardAdmin({
                id: data.adminId,
                name: data.adminName,
                email: data.adminEmail || '',
                status: 'Offline',
                lastActive: 'Unknown'
              });
            }
          }
        }
      } catch (adminError) {
        console.log('Error fetching ward admin:', adminError);
        // Don't throw - we can continue without admin data
      }

    } catch (error) {
      console.error('Error fetching ward details:', error);
      toast({
        title: "Error",
        description: "Failed to load ward details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wardId, user, toast]);

  // Initial load
  useEffect(() => {
    if (wardId) {
      fetchWardDetails(true);
    }
  }, [wardId, fetchWardDetails]);

  // Handle refresh
  const handleRefresh = () => {
    fetchWardDetails(false);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format date
  const formatDate = (date: string) => {
    if (!date) return 'Unknown';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  // Handle contact admin - Open messaging modal
  const handleContactAdmin = () => {
    if (wardAdmin) {
      setSelectedContactId(wardAdmin.id);
      setSelectedContactName(wardAdmin.name);
      setShowMessagingModal(true);
    } else {
      toast({
        title: "No Admin Assigned",
        description: "This ward does not have an admin assigned yet.",
        variant: "destructive",
      });
    }
  };

  // Close messaging modal
  const handleCloseMessaging = () => {
    setShowMessagingModal(false);
    setSelectedContactId(null);
    setSelectedContactName('');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Ward Details" 
          subtitle="Loading ward information..."
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => (
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
        title={wardName || 'Ward Details'} 
        subtitle={`Managing ward details and statistics`}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/admin/zone">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex-1" />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Polling Units</p>
                  <p className="text-2xl font-bold">{wardStats.totalPollingUnits}</p>
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
                  <p className="text-2xl font-bold text-green-600">{wardStats.activeAgents}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {wardStats.offlineAgents} offline
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Results</p>
                  <p className="text-2xl font-bold text-yellow-600">{wardStats.totalResults}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {wardStats.pendingResults} pending
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Incidents</p>
                  <p className="text-2xl font-bold text-red-600">{wardStats.totalIncidents}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {wardStats.criticalIncidents} critical
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Result Status Breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-xl font-bold text-yellow-900">{wardStats.pendingResults}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Approved</p>
                <p className="text-xl font-bold text-green-900">{wardStats.approvedResults}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-700">Rejected</p>
                <p className="text-xl font-bold text-red-900">{wardStats.rejectedResults}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="polling-units" className="gap-2">
              <MapPin className="h-4 w-4" />
              Polling Units ({wardStats.totalPollingUnits})
            </TabsTrigger>
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Incidents ({recentIncidents.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Ward Admin Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ward Administrator</CardTitle>
                  <CardDescription>Contact information for the ward admin</CardDescription>
                </CardHeader>
                <CardContent>
                  {wardAdmin ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-lg">
                            {getInitials(wardAdmin.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{wardAdmin.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={wardAdmin.status === 'Online' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                              {wardAdmin.status || 'Offline'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{wardAdmin.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Last active: {wardAdmin.lastActive || 'Unknown'}</span>
                        </div>
                      </div>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        onClick={handleContactAdmin}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Admin
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No ward admin assigned</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          toast({
                            title: "Assign Admin",
                            description: "You can assign a ward admin from the settings page.",
                          });
                        }}
                      >
                        Assign Admin
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Statistics</CardTitle>
                  <CardDescription>Overview of ward performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Results Progress</span>
                        <span className="font-medium">
                          {wardStats.totalPollingUnits > 0 
                            ? Math.round((wardStats.totalResults / wardStats.totalPollingUnits) * 100) 
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={wardStats.totalPollingUnits > 0 
                          ? (wardStats.totalResults / wardStats.totalPollingUnits) * 100 
                          : 0
                        } 
                        className="h-2 mt-1" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Agent Activity</p>
                        <p className="text-xl font-bold">
                          {wardStats.totalAgents > 0 
                            ? Math.round((wardStats.activeAgents / wardStats.totalAgents) * 100) 
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {wardStats.activeAgents} active of {wardStats.totalAgents}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Incident Resolution</p>
                        <p className="text-xl font-bold">
                          {wardStats.totalIncidents > 0 
                            ? Math.round(((wardStats.totalIncidents - wardStats.criticalIncidents) / wardStats.totalIncidents) * 100) 
                            : 100}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {wardStats.criticalIncidents} critical
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Polling Units Tab */}
          <TabsContent value="polling-units">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Polling Units</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {pollingUnits.length} units in this ward
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pollingUnits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No polling units found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name / Code</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Voters</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pollingUnits.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{unit.name}</p>
                              <p className="text-sm text-muted-foreground">{unit.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {unit.agentName || 'Unassigned'}
                          </TableCell>
                          <TableCell>
                            <Badge className={unit.agentStatus === 'Online' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                              {unit.agentStatus || 'Unassigned'}
                            </Badge>
                          </TableCell>
                          <TableCell>{unit.registeredVoters || 0}</TableCell>
                          <TableCell>
                            <Badge variant={unit.resultsSubmitted ? 'default' : 'secondary'}>
                              {unit.resultsSubmitted ? 'Submitted' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/polling-units/${unit.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Incidents</CardTitle>
                  <Link href={`/admin/ward/${wardId}/incidents`}>
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No incidents reported</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Polling Unit</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentIncidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium">{incident.type}</TableCell>
                          <TableCell>{incident.pollingUnitName || 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(incident.severity)}>
                              {incident.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(incident.status)}>
                              {incident.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(incident.time || incident.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/incidents/${incident.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Messaging Modal */}
      <Dialog open={showMessagingModal} onOpenChange={handleCloseMessaging}>
        <DialogContent className="max-w-4xl h-[80vh] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat with {selectedContactName || 'Ward Admin'}
            </DialogTitle>
            <DialogDescription>
              {selectedContactName 
                ? `Send a message to ${selectedContactName}` 
                : 'Send a message to the ward admin'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedContactId ? (
              <MessagingWidget 
                className="h-full w-full"
                maxHeight="100%"
                showHeader={false}
                key={selectedContactId}
                initialContactId={selectedContactId}
                initialContactName={selectedContactName}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No contact selected</p>
                  <p className="text-xs">Please select a contact to start messaging</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleCloseMessaging}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}