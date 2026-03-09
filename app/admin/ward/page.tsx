"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';  // Add this import
import { Skeleton } from '@/components/ui/skeleton';  // Add this import

// Import components
import { StatsCards } from '@/components/admin/ward/StatsCards';
import { ResultStatusCards } from '@/components/admin/ward/ResultStatusCards';
import { PendingResultsTab } from '@/components/admin/ward/PendingResultsTab';
import { PollingUnitsTab } from '@/components/admin/ward/PollingUnitsTab';
import { AgentsTab } from '@/components/admin/ward/AgentsTab';
import { IncidentsTab } from '@/components/admin/ward/IncidentsTab';
import { PartiesQuickRef } from '@/components/admin/ward/PartiesQuickRef';

// Import types
import { 
  Party, 
  DashboardData, 
  PendingResult, 
  WardStats,
  PollingUnit,
  Incident 
} from '@/lib/types/ward-admin';

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

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setWardStats(statsData);
      }

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setPendingResults(resultsData);
      }

      if (partiesRes.ok) {
        const partiesData = await partiesRes.json();
        const partyMap: Record<string, Party> = {};
        partiesData.parties.forEach((party: Party) => {
          partyMap[party.id] = party;
        });
        setParties(partyMap);
        setPartiesList(partiesData.parties);
      }

      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        setIncidents(incidentsData);
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

  const handleApprove = async (resultId: string, comment: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve result');
      }

      toast({
        title: "Success",
        description: "Result approved successfully",
      });

      setWardStats(prev => ({
        ...prev,
        pendingResults: prev.pendingResults - 1,
        approvedResults: prev.approvedResults + 1
      }));

      setPendingResults(prev => prev.filter(r => r.id !== resultId));
    } catch (error) {
      console.error('Error approving result:', error);
      toast({
        title: "Error",
        description: "Failed to approve result",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (resultId: string, comment: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject result');
      }

      toast({
        title: "Success",
        description: "Result rejected",
      });

      setWardStats(prev => ({
        ...prev,
        pendingResults: prev.pendingResults - 1,
        rejectedResults: prev.rejectedResults + 1
      }));

      setPendingResults(prev => prev.filter(r => r.id !== resultId));
    } catch (error) {
      console.error('Error rejecting result:', error);
      toast({
        title: "Error",
        description: "Failed to reject result",
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
        <StatsCards stats={wardStats} />

        {/* Results Status */}
        <ResultStatusCards stats={wardStats} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending-results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending-results" className="gap-2">
              <RefreshCw className="h-4 w-4" />
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

          <TabsContent value="pending-results">
            <PendingResultsTab 
              results={pendingResults}
              parties={parties}
              onApprove={handleApprove}
              onReject={handleReject}
              formatDate={formatDate}
              getInitials={getInitials}
            />
          </TabsContent>

          <TabsContent value="polling-units">
            <PollingUnitsTab 
              units={pollingUnits}
              getInitials={getInitials}
            />
          </TabsContent>

          <TabsContent value="agents">
            <AgentsTab 
              agents={agents}
              getInitials={getInitials}
            />
          </TabsContent>

          <TabsContent value="incidents">
            <IncidentsTab 
              incidents={incidents}
              getSeverityColor={getSeverityColor}
              getStatusColor={getStatusColor}
            />
          </TabsContent>
        </Tabs>

        {/* Parties Quick Reference */}
        <PartiesQuickRef parties={partiesList} />
      </div>
    </div>
  );
}