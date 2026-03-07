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
  Building2,
  Eye,
  MoreVertical,
  Download,
  Filter,
  Map,
  Activity,
  RefreshCw,
  Bell,
  Radio,
  TrendingUp,
  Wifi,
  WifiOff,
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Demo data for Situation Room
const overallStats = {
  totalZones: 12,
  totalWards: 96,
  totalPollingUnits: 2400,
  totalAgents: 2350,
  activeAgents: 2180,
  offlineAgents: 170,
  totalResults: 1920,
  pendingResults: 320,
  approvedResults: 1540,
  rejectedResults: 60,
  totalIncidents: 145,
  criticalIncidents: 18,
  highIncidents: 42,
  resoltsProgress: 80,
  totalRegisteredVoters: 1250000,
  totalVotesCounted: 856000,
};

const zones = [
  { id: '1', name: 'Zone A', wards: 12, pollingUnits: 280, agents: 275, activeAgents: 258, results: 224, progress: 80, incidents: 12 },
  { id: '2', name: 'Zone B', wards: 10, pollingUnits: 220, agents: 218, activeAgents: 200, results: 180, progress: 82, incidents: 8 },
  { id: '3', name: 'Zone C', wards: 8, pollingUnits: 180, agents: 178, activeAgents: 165, results: 145, progress: 81, incidents: 15 },
  { id: '4', name: 'Zone D', wards: 11, pollingUnits: 250, agents: 245, activeAgents: 230, results: 200, progress: 80, incidents: 10 },
  { id: '5', name: 'Zone E', wards: 9, pollingUnits: 200, agents: 198, activeAgents: 185, results: 162, progress: 81, incidents: 18 },
  { id: '6', name: 'Zone F', wards: 7, pollingUnits: 160, agents: 158, activeAgents: 148, results: 130, progress: 81, incidents: 7 },
];

const liveIncidents = [
  { id: '1', type: 'Violence', zone: 'Zone A', ward: 'Ward 3', pollingUnit: 'PU-012', time: '2 min ago', severity: 'critical', status: 'pending', description: 'Physical altercation near polling booth' },
  { id: '2', type: 'Ballot Stuffing', zone: 'Zone E', ward: 'Ward 7', pollingUnit: 'PU-145', time: '5 min ago', severity: 'critical', status: 'investigating', description: 'Suspected ballot box stuffing reported' },
  { id: '3', type: 'Disruption', zone: 'Zone B', ward: 'Ward 2', pollingUnit: 'PU-034', time: '8 min ago', severity: 'high', status: 'pending', description: 'Crowd disruption at polling unit entrance' },
  { id: '4', type: 'Intimidation', zone: 'Zone C', ward: 'Ward 5', pollingUnit: 'PU-089', time: '12 min ago', severity: 'high', status: 'investigating', description: 'Voter intimidation by unknown individuals' },
  { id: '5', type: 'Equipment Failure', zone: 'Zone D', ward: 'Ward 1', pollingUnit: 'PU-201', time: '15 min ago', severity: 'medium', status: 'resolved', description: 'Biometric verification machine malfunction' },
];

const liveActivity = [
  { id: '1', type: 'result', message: 'Results uploaded from PU-456 (Zone B)', time: '1 min ago', icon: FileText },
  { id: '2', type: 'agent', message: 'Agent John Doe went online (Zone A)', time: '2 min ago', icon: Wifi },
  { id: '3', type: 'incident', message: 'New incident reported at PU-012 (Zone A)', time: '2 min ago', icon: AlertTriangle },
  { id: '4', type: 'result', message: 'Results approved for PU-789 (Zone C)', time: '3 min ago', icon: CheckCircle },
  { id: '5', type: 'agent', message: 'Agent Jane Smith went offline (Zone D)', time: '4 min ago', icon: WifiOff },
  { id: '6', type: 'result', message: 'Results uploaded from PU-123 (Zone E)', time: '5 min ago', icon: FileText },
  { id: '7', type: 'incident', message: 'Incident resolved at PU-201 (Zone D)', time: '6 min ago', icon: CheckCircle },
  { id: '8', type: 'result', message: 'Results rejected for PU-567 (Zone F)', time: '7 min ago', icon: XCircle },
];

const votesSummary = [
  { party: 'Party A', votes: 342500, percentage: 40, color: 'bg-blue-500' },
  { party: 'Party B', votes: 291600, percentage: 34, color: 'bg-green-500' },
  { party: 'Party C', votes: 154080, percentage: 18, color: 'bg-orange-500' },
  { party: 'Others', votes: 68320, percentage: 8, color: 'bg-gray-400' },
];

export default function SituationRoomDashboard() {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Simulate live updates
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
      }, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
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

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'result': return 'text-blue-500';
      case 'incident': return 'text-red-500';
      case 'agent': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AdminHeader 
        title="Situation Room" 
        subtitle="Real-time Election Monitoring"
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Live Status Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium">{isLive ? 'Live' : 'Paused'}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={isLive ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? (
                <>
                  <Radio className="h-4 w-4 mr-2 animate-pulse" />
                  Live Updates On
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 mr-2" />
                  Resume Updates
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLastUpdated(new Date())}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Zones</CardTitle>
              <Map className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalZones}</div>
              <p className="text-xs text-muted-foreground">{overallStats.totalWards} wards</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Polling Units</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalPollingUnits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Nationwide</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overallStats.activeAgents.toLocaleString()}</div>
              <p className="text-xs text-red-500">{overallStats.offlineAgents} offline</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Results Progress</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.resoltsProgress}%</div>
              <Progress value={overallStats.resoltsProgress} className="h-2 mt-1" />
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(overallStats.totalVotesCounted / 1000).toFixed(0)}K</div>
              <p className="text-xs text-muted-foreground">of {(overallStats.totalRegisteredVoters / 1000000).toFixed(1)}M registered</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Critical Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overallStats.criticalIncidents}</div>
              <p className="text-xs text-red-600">{overallStats.highIncidents} high priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Live Incidents */}
          <div className="lg:col-span-2 space-y-4">
            {/* Critical Alerts */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-red-800">Critical Alerts</CardTitle>
                  </div>
                  <Badge variant="destructive">{overallStats.criticalIncidents} Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {liveIncidents.filter(i => i.severity === 'critical').map((incident) => (
                    <div key={incident.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-red-200">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(incident.severity)}>{incident.type}</Badge>
                          <span className="text-sm text-muted-foreground">{incident.time}</span>
                        </div>
                        <p className="text-sm font-medium">{incident.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {incident.zone} / {incident.ward} / {incident.pollingUnit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zones Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Zones Overview</CardTitle>
                    <CardDescription>Real-time status of all zones</CardDescription>
                  </div>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Wards</TableHead>
                      <TableHead>PUs</TableHead>
                      <TableHead>Agents</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Incidents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell>{zone.wards}</TableCell>
                        <TableCell>{zone.pollingUnits}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">{zone.activeAgents}</span>
                            <span className="text-muted-foreground">/</span>
                            <span>{zone.agents}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{zone.results}/{zone.pollingUnits}</span>
                              <span>{zone.progress}%</span>
                            </div>
                            <Progress value={zone.progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={zone.incidents > 10 ? 'destructive' : 'secondary'}>
                            {zone.incidents}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Vote Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vote Count Summary</CardTitle>
                    <CardDescription>Aggregated results from approved submissions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {votesSummary.map((item, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.party}</span>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                      <p className="text-2xl font-bold">{item.votes.toLocaleString()}</p>
                      <Progress value={item.percentage} className={`h-2 mt-2`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Live Activity Feed */}
          <div className="space-y-4">
            {/* Results Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Results Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Pending Review</span>
                  </div>
                  <span className="font-bold">{overallStats.pendingResults}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Approved</span>
                  </div>
                  <span className="font-bold">{overallStats.approvedResults}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm">Rejected</span>
                  </div>
                  <span className="font-bold">{overallStats.rejectedResults}</span>
                </div>
              </CardContent>
            </Card>

            {/* Live Activity Feed */}
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Live Activity</CardTitle>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-3">
                    {liveActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className={`p-1.5 rounded-full bg-muted ${getActivityColor(activity.type)}`}>
                          <activity.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Incident Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800">Critical</Badge>
                  </div>
                  <span className="font-bold">{overallStats.criticalIncidents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-800">High</Badge>
                  </div>
                  <span className="font-bold">{overallStats.highIncidents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                  </div>
                  <span className="font-bold">{overallStats.totalIncidents - overallStats.criticalIncidents - overallStats.highIncidents}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
