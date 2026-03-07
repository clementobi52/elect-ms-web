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
  Building2,
  Eye,
  MoreVertical,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
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

// Demo data for Zonal Admin
const zoneStats = {
  totalWards: 8,
  totalPollingUnits: 180,
  totalAgents: 175,
  activeAgents: 162,
  offlineAgents: 13,
  totalResults: 145,
  pendingResults: 28,
  approvedResults: 110,
  rejectedResults: 7,
  totalIncidents: 23,
  criticalIncidents: 4,
  resultsProgress: 80,
};

const wards = [
  { 
    id: '1', 
    name: 'Ward 1', 
    code: 'W-001', 
    pollingUnits: 25, 
    agents: 24,
    activeAgents: 22,
    resultsSubmitted: 20,
    pendingResults: 3,
    incidents: 2,
    admin: 'Alice Johnson',
    progress: 80
  },
  { 
    id: '2', 
    name: 'Ward 2', 
    code: 'W-002', 
    pollingUnits: 22, 
    agents: 22,
    activeAgents: 20,
    resultsSubmitted: 18,
    pendingResults: 4,
    incidents: 1,
    admin: 'Bob Smith',
    progress: 82
  },
  { 
    id: '3', 
    name: 'Ward 3', 
    code: 'W-003', 
    pollingUnits: 28, 
    agents: 27,
    activeAgents: 25,
    resultsSubmitted: 22,
    pendingResults: 5,
    incidents: 4,
    admin: 'Carol White',
    progress: 79
  },
  { 
    id: '4', 
    name: 'Ward 4', 
    code: 'W-004', 
    pollingUnits: 20, 
    agents: 20,
    activeAgents: 18,
    resultsSubmitted: 16,
    pendingResults: 3,
    incidents: 3,
    admin: 'David Brown',
    progress: 80
  },
  { 
    id: '5', 
    name: 'Ward 5', 
    code: 'W-005', 
    pollingUnits: 24, 
    agents: 23,
    activeAgents: 21,
    resultsSubmitted: 19,
    pendingResults: 4,
    incidents: 5,
    admin: 'Eva Green',
    progress: 79
  },
  { 
    id: '6', 
    name: 'Ward 6', 
    code: 'W-006', 
    pollingUnits: 18, 
    agents: 18,
    activeAgents: 17,
    resultsSubmitted: 15,
    pendingResults: 2,
    incidents: 2,
    admin: 'Frank Miller',
    progress: 83
  },
  { 
    id: '7', 
    name: 'Ward 7', 
    code: 'W-007', 
    pollingUnits: 23, 
    agents: 22,
    activeAgents: 20,
    resultsSubmitted: 18,
    pendingResults: 4,
    incidents: 3,
    admin: 'Grace Lee',
    progress: 78
  },
  { 
    id: '8', 
    name: 'Ward 8', 
    code: 'W-008', 
    pollingUnits: 20, 
    agents: 19,
    activeAgents: 19,
    resultsSubmitted: 17,
    pendingResults: 3,
    incidents: 3,
    admin: 'Henry Davis',
    progress: 85
  },
];

const wardAdmins = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', ward: 'Ward 1', status: 'Online', lastActive: '2 min ago', resultsReviewed: 45 },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', ward: 'Ward 2', status: 'Online', lastActive: '5 min ago', resultsReviewed: 38 },
  { id: '3', name: 'Carol White', email: 'carol@example.com', ward: 'Ward 3', status: 'Online', lastActive: '1 min ago', resultsReviewed: 52 },
  { id: '4', name: 'David Brown', email: 'david@example.com', ward: 'Ward 4', status: 'Offline', lastActive: '30 min ago', resultsReviewed: 28 },
  { id: '5', name: 'Eva Green', email: 'eva@example.com', ward: 'Ward 5', status: 'Online', lastActive: '3 min ago', resultsReviewed: 41 },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', ward: 'Ward 6', status: 'Online', lastActive: '8 min ago', resultsReviewed: 35 },
  { id: '7', name: 'Grace Lee', email: 'grace@example.com', ward: 'Ward 7', status: 'Online', lastActive: '4 min ago', resultsReviewed: 33 },
  { id: '8', name: 'Henry Davis', email: 'henry@example.com', ward: 'Ward 8', status: 'Online', lastActive: '1 min ago', resultsReviewed: 47 },
];

const recentIncidents = [
  { id: '1', type: 'Violence', ward: 'Ward 3', pollingUnit: 'PU-012', reporter: 'Agent Mike', time: '15 min ago', severity: 'critical', status: 'pending' },
  { id: '2', type: 'Disruption', ward: 'Ward 5', pollingUnit: 'PU-045', reporter: 'Agent Sarah', time: '30 min ago', severity: 'high', status: 'investigating' },
  { id: '3', type: 'Irregularity', ward: 'Ward 1', pollingUnit: 'PU-003', reporter: 'Agent John', time: '45 min ago', severity: 'medium', status: 'investigating' },
  { id: '4', type: 'Fraud', ward: 'Ward 7', pollingUnit: 'PU-078', reporter: 'Agent Lisa', time: '1 hour ago', severity: 'critical', status: 'pending' },
  { id: '5', type: 'Disruption', ward: 'Ward 4', pollingUnit: 'PU-034', reporter: 'Agent Tom', time: '1.5 hours ago', severity: 'high', status: 'resolved' },
];

const votesSummary = [
  { party: 'Party A', votes: 45230, percentage: 42, color: 'bg-blue-500' },
  { party: 'Party B', votes: 38450, percentage: 36, color: 'bg-green-500' },
  { party: 'Party C', votes: 15890, percentage: 15, color: 'bg-orange-500' },
  { party: 'Others', votes: 7520, percentage: 7, color: 'bg-gray-400' },
];

export default function ZonalAdminDashboard() {
  const { user } = useAuth();
  const [selectedWard, setSelectedWard] = useState<string>('all');

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
        title="Zonal Admin Dashboard" 
        subtitle={`Managing Zone: ${user?.zoneId || 'Zone 1'}`}
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Wards</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zoneStats.totalWards}</div>
              <p className="text-xs text-muted-foreground">
                {zoneStats.totalPollingUnits} polling units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zoneStats.activeAgents}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3" />
                  {Math.round((zoneStats.activeAgents / zoneStats.totalAgents) * 100)}% online
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
              <div className="text-2xl font-bold">{zoneStats.resultsProgress}%</div>
              <Progress 
                value={zoneStats.resultsProgress} 
                className="h-2 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {zoneStats.totalResults} of {zoneStats.totalPollingUnits} submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{zoneStats.totalIncidents}</div>
              <p className="text-xs text-red-600 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {zoneStats.criticalIncidents} critical
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
                <p className="text-xl font-bold">{zoneStats.totalResults}</p>
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
                <p className="text-xl font-bold text-yellow-900">{zoneStats.pendingResults}</p>
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
                <p className="text-xl font-bold text-green-900">{zoneStats.approvedResults}</p>
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
                <p className="text-xl font-bold text-red-900">{zoneStats.rejectedResults}</p>
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
                <CardDescription>Aggregated votes from all approved results in your zone</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {votesSummary.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.party}</span>
                    <Badge variant="secondary">{item.percentage}%</Badge>
                  </div>
                  <p className="text-2xl font-bold">{item.votes.toLocaleString()}</p>
                  <Progress value={item.percentage} className={`h-2 mt-2 ${item.color}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="wards" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="wards" className="gap-2">
                <Building2 className="h-4 w-4" />
                Wards ({zoneStats.totalWards})
              </TabsTrigger>
              <TabsTrigger value="ward-admins" className="gap-2">
                <Users className="h-4 w-4" />
                Ward Admins
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Incidents ({zoneStats.totalIncidents})
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Polling Units</TableHead>
                      <TableHead>Agents</TableHead>
                      <TableHead>Results Progress</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Incidents</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards.map((ward) => (
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
                                {getInitials(ward.admin)}
                              </AvatarFallback>
                            </Avatar>
                            {ward.admin}
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View Results</DropdownMenuItem>
                              <DropdownMenuItem>View Incidents</DropdownMenuItem>
                              <DropdownMenuItem>Contact Admin</DropdownMenuItem>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results Reviewed</TableHead>
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
                        <TableCell>{admin.ward}</TableCell>
                        <TableCell>
                          <Badge className={admin.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {admin.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {admin.resultsReviewed}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{admin.lastActive}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>View Activity</DropdownMenuItem>
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
                    {recentIncidents.map((incident) => (
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
    </div>
  );
}
