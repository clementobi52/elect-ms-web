// app/admin/zone/analytics/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Building2,
  MapPin,
  Globe,
  Users,
  RefreshCw,
  Eye,
  Mail,
  CheckCircle,
  Clock,
  Shield,
  FileText,
  BarChart3,
  Activity,
  MapPin as MapPinIcon,
  Calendar,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart,
  LineChart,
  BarChart,
  Download,
  Printer,
  Award,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api/client';

interface AnalyticsData {
  overview: {
    totalPollingUnits: number;
    totalAgents: number;
    activeAgents: number;
    totalResults: number;
    verificationRate: number;
    totalIncidents: number;
    criticalIncidents: number;
    averageProgress: number;
  };
  wardPerformance: {
    id: string;
    name: string;
    progress: number;
    results: number;
    incidents: number;
    agents: number;
    activeAgents: number;
  }[];
  voteDistribution: {
    party: string;
    votes: number;
    percentage: number;
    color: string;
  }[];
}

export default function ZoneAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('week');
  const [zoneName, setZoneName] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Fetch analytics data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        throw new Error('Zone ID not found');
      }

      // Fetch zone stats
      const statsResponse = await apiClient.get<{ success: boolean; stats: any }>(
        `/admin/zone/${zoneId}/stats`
      );
      
      console.log('📡 Zone Stats Response:', statsResponse);

      // Fetch wards data
      const wardsResponse = await apiClient.get<{ success: boolean; wards: any[] }>(
        `/admin/zone/${zoneId}/wards`
      );
      
      console.log('📡 Wards Response:', wardsResponse);

      // Fetch vote summary
      const voteSummaryResponse = await apiClient.get<{ 
        success: boolean; 
        summary: any[]; 
        totalVotes: number;
      }>(
        `/admin/zone/${zoneId}/vote-summary`
      );
      
      console.log('📡 Vote Summary Response:', voteSummaryResponse);

      // Build analytics data from API responses
      const stats = statsResponse.stats || {};
      const wards = wardsResponse.wards || [];
      const voteSummary = voteSummaryResponse.summary || [];

      // Calculate verification rate
      const totalResults = stats.totalResults || 0;
      const verifiedResults = stats.approvedResults || 0;
      const verificationRate = totalResults > 0 ? Math.round((verifiedResults / totalResults) * 100) : 0;

      // Calculate average progress from wards
      const totalProgress = wards.reduce((sum: number, w: any) => sum + (w.progress || 0), 0);
      const averageProgress = wards.length > 0 ? Math.round(totalProgress / wards.length) : 0;

      // Transform ward data
      const wardPerformance = wards.map((ward: any) => ({
        id: ward.id,
        name: ward.name,
        progress: ward.progress || 0,
        results: ward.resultsSubmitted || 0,
        incidents: ward.incidents || 0,
        agents: ward.agents || 0,
        activeAgents: ward.activeAgents || 0,
      }));

      // Transform vote distribution
      const colors = ['#3B82F6', '#22C55E', '#EF4444', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];
      const voteDistribution = voteSummary.map((item: any, index: number) => ({
        party: item.party || item.partyName || 'Unknown',
        votes: item.votes || 0,
        percentage: item.percentage || 0,
        color: item.color || colors[index % colors.length],
      }));

      setAnalyticsData({
        overview: {
          totalPollingUnits: stats.totalPollingUnits || 0,
          totalAgents: stats.totalAgents || 0,
          activeAgents: stats.activeAgents || 0,
          totalResults: totalResults,
          verificationRate: verificationRate,
          totalIncidents: stats.totalIncidents || 0,
          criticalIncidents: stats.criticalIncidents || 0,
          averageProgress: averageProgress,
        },
        wardPerformance: wardPerformance,
        voteDistribution: voteDistribution,
      });

      // Set zone name
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else if (wards.length > 0 && wards[0].zoneName) {
        setZoneName(wards[0].zoneName);
      } else {
        setZoneName('your zone');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  // Initial load
  useEffect(() => {
    if (user?.zoneId) {
      fetchData(true);
    }
  }, [fetchData, user?.zoneId, timeRange]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData(false);
  };

  // Get progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Analytics"
          subtitle="Comprehensive analytics and insights for your zone"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Analytics"
          subtitle="Comprehensive analytics and insights for your zone"
        />
        <div className="flex-1 container p-4 md:p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <p className="text-muted-foreground">No analytics data available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { overview, wardPerformance, voteDistribution } = analyticsData;

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Zone Analytics"
        subtitle={`Comprehensive analytics and insights for ${zoneName || 'your zone'}`}
      />

      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Polling Units</p>
                  <p className="text-2xl font-bold">{overview.totalPollingUnits}</p>
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
                  <p className="text-2xl font-bold text-green-600">
                    {overview.activeAgents}/{overview.totalAgents}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Results</p>
                  <p className="text-2xl font-bold text-yellow-600">{overview.totalResults}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verification Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{overview.verificationRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Incidents</p>
                  <p className="text-2xl font-bold text-red-600">{overview.criticalIncidents}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress and Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Progress</p>
                  <p className="text-2xl font-bold">{overview.averageProgress}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              <Progress value={overview.averageProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Incidents</p>
                  <p className="text-2xl font-bold">{overview.totalIncidents}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {overview.criticalIncidents} critical incidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agent Activity Rate</p>
                  <p className="text-2xl font-bold">
                    {overview.totalAgents > 0 
                      ? Math.round((overview.activeAgents / overview.totalAgents) * 100) 
                      : 0}%
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-teal-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {overview.activeAgents} active out of {overview.totalAgents} agents
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="wards" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ward Performance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Vote Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Vote Distribution
                </CardTitle>
                <CardDescription>Current vote distribution by party</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {voteDistribution.length > 0 ? (
                      voteDistribution.map((party, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{party.party}</span>
                            <span className="text-sm text-muted-foreground">
                              {party.votes.toLocaleString()} votes ({party.percentage}%)
                            </span>
                          </div>
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${party.percentage}%`,
                                backgroundColor: party.color 
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No vote data available</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {voteDistribution.length > 0 ? (
                      <div className="w-48 h-48 rounded-full border-8 border-gray-200 relative">
                        {voteDistribution.map((party, index) => {
                          let startAngle = 0;
                          for (let i = 0; i < index; i++) {
                            startAngle += voteDistribution[i].percentage;
                          }
                          const angle = (party.percentage / 100) * 360;
                          return (
                            <div
                              key={index}
                              className="absolute inset-0"
                              style={{
                                background: `conic-gradient(from ${startAngle}deg, ${party.color} 0deg, ${party.color} ${angle}deg, transparent ${angle}deg)`,
                                borderRadius: '50%',
                              }}
                            />
                          );
                        })}
                        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold">
                            {voteDistribution.reduce((sum, p) => sum + p.votes, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <p>No data to display</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ward Performance Tab */}
          <TabsContent value="wards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Ward Performance Overview
                </CardTitle>
                <CardDescription>Progress and performance metrics by ward</CardDescription>
              </CardHeader>
              <CardContent>
                {wardPerformance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ward</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Results</TableHead>
                          <TableHead>Incidents</TableHead>
                          <TableHead>Agents</TableHead>
                          <TableHead>Active Agents</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wardPerformance.map((ward) => {
                          const status = ward.progress >= 80 ? 'Excellent' : 
                                        ward.progress >= 50 ? 'On Track' : 'Needs Attention';
                          const statusColor = ward.progress >= 80 ? 'text-green-600' :
                                            ward.progress >= 50 ? 'text-yellow-600' : 'text-red-600';
                          
                          return (
                            <TableRow key={ward.id}>
                              <TableCell className="font-medium">{ward.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={ward.progress}
                                    className={`w-24 ${getProgressColor(ward.progress)}`}
                                  />
                                  <span className="text-sm font-medium">{ward.progress}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{ward.results}</TableCell>
                              <TableCell>
                                <Badge variant={ward.incidents > 0 ? 'destructive' : 'outline'}>
                                  {ward.incidents}
                                </Badge>
                              </TableCell>
                              <TableCell>{ward.agents}</TableCell>
                              <TableCell>{ward.activeAgents}</TableCell>
                              <TableCell>
                                <span className={`font-medium ${statusColor}`}>{status}</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No ward data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            toast({
              title: "Export",
              description: "Export functionality coming soon",
            });
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={() => {
            window.print();
          }}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}