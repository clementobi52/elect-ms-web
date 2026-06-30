// app/admin/zone/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import { MessagingWidget } from '@/components/admin/MessagingWidget';
import { NotificationsPanel } from '@/components/admin/NotificationsPanel';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Building2,
  Eye,
  MoreVertical,
  Download,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  RefreshCw,
  Activity,
  Mail,
  MessageSquare,
  MapPin,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

interface Ward {
  id: string;
  name: string;
  code: string;
  pollingUnits: number;
  agents: number;
  activeAgents: number;
  resultsSubmitted: number;
  pendingResults: number;
  incidents: number;
  adminId?: string;
  adminName?: string;
  progress: number;
}

interface WardAdmin {
  id: string;
  name: string;
  email: string;
  wardId: string;
  wardName: string;
  status: 'Online' | 'Offline';
  lastActive: string;
  resultsReviewed: number;
}

interface Incident {
  id: string;
  type: string;
  ward: string;
  pollingUnit: string;
  reporter: string;
  severity: string;
  status: string;
  time: string;
}

interface ZoneStats {
  totalWards: number;
  totalPollingUnits: number;
  totalAgents: number;
  activeAgents: number;
  totalResults: number;
  pendingResults: number;
  approvedResults: number;
  rejectedResults: number;
  totalIncidents: number;
  criticalIncidents: number;
  resultsProgress: number;
}

export default function ZonalAdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Messaging Modal State
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // State for data
  const [stats, setStats] = useState<ZoneStats>({
    totalWards: 0,
    totalPollingUnits: 0,
    totalAgents: 0,
    activeAgents: 0,
    totalResults: 0,
    pendingResults: 0,
    approvedResults: 0,
    rejectedResults: 0,
    totalIncidents: 0,
    criticalIncidents: 0,
    resultsProgress: 0,
  });
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardAdmins, setWardAdmins] = useState<WardAdmin[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [votesSummary, setVotesSummary] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadMessageCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

      // Fetch zone stats
      const statsResponse = await apiClient.get<{ success: boolean; stats: any }>(
        `/admin/zone/${zoneId}/stats`
      );
      
      console.log('📡 Stats Response:', statsResponse);

      if (statsResponse.success && statsResponse.stats) {
        const s = statsResponse.stats;
        setStats({
          totalWards: s.totalWards || 0,
          totalPollingUnits: s.totalPollingUnits || 0,
          totalAgents: s.totalAgents || 0,
          activeAgents: s.activeAgents || 0,
          totalResults: s.totalResults || 0,
          pendingResults: s.pendingResults || 0,
          approvedResults: s.approvedResults || 0,
          rejectedResults: s.rejectedResults || 0,
          totalIncidents: s.totalIncidents || 0,
          criticalIncidents: s.criticalIncidents || 0,
          resultsProgress: s.resultsProgress || 0,
        });
      }

      // Fetch wards
      const wardsResponse = await apiClient.get<{ success: boolean; wards: any[] }>(
        `/admin/zone/${zoneId}/wards`
      );
      
      console.log('📡 Wards Response:', wardsResponse);

      if (wardsResponse.success && wardsResponse.wards) {
        setWards(wardsResponse.wards);
      }

      // Fetch ward admins
      const adminsResponse = await apiClient.get<{ success: boolean; wardAdmins: any[] }>(
        `/admin/zone/${zoneId}/ward-admins`
      );
      
      console.log('📡 Ward Admins Response:', adminsResponse);

      if (adminsResponse.success && adminsResponse.wardAdmins) {
        setWardAdmins(adminsResponse.wardAdmins);
      }

      // Fetch incidents
      const incidentsResponse = await apiClient.get<{ success: boolean; incidents: any[] }>(
        `/admin/zone/${zoneId}/incidents`
      );
      
      console.log('📡 Incidents Response:', incidentsResponse);

      if (incidentsResponse.success && incidentsResponse.incidents) {
        setIncidents(incidentsResponse.incidents);
      }

      // Fetch vote summary
      const voteResponse = await apiClient.get<{ success: boolean; summary: any[]; totalVotes: number }>(
        `/admin/zone/${zoneId}/vote-summary`
      );
      
      console.log('📡 Vote Summary Response:', voteResponse);

      if (voteResponse.success) {
        setVotesSummary(voteResponse.summary || []);
        setTotalVotes(voteResponse.totalVotes || 0);
        setLastUpdated(new Date().toISOString());
      }

      // Fetch unread message count
      await fetchUnreadCount();

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data');
      // If API fails, try using demo data
      loadDemoData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Load demo data for fallback
  const loadDemoData = () => {
    setUsingDemoData(true);
    setStats({
      totalWards: 5,
      totalPollingUnits: 45,
      totalAgents: 38,
      activeAgents: 29,
      totalResults: 32,
      pendingResults: 8,
      approvedResults: 20,
      rejectedResults: 4,
      totalIncidents: 12,
      criticalIncidents: 3,
      resultsProgress: 71,
    });

    setWards([
      { id: '1', name: 'Ward 1', code: 'W001', pollingUnits: 8, agents: 5, activeAgents: 4, resultsSubmitted: 6, pendingResults: 2, incidents: 2, adminName: 'John Doe', progress: 75 },
      { id: '2', name: 'Ward 2', code: 'W002', pollingUnits: 6, agents: 4, activeAgents: 3, resultsSubmitted: 4, pendingResults: 1, incidents: 1, adminName: 'Jane Smith', progress: 67 },
      { id: '3', name: 'Ward 3', code: 'W003', pollingUnits: 4, agents: 3, activeAgents: 2, resultsSubmitted: 2, pendingResults: 0, incidents: 0, adminName: 'Bob Johnson', progress: 50 },
    ]);

    setWardAdmins([
      { id: '1', name: 'John Doe', email: 'john@example.com', wardId: '1', wardName: 'Ward 1', status: 'Online', lastActive: '2 min ago', resultsReviewed: 12 },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', wardId: '2', wardName: 'Ward 2', status: 'Offline', lastActive: '1 hour ago', resultsReviewed: 8 },
    ]);

    setIncidents([
      { id: '1', type: 'Violence', ward: 'Ward 1', pollingUnit: 'PU-001', reporter: 'Agent 1', severity: 'critical', status: 'Investigating', time: '2 hours ago' },
      { id: '2', type: 'Fraud', ward: 'Ward 2', pollingUnit: 'PU-003', reporter: 'Agent 2', severity: 'high', status: 'Pending', time: '5 hours ago' },
    ]);

    setVotesSummary([
      { party: 'APC', votes: 4500, percentage: 45, color: 'bg-blue-500' },
      { party: 'PDP', votes: 3200, percentage: 32, color: 'bg-green-500' },
      { party: 'LP', votes: 1800, percentage: 18, color: 'bg-red-500' },
    ]);
    setTotalVotes(9500);
  };

  // Initial load
  useEffect(() => {
    if (user?.zoneId) {
      fetchData(true);
    }
  }, [fetchData, user?.zoneId]);

  // Handle refresh
  const handleRefresh = async () => {
    setUsingDemoData(false);
    await fetchData(false);
  };

  // Navigation handlers
  const handleViewWardDetails = (wardId: string) => {
    router.push(`/admin/ward/${wardId}`);
  };

  const handleViewWardResults = (wardId: string) => {
    router.push(`/admin/ward/${wardId}/results`);
  };

  const handleViewWardIncidents = (wardId: string) => {
    router.push(`/admin/ward/${wardId}/incidents`);
  };

  // Updated: Open messaging modal instead of navigating
  const handleContactWardAdmin = (adminId: string | null | undefined, adminName: any) => {
    if (!adminId) {
      toast({
        title: "No Admin Assigned",
        description: "This ward does not have an admin assigned yet.",
        variant: "destructive",
      });
      return;
    }
    
    const name = typeof adminName === 'string' ? adminName : 'Admin';
    setSelectedContactId(adminId);
    setSelectedContactName(name);
    setShowMessagingModal(true);
  };

  // Handle opening messaging modal from header
  const handleOpenMessaging = () => {
    // If there's a selected contact from the ward admin, use that
    if (selectedContactId && isValidUUID(selectedContactId)) {
      setShowMessagingModal(true);
    } else {
      // Otherwise open with no specific contact selected
      setSelectedContactId(null);
      setSelectedContactName('');
      setShowMessagingModal(true);
    }
  };

  const handleViewAdminProfile = (adminId: string) => {
    router.push(`/admin/users/${adminId}`);
  };

  const handleViewAdminActivity = (adminId: string) => {
    router.push(`/admin/ward-admins/${adminId}/activity`);
  };

  const handleSendMessage = (adminId: string, adminName: string) => {
    setSelectedContactId(adminId);
    setSelectedContactName(adminName);
    setShowMessagingModal(true);
  };

  const handleViewIncident = (incidentId: string) => {
    router.push(`/admin/incidents/${incidentId}`);
  };

  // Helper functions
  const getInitials = (name: any): string => {
    if (!name) return '??';
    if (typeof name === 'string') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return '??';
  };

  const safeString = (value: any, defaultValue: string = 'Unknown'): string => {
    if (!value) return defaultValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.name) return value.name;
    return String(value) || defaultValue;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWards = selectedWard === 'all' 
    ? wards 
    : wards.filter(w => w.id === selectedWard);

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zonal Admin Dashboard" 
          subtitle="Loading zone data..."
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Zonal Admin Dashboard" 
        subtitle={`Managing Zone: ${user?.zoneName || user?.zoneId || 'Zone'}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Notifications Panel */}
            <NotificationsPanel 
              userId={user?.id} 
              userRole={user?.role}
              wardId={user?.wardId}
            />
            
            {/* Messages Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleOpenMessaging}
              className="relative"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              {unreadMessageCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive text-white text-[10px]">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </Badge>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        }
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header with Refresh */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Overview</h2>
            <Badge variant="outline" className="ml-2">
              {usingDemoData ? 'Demo Mode' : 'Live'}
            </Badge>
          </div>
        </div>

        {/* Error Message */}
        {error && !usingDemoData && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Demo Mode Warning */}
        {usingDemoData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-600">Using demo data - Backend connection not available</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Wards</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWards}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalPollingUnits} polling units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAgents}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" />
                  {stats.totalAgents > 0 ? Math.round((stats.activeAgents / stats.totalAgents) * 100) : 0}% online
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Results Progress</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resultsProgress}%</div>
              <Progress 
                value={stats.resultsProgress} 
                className="h-2 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalResults} of {stats.totalPollingUnits} submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIncidents}</div>
              <p className="text-xs text-red-600 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.criticalIncidents} critical
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-slate-50">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-slate-200 rounded-full">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Results</p>
                <p className="text-xl font-bold">{stats.totalResults}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-xl font-bold text-yellow-900">{stats.pendingResults}</p>
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
                <p className="text-xl font-bold text-green-900">{stats.approvedResults}</p>
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
                <p className="text-xl font-bold text-red-900">{stats.rejectedResults}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vote Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vote Summary (Approved Results)</CardTitle>
                <CardDescription>
                  Aggregated votes from all approved results in your zone
                  {lastUpdated && !usingDemoData && (
                    <span className="block text-xs mt-1">
                      Last updated: {new Date(lastUpdated).toLocaleString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {totalVotes > 0 && (
                  <Badge variant="outline" className="px-3 py-1">
                    Total Votes: {totalVotes.toLocaleString()}
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {votesSummary.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-4">
                {votesSummary.map((item, idx) => (
                  <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{item.party}</span>
                      <Badge variant="secondary" className="font-mono">
                        {item.percentage}%
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold mb-2">{item.votes.toLocaleString()}</p>
                    <Progress 
                      value={item.percentage} 
                      className={`h-2 ${item.color || 'bg-blue-500'}`} 
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {totalVotes > 0 ? ((item.votes / totalVotes) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No vote data available</p>
                <p className="text-sm">There are no approved results in your zone yet.</p>
              </div>
            )}

            {/* Summary Footer */}
            {votesSummary.length > 0 && (
              <div className="mt-6 pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  Total votes cast: <span className="font-bold text-foreground">{totalVotes.toLocaleString()}</span>
                </span>
                <span>
                  Parties with votes: <span className="font-bold text-foreground">{votesSummary.length}</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="wards" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="wards" className="gap-2">
                <Building2 className="h-4 w-4" />
                Wards ({stats.totalWards})
              </TabsTrigger>
              <TabsTrigger value="ward-admins" className="gap-2">
                <Users className="h-4 w-4" />
                Ward Admins ({wardAdmins?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Incidents ({stats.totalIncidents})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wards.map(ward => (
                  <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Wards Tab */}
          <TabsContent value="wards">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Wards Overview</CardTitle>
                    <CardDescription>Monitor all wards in your zone</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No wards found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ward</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Polling Units</TableHead>
                        <TableHead>Agents</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Incidents</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWards.map((ward) => (
                        <TableRow key={ward.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{ward.name}</span>
                              <p className="text-xs text-muted-foreground">{ward.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(ward.adminName || ward.adminId)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{safeString(ward.adminName, 'Unassigned')}</span>
                            </div>
                          </TableCell>
                          <TableCell>{ward.pollingUnits}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-green-600">{ward.activeAgents}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{ward.agents}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>{ward.resultsSubmitted}/{ward.pollingUnits}</span>
                                <span>{ward.progress}%</span>
                              </div>
                              <Progress value={ward.progress} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              {ward.pendingResults}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ward.incidents > 2 ? 'destructive' : 'secondary'}>
                              {ward.incidents}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleViewWardDetails(ward.id)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleViewWardResults(ward.id)}
                                  className="cursor-pointer"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Results
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleViewWardIncidents(ward.id)}
                                  className="cursor-pointer"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  View Incidents
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleContactWardAdmin(ward.adminId, ward.adminName)}
                                  className="cursor-pointer"
                                  disabled={!ward.adminId}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  {ward.adminId ? 'Contact Admin' : 'No Admin Assigned'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ward Admins Tab */}
          <TabsContent value="ward-admins">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ward Administrators</CardTitle>
                    <CardDescription>All ward admins in your zone</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {wardAdmins && wardAdmins.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admin</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wardAdmins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getInitials(admin.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{admin.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>{admin.wardName}</TableCell>
                          <TableCell>
                            <Badge className={admin.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {admin.status || 'Offline'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {admin.resultsReviewed || 0}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{admin.lastActive || 'Unknown'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleViewAdminProfile(admin.id)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleViewAdminActivity(admin.id)}
                                  className="cursor-pointer"
                                >
                                  <Activity className="h-4 w-4 mr-2" />
                                  View Activity
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleSendMessage(admin.id, admin.name)}
                                  className="cursor-pointer"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send Message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No ward admins found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Incidents</CardTitle>
                    <CardDescription>Incidents reported across all wards in your zone</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {incidents && incidents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Polling Unit</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium">{incident.type}</TableCell>
                          <TableCell>{incident.ward}</TableCell>
                          <TableCell>{incident.pollingUnit}</TableCell>
                          <TableCell>{incident.reporter}</TableCell>
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
                          <TableCell className="text-muted-foreground">{incident.time}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewIncident(incident.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No incidents found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Results Submission Trend</CardTitle>
                  <CardDescription>Results submitted over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Chart visualization would appear here</p>
                    <p className="text-sm">Integrate with recharts for full functionality</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Incident Distribution</CardTitle>
                  <CardDescription>Incidents by type and severity</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <PieChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Chart visualization would appear here</p>
                    <p className="text-sm">Integrate with recharts for full functionality</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Messaging Modal */}
      <Dialog open={showMessagingModal} onOpenChange={(open) => {
        if (!open) {
          setSelectedContactId(null);
          setSelectedContactName('');
        }
        setShowMessagingModal(open);
      }}>
        <DialogContent className="max-w-4xl h-[80vh] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedContactName ? `Chat with ${selectedContactName}` : 'Messages'}
            </DialogTitle>
            <DialogDescription>
              {selectedContactName 
                ? `Send a message to ${selectedContactName}` 
                : 'View all your conversations'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <MessagingWidget 
              className="h-full w-full"
              maxHeight="100%"
              showHeader={false}
              key={selectedContactId || 'all-conversations'}
              initialContactId={selectedContactId || undefined}
              initialContactName={selectedContactName}
            />
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowMessagingModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}