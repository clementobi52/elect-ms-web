"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { 
  Users, 
  MapPin, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  Eye,
  MoreVertical,
  Download,
  Filter,
  RefreshCw,
  Flag
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface Party {
  id: string;
  name: string;
  logoUrl?: string;
  slogan?: string;
  registrationNumber?: string;
}

interface PollingAgent {
  id: string;
  name: string;
  email: string;
  status: 'Online' | 'Offline';
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  assignedPollingUnit?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  distanceFromPollingUnit?: string | null;
  withinPollingUnit?: 'Yes' | 'No' | 'Unknown';
}

interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agent: string;
  status: string;
  resultsSubmitted: boolean;
}

interface Vote {
  partyId?: string;
  party: string;
  votes: number;
}

interface PendingResult {
  id: string;
  pollingUnit: string;
  agent: string;
  submittedAt: string;
  resultFileUrl?: string;
  votes: Vote[];
}

interface Incident {
  id: string;
  type: string;
  pollingUnit: string;
  reporter: string;
  time: string;
  severity: string;
  status: string;
  description?: string;
}

interface DashboardData {
  message: string;
  pollingAgents: PollingAgent[];
}

interface WardStats {
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

export default function WardAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [parties, setParties] = useState<Record<string, Party>>({});
  const [partiesList, setPartiesList] = useState<Party[]>([]);
  const [wardStats, setWardStats] = useState<WardStats>({
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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  
  // UI State
  const [selectedResult, setSelectedResult] = useState<PendingResult | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const fetchAllData = async (showRefreshToast = false) => {
    if (!user?.wardId) {
      console.error('No ward ID found');
      return;
    }

    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('📡 Fetching stats from:', `${API_BASE_URL}/admin/ward/${user.wardId}/stats`);

      // Fetch all data in parallel
      const [dashboardRes, statsRes, resultsRes, partiesRes, incidentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/protected/dashboard`, { headers }),
        fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/stats`, { headers }),
        fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/pending-results`, { headers }),
        fetch(`${API_BASE_URL}/parties`, { headers }),
        fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/incidents`, { headers })
      ]);

      if (!dashboardRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await dashboardRes.json();
      setDashboardData(dashboardData);

      // Fetch stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('✅ Stats loaded from backend:', statsData);
        setWardStats(statsData);
      } else {
        console.error('❌ Stats endpoint failed:', statsRes.status);
      }

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setPendingResults(resultsData);
        console.log('✅ Pending results:', resultsData.length);
      }

      if (partiesRes.ok) {
        const partiesData = await partiesRes.json();
        const partyMap: Record<string, Party> = {};
        partiesData.parties.forEach((party: Party) => {
          partyMap[party.id] = party;
        });
        setParties(partyMap);
        setPartiesList(partiesData.parties);
        console.log('✅ Parties loaded:', partiesData.parties.length);
      }

      // Fetch incidents
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        console.log('✅ Incidents loaded:', incidentsData);
        setIncidents(incidentsData);
      } else {
        console.error('❌ Incidents endpoint failed:', incidentsRes.status);
      }

      if (showRefreshToast) {
        toast({
          title: "Dashboard Updated",
          description: "Latest data has been loaded successfully.",
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Transform polling agents for UI
  const pollingUnits: PollingUnit[] = dashboardData?.pollingAgents?.map((agent, index) => ({
    id: agent.id,
    name: agent.assignedPollingUnit?.name || `Polling Unit ${index + 1}`,
    code: `PU-${(index + 1).toString().padStart(3, '0')}`,
    registeredVoters: 0,
    agent: agent.name,
    status: agent.status === 'Online' ? 'active' : 'offline',
    resultsSubmitted: false
  })) || [];

  const agents = dashboardData?.pollingAgents?.map(agent => ({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    pollingUnit: agent.assignedPollingUnit?.name || 'Unassigned',
    status: agent.status,
    lastActive: agent.lastKnownLocation ? 'Just now' : 'Unknown'
  })) || [];

  const handleApprove = async (resultId: string) => {
    try {
      console.log('='.repeat(50));
      console.log('🔍 APPROVE RESULT');
      console.log('Result ID:', resultId);
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/admin/results/${resultId}/approve`;
      console.log('📡 POST URL:', url);
      
      const requestBody = { 
        comment: reviewComment
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to approve result: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Success:', data);

      toast({
        title: "Success",
        description: "Result approved successfully",
      });

      // Update stats
      setWardStats(prev => ({
        ...prev,
        pendingResults: prev.pendingResults - 1,
        approvedResults: prev.approvedResults + 1
      }));

      // Remove from pending list
      setPendingResults(prev => prev.filter(r => r.id !== resultId));
      setIsReviewDialogOpen(false);
      setReviewComment('');
      setSelectedResult(null);
    } catch (error) {
      console.error('❌ Error approving result:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve result",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (resultId: string) => {
    try {
      console.log('='.repeat(50));
      console.log('🔍 REJECT RESULT');
      console.log('Result ID:', resultId);
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/admin/results/${resultId}/reject`;
      console.log('📡 POST URL:', url);
      
      const requestBody = { 
        comment: reviewComment
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to reject result: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Success:', data);

      toast({
        title: "Success",
        description: "Result rejected",
      });

      // Update stats
      setWardStats(prev => ({
        ...prev,
        pendingResults: prev.pendingResults - 1,
        rejectedResults: prev.rejectedResults + 1
      }));

      // Remove from pending list
      setPendingResults(prev => prev.filter(r => r.id !== resultId));
      setIsReviewDialogOpen(false);
      setReviewComment('');
      setSelectedResult(null);
    } catch (error) {
      console.error('❌ Error rejecting result:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject result",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Ward Admin Dashboard" 
          subtitle="Loading dashboard..."
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-16 animate-pulse bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Ward Admin Dashboard" 
        subtitle={`Managing Ward: ${user?.wardId || 'Ward 1'}`}
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Overview</h2>
            <Badge variant="outline" className="ml-2">
              Live
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Polling Units</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wardStats.totalPollingUnits}</div>
              <p className="text-xs text-muted-foreground">
                In your ward
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wardStats.activeAgents}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600">{wardStats.activeAgents} online</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-600">{wardStats.offlineAgents} offline</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Results Pending</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wardStats.pendingResults}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wardStats.totalIncidents}</div>
              <p className="text-xs text-red-600">
                {wardStats.criticalIncidents} critical
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-800">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-900">{wardStats.pendingResults}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Approved</p>
                <p className="text-2xl font-bold text-green-900">{wardStats.approvedResults}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{wardStats.rejectedResults}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending-results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending-results" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Results ({wardStats.pendingResults})
            </TabsTrigger>
            <TabsTrigger value="polling-units" className="gap-2">
              <MapPin className="h-4 w-4" />
              Polling Units
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Users className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="incidents" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Incidents ({wardStats.totalIncidents})
            </TabsTrigger>
          </TabsList>

          {/* Pending Results Tab */}
          <TabsContent value="pending-results" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Results for Review</CardTitle>
                    <CardDescription>Review and approve election results from your polling units</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending results found
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pendingResults.map((result) => (
                      <Card key={result.id} className="overflow-hidden">
                        {/* Thumbnail Image */}
                        <div className="aspect-video bg-muted relative">
                          {result.resultFileUrl ? (
                            <img 
                              src={result.resultFileUrl} 
                              alt={`Result for ${result.pollingUnit}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                              onClick={() => window.open(result.resultFileUrl, '_blank')}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
                              <FileText className="h-12 w-12 text-slate-400" />
                            </div>
                          )}
                          <Badge className="absolute top-2 right-2 bg-yellow-500">
                            Pending
                          </Badge>
                        </div>
                        
                        <CardContent className="p-4">
                          <h4 className="font-semibold">{result.pollingUnit}</h4>
                          <p className="text-sm text-muted-foreground">Submitted by {result.agent}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(result.submittedAt)}</p>
                          
                          <div className="mt-3 space-y-1">
                            {result.votes && result.votes.length > 0 ? (
                              result.votes.map((vote, idx) => {
                                const partyName = vote.party;
                                const voteCount = vote.votes;
                                
                                return (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1">
                                      {Object.values(parties).find(p => p.name === partyName)?.logoUrl && (
                                        <img 
                                          src={Object.values(parties).find(p => p.name === partyName)?.logoUrl} 
                                          alt="" 
                                          className="w-4 h-4 rounded-full"
                                        />
                                      )}
                                      {partyName}
                                    </span>
                                    <span className="font-medium">{voteCount}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-2">
                                No votes submitted yet
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Dialog open={isReviewDialogOpen && selectedResult?.id === result.id} onOpenChange={(open) => {
                              setIsReviewDialogOpen(open);
                              if (open) setSelectedResult(result);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="flex-1">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                                <DialogHeader className="flex-shrink-0">
                                  <DialogTitle>Review Election Result</DialogTitle>
                                  <DialogDescription>
                                    {result.pollingUnit} - Submitted by {result.agent}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <ScrollArea className="flex-1 pr-4 -mr-4 h-full overflow-y-auto">
                                  <div className="grid gap-4 py-4">
                                    {result.resultFileUrl ? (
                                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                        <img 
                                          src={result.resultFileUrl} 
                                          alt="Result" 
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                        <FileText className="h-16 w-16 text-muted-foreground" />
                                      </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Vote Counts</h4>
                                      {result.votes && result.votes.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-4">
                                          {result.votes.map((vote, idx) => {
                                            const partyName = vote.party;
                                            const voteCount = vote.votes;
                                            
                                            return (
                                              <div key={idx} className="p-3 bg-muted rounded-lg text-center">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                  {Object.values(parties).find(p => p.name === partyName)?.logoUrl && (
                                                    <img 
                                                      src={Object.values(parties).find(p => p.name === partyName)?.logoUrl} 
                                                      alt="" 
                                                      className="w-5 h-5 rounded-full"
                                                    />
                                                  )}
                                                  <p className="text-sm font-medium text-muted-foreground">
                                                    {partyName}
                                                  </p>
                                                </div>
                                                <p className="text-2xl font-bold">{voteCount}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 text-muted-foreground">
                                          No vote data available
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="comment">Review Comment</Label>
                                      <Textarea
                                        id="comment"
                                        placeholder="Add a comment (optional)"
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        rows={3}
                                      />
                                    </div>
                                  </div>
                                </ScrollArea>

                                <DialogFooter className="gap-2 flex-shrink-0 pt-4 border-t mt-4">
                                  <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => handleReject(result.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(result.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polling Units Tab */}
          <TabsContent value="polling-units">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Polling Units</CardTitle>
                    <CardDescription>All polling units in your ward</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Registered Voters</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pollingUnits.map((pu) => (
                      <TableRow key={pu.id}>
                        <TableCell className="font-medium">{pu.name}</TableCell>
                        <TableCell>{pu.code}</TableCell>
                        <TableCell>{pu.registeredVoters.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(pu.agent)}
                              </AvatarFallback>
                            </Avatar>
                            {pu.agent}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pu.status === 'active' ? 'default' : 'secondary'}>
                            {pu.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pu.resultsSubmitted ? (
                            <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View Results</DropdownMenuItem>
                              <DropdownMenuItem>Contact Agent</DropdownMenuItem>
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

          {/* Agents Tab */}
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Polling Agents</CardTitle>
                    <CardDescription>Agents assigned to polling units in your ward</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getInitials(agent.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{agent.email}</TableCell>
                        <TableCell>{agent.pollingUnit}</TableCell>
                        <TableCell>
                          <Badge variant={agent.status === 'Online' ? 'default' : 'secondary'} 
                                 className={agent.status === 'Online' ? 'bg-green-100 text-green-800' : ''}>
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{agent.lastActive}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>View Reports</DropdownMenuItem>
                              <DropdownMenuItem>Send Message</DropdownMenuItem>
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

          {/* Incidents Tab - Now using real data */}
          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Incidents</CardTitle>
                    <CardDescription>Incidents reported from polling units in your ward</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No incidents reported
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
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
                            <Dialog open={isIncidentDialogOpen && selectedIncident?.id === incident.id} onOpenChange={(open) => {
                              setIsIncidentDialogOpen(open);
                              if (open) setSelectedIncident(incident);
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Incident Details</DialogTitle>
                                  <DialogDescription>
                                    Reported from {incident.pollingUnit}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Type</Label>
                                      <p className="font-medium">{incident.type}</p>
                                    </div>
                                    <div>
                                      <Label>Severity</Label>
                                      <Badge className={getSeverityColor(incident.severity)}>
                                        {incident.severity}
                                      </Badge>
                                    </div>
                                  </div>
                                  {incident.description && (
                                    <div>
                                      <Label>Description</Label>
                                      <p className="text-sm mt-1">{incident.description}</p>
                                    </div>
                                  )}
                                  <div>
                                    <Label>Reported By</Label>
                                    <p className="font-medium">{incident.reporter}</p>
                                  </div>
                                  <div>
                                    <Label>Time</Label>
                                    <p className="text-sm text-muted-foreground">{incident.time}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Badge className={getStatusColor(incident.status)}>
                                      {incident.status}
                                    </Badge>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
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

        {/* Parties Quick Reference */}
        {partiesList.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Registered Parties</CardTitle>
              <CardDescription>Political parties in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {partiesList.map((party) => (
                  <Badge key={party.id} variant="outline" className="px-3 py-1 flex items-center gap-1">
                    {party.logoUrl && (
                      <img src={party.logoUrl} alt="" className="w-4 h-4 rounded-full" />
                    )}
                    {party.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}