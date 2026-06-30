"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSituationRoomData } from '@/hooks/useSituationRoomData';
import AdminHeader from '@/components/admin/AdminHeader';
import { IncidentHeatmap } from '@/components/admin/situation-room/IncidentHeatmap';
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
  Download,
  Filter,
  Map,
  Activity,
  RefreshCw,
  Radio,
  AlertCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to safely convert any value to string
const safeString = (value: any, defaultValue: string = 'Unknown'): string => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if (value.name && typeof value.name === 'string') return value.name;
    if (value.zoneName && typeof value.zoneName === 'string') return value.zoneName;
    if (value.wardName && typeof value.wardName === 'string') return value.wardName;
    return defaultValue;
  }
  return String(value);
};

// Helper function to safely get numeric value
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

export default function SituationRoomDashboard() {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('incidents');
  
  const { 
    stats,
    zones,
    incidents,
    activities,
    votesSummary,
    loading,
    refreshing,
    error,
    usingDemoData,
    lastUpdated,
    refreshData 
  } = useSituationRoomData({
    autoRefresh: isLive,
    refreshInterval: 30000
  });

  // Safely process incidents
  const safeIncidents = Array.isArray(incidents)
    ? incidents.map(inc => ({
        ...inc,
        id: inc?.id || `incident-${Math.random()}`,
        type: safeString(inc?.type, 'Unknown'),
        description: safeString(inc?.description, 'No description'),
        zone: safeString(inc?.zone, 'Unknown Zone'),
        zoneId: safeString(inc?.zoneId),
        ward: safeString(inc?.ward, 'Unknown Ward'),
        severity: safeString(inc?.severity, 'medium').toLowerCase(),
        status: safeString(inc?.status, 'pending').toLowerCase(),
        time: safeString(inc?.time, 'Just now'),
        latitude: inc?.latitude,
        longitude: inc?.longitude
      }))
    : [];

  // Filter incidents based on zone selection
  const filteredIncidents = selectedZone === 'all'
    ? safeIncidents
    : safeIncidents.filter(i => i?.zoneId === selectedZone);

  const criticalIncidents = filteredIncidents.filter(i => i?.severity === 'critical');
  const highIncidents = filteredIncidents.filter(i => i?.severity === 'high');
  const mediumIncidents = filteredIncidents.filter(i => i?.severity === 'medium');

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
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

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'result': return 'text-blue-500';
      case 'incident': return 'text-red-500';
      case 'agent': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const handleRefresh = () => {
    refreshData(true);
  };

  const handleViewIncident = (incidentId: string) => {
    if (incidentId) {
      window.location.href = `/admin/incidents/${incidentId}`;
    }
  };

  const handleExportReport = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Incidents', safeNumber(stats?.totalIncidents)],
      ['Critical Incidents', safeNumber(stats?.criticalIncidents)],
      ['High Incidents', safeNumber(stats?.highIncidents)],
      ['Active Zones', safeNumber(stats?.totalZones)],
      ['Affected Polling Units', safeNumber(stats?.totalPollingUnits)],
      ['Pending', safeIncidents.filter(i => i?.status === 'pending').length],
      ['Investigating', safeIncidents.filter(i => i?.status === 'investigating').length],
      ['Resolved', safeIncidents.filter(i => i?.status === 'resolved').length],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `situation-room-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <AdminHeader 
          title="Situation Room" 
          subtitle="Loading real-time data..."
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
        </div>
      </div>
    );
  }

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
              Last updated: {lastUpdated?.toLocaleTimeString() || new Date().toLocaleTimeString()}
            </span>
            {usingDemoData && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Demo Mode
              </Badge>
            )}
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
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && !usingDemoData && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeNumber(stats?.totalIncidents)}</div>
              <p className="text-xs text-muted-foreground">All incidents</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Critical</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{safeNumber(stats?.criticalIncidents)}</div>
              <p className="text-xs text-red-600">High priority</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">High</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{safeNumber(stats?.highIncidents)}</div>
              <p className="text-xs text-orange-600">Medium priority</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Active Zones</CardTitle>
              <Map className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{safeNumber(stats?.totalZones)}</div>
              <p className="text-xs text-blue-600">Zones with incidents</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="incidents" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="incidents" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Incidents ({safeNumber(stats?.totalIncidents)})
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <Map className="h-4 w-4" />
                Heatmap View
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {activeTab === 'incidents' && (
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Incidents</SelectItem>
                  {Array.isArray(zones) && zones.map((zone, index) => {
                    const zoneName = safeString(zone?.name, `Zone ${index + 1}`);
                    const zoneId = zone?.id && typeof zone.id === 'string' 
                      ? zone.id 
                      : `zone-${index}`;
                    
                    return (
                      <SelectItem key={zoneId} value={zoneId}>
                        {zoneName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Incidents List Tab */}
          <TabsContent value="incidents" className="space-y-4">
            {/* Critical Alerts */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-red-800">Critical Alerts</CardTitle>
                  </div>
                  <Badge variant="destructive">{criticalIncidents.length} Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {criticalIncidents.length > 0 ? (
                  <div className="space-y-3">
                    {criticalIncidents.slice(0, 5).map((incident) => (
                      <div key={incident.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-red-200">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(incident.severity)}>
                              {incident.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{incident.time}</span>
                          </div>
                          <p className="text-sm font-medium">{incident.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {incident.zone} / {incident.ward}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewIncident(incident.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No critical incidents at this time
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Incidents Table */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>All Incidents</CardTitle>
                  <CardDescription>Complete list of reported incidents</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.length > 0 ? (
                      filteredIncidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium">{incident.type}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {incident.description}
                          </TableCell>
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
                          <TableCell>
                            <span className="text-sm">
                              {incident.zone}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{incident.time}</TableCell>
                          <TableCell className="text-right">
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No incidents found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap">
  <IncidentHeatmap 
    incidents={safeIncidents}
    height="600px"
    showControls={true}
    useTestData={true} // Add this to force test data while debugging
  />
</TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Distribution by Severity</CardTitle>
                  <CardDescription>Breakdown of incidents by severity level</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Critical</span>
                        <span className="text-sm font-bold">{safeNumber(stats?.criticalIncidents)}</span>
                      </div>
                      <Progress value={((safeNumber(stats?.criticalIncidents) / (safeNumber(stats?.totalIncidents) || 1)) * 100)} className="h-2 bg-red-100" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">High</span>
                        <span className="text-sm font-bold">{safeNumber(stats?.highIncidents)}</span>
                      </div>
                      <Progress value={((safeNumber(stats?.highIncidents) / (safeNumber(stats?.totalIncidents) || 1)) * 100)} className="h-2 bg-orange-100" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Medium/Low</span>
                        <span className="text-sm font-bold">{(safeNumber(stats?.totalIncidents) - safeNumber(stats?.criticalIncidents) - safeNumber(stats?.highIncidents))}</span>
                      </div>
                      <Progress value={((safeNumber(stats?.totalIncidents) - safeNumber(stats?.criticalIncidents) - safeNumber(stats?.highIncidents)) / (safeNumber(stats?.totalIncidents) || 1) * 100)} className="h-2 bg-yellow-100" />
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Severity Legend</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span>Critical</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span>High</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <span>Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>Low</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Overview</CardTitle>
                  <CardDescription>Current status of all incidents</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <span className="text-sm">Pending</span>
                        </div>
                        <span className="font-bold">{safeIncidents.filter(i => i?.status === 'pending').length}</span>
                      </div>
                      <Progress value={(safeIncidents.filter(i => i?.status === 'pending').length / (safeIncidents.length || 1) * 100)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-sm">Investigating</span>
                        </div>
                        <span className="font-bold">{safeIncidents.filter(i => i?.status === 'investigating').length}</span>
                      </div>
                      <Progress value={(safeIncidents.filter(i => i?.status === 'investigating').length / (safeIncidents.length || 1) * 100)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="text-sm">Resolved</span>
                        </div>
                        <span className="font-bold">{safeIncidents.filter(i => i?.status === 'resolved').length}</span>
                      </div>
                      <Progress value={(safeIncidents.filter(i => i?.status === 'resolved').length / (safeIncidents.length || 1) * 100)} className="h-2" />
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Status Summary</h4>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="font-bold">{safeIncidents.filter(i => i?.status === 'pending').length}</div>
                          <div className="text-muted-foreground">Pending</div>
                        </div>
                        <div>
                          <div className="font-bold">{safeIncidents.filter(i => i?.status === 'investigating').length}</div>
                          <div className="text-muted-foreground">Investigating</div>
                        </div>
                        <div>
                          <div className="font-bold">{safeIncidents.filter(i => i?.status === 'resolved').length}</div>
                          <div className="text-muted-foreground">Resolved</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Live Activity Feed and Vote Summary */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Live Activity Feed */}
          <div className="lg:col-span-1">
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
                  {activities && activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map((activity, index) => {
                        const Icon = activity?.icon || Activity;
                        const activityType = safeString(activity?.type);
                        return (
                          <div key={activity?.id || `activity-${index}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <div className={`p-1.5 rounded-full bg-muted ${getActivityColor(activityType)}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{safeString(activity?.message, 'No message')}</p>
                              <p className="text-xs text-muted-foreground">{safeString(activity?.time, 'Just now')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Vote Summary */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vote Count Summary</CardTitle>
                    <CardDescription>Aggregated results from approved submissions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {votesSummary && votesSummary.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    {votesSummary.map((item, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{safeString(item?.party, 'Unknown')}</span>
                          <Badge variant="secondary">{safeNumber(item?.percentage)}%</Badge>
                        </div>
                        <p className="text-2xl font-bold">{safeNumber(item?.votes).toLocaleString()}</p>
                        <Progress value={safeNumber(item?.percentage)} className={`h-2 mt-2 ${item?.color || 'bg-gray-500'}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No vote data available</p>
                    <p className="text-sm">Waiting for approved results to be submitted</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}