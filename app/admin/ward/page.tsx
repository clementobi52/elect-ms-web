"use client";

import React, { useState } from 'react';
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
  Filter
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

// Demo data for Ward Admin
const wardStats = {
  totalPollingUnits: 25,
  activeAgents: 22,
  offlineAgents: 3,
  totalResults: 18,
  pendingResults: 5,
  approvedResults: 12,
  rejectedResults: 1,
  totalIncidents: 4,
  criticalIncidents: 1,
};

const pollingUnits = [
  { id: '1', name: 'Polling Unit 001', code: 'PU-001', registeredVoters: 450, agent: 'John Doe', status: 'active', resultsSubmitted: true },
  { id: '2', name: 'Polling Unit 002', code: 'PU-002', registeredVoters: 380, agent: 'Jane Smith', status: 'active', resultsSubmitted: true },
  { id: '3', name: 'Polling Unit 003', code: 'PU-003', registeredVoters: 520, agent: 'Mike Johnson', status: 'offline', resultsSubmitted: false },
  { id: '4', name: 'Polling Unit 004', code: 'PU-004', registeredVoters: 290, agent: 'Sarah Brown', status: 'active', resultsSubmitted: true },
  { id: '5', name: 'Polling Unit 005', code: 'PU-005', registeredVoters: 410, agent: 'David Wilson', status: 'active', resultsSubmitted: false },
];

const pendingResults = [
  { 
    id: '1', 
    pollingUnit: 'Polling Unit 001', 
    agent: 'John Doe', 
    submittedAt: '2024-03-15 10:30 AM',
    imageUrl: '/api/placeholder/400/300',
    votes: [
      { party: 'Party A', votes: 150 },
      { party: 'Party B', votes: 120 },
      { party: 'Party C', votes: 80 },
    ]
  },
  { 
    id: '2', 
    pollingUnit: 'Polling Unit 002', 
    agent: 'Jane Smith', 
    submittedAt: '2024-03-15 10:45 AM',
    imageUrl: '/api/placeholder/400/300',
    votes: [
      { party: 'Party A', votes: 180 },
      { party: 'Party B', votes: 90 },
      { party: 'Party C', votes: 110 },
    ]
  },
  { 
    id: '3', 
    pollingUnit: 'Polling Unit 004', 
    agent: 'Sarah Brown', 
    submittedAt: '2024-03-15 11:00 AM',
    imageUrl: '/api/placeholder/400/300',
    votes: [
      { party: 'Party A', votes: 100 },
      { party: 'Party B', votes: 140 },
      { party: 'Party C', votes: 50 },
    ]
  },
];

const recentIncidents = [
  { id: '1', type: 'Disruption', pollingUnit: 'Polling Unit 003', reporter: 'Mike Johnson', time: '30 min ago', severity: 'high', status: 'pending' },
  { id: '2', type: 'Irregularity', pollingUnit: 'Polling Unit 001', reporter: 'John Doe', time: '1 hour ago', severity: 'medium', status: 'investigating' },
  { id: '3', type: 'Violence', pollingUnit: 'Polling Unit 005', reporter: 'David Wilson', time: '2 hours ago', severity: 'critical', status: 'pending' },
];

const agents = [
  { id: '1', name: 'John Doe', email: 'john@example.com', pollingUnit: 'Polling Unit 001', status: 'Online', lastActive: '2 min ago' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', pollingUnit: 'Polling Unit 002', status: 'Online', lastActive: '5 min ago' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', pollingUnit: 'Polling Unit 003', status: 'Offline', lastActive: '45 min ago' },
  { id: '4', name: 'Sarah Brown', email: 'sarah@example.com', pollingUnit: 'Polling Unit 004', status: 'Online', lastActive: '1 min ago' },
  { id: '5', name: 'David Wilson', email: 'david@example.com', pollingUnit: 'Polling Unit 005', status: 'Online', lastActive: '10 min ago' },
];

export default function WardAdminDashboard() {
  const { user } = useAuth();
  const [selectedResult, setSelectedResult] = useState<typeof pendingResults[0] | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const handleApprove = (resultId: string) => {
    console.log('Approving result:', resultId, 'Comment:', reviewComment);
    setIsReviewDialogOpen(false);
    setReviewComment('');
    setSelectedResult(null);
  };

  const handleReject = (resultId: string) => {
    console.log('Rejecting result:', resultId, 'Comment:', reviewComment);
    setIsReviewDialogOpen(false);
    setReviewComment('');
    setSelectedResult(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Ward Admin Dashboard" 
        subtitle={`Managing Ward: ${user?.wardId || 'Ward 1'}`}
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
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
              <CardTitle className="text-sm font-medium">Results Submitted</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wardStats.totalResults}</div>
              <Progress 
                value={(wardStats.totalResults / wardStats.totalPollingUnits) * 100} 
                className="h-2 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((wardStats.totalResults / wardStats.totalPollingUnits) * 100)}% complete
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
                {wardStats.criticalIncidents} critical incident(s)
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
              Incidents
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingResults.map((result) => (
                    <Card key={result.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
                          <FileText className="h-12 w-12 text-slate-400" />
                        </div>
                        <Badge className="absolute top-2 right-2 bg-yellow-500">
                          Pending
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">{result.pollingUnit}</h4>
                        <p className="text-sm text-muted-foreground">Submitted by {result.agent}</p>
                        <p className="text-xs text-muted-foreground">{result.submittedAt}</p>
                        
                        <div className="mt-3 space-y-1">
                          {result.votes.map((vote, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{vote.party}</span>
                              <span className="font-medium">{vote.votes}</span>
                            </div>
                          ))}
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
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Review Election Result</DialogTitle>
                                <DialogDescription>
                                  {result.pollingUnit} - Submitted by {result.agent}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="grid gap-4 py-4">
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                  <FileText className="h-16 w-16 text-muted-foreground" />
                                </div>
                                
                                <div className="space-y-2">
                                  <h4 className="font-medium">Vote Counts</h4>
                                  <div className="grid grid-cols-3 gap-4">
                                    {result.votes.map((vote, idx) => (
                                      <div key={idx} className="p-3 bg-muted rounded-lg text-center">
                                        <p className="text-sm text-muted-foreground">{vote.party}</p>
                                        <p className="text-xl font-bold">{vote.votes}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="comment">Review Comment</Label>
                                  <Textarea
                                    id="comment"
                                    placeholder="Add a comment (optional)"
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                  />
                                </div>
                              </div>

                              <DialogFooter className="gap-2">
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

          {/* Incidents Tab */}
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
                    {recentIncidents.map((incident) => (
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
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
