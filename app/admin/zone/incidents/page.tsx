// app/admin/zone/incidents/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { IncidentsTable } from '@/components/admin/shared/IncidentsTable';
import { incidentsApi, type Incident } from '@/lib/api/incidents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  AlertTriangle,
  Building2,
  Users,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';

interface ZoneStats {
  total: number;
  pending: number;
  investigating: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export default function ZoneIncidentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ZoneStats>({
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });
  const [zoneName, setZoneName] = useState<string>('');

  // Fetch incidents and stats
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      // ✅ Get zoneId from user
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        setError('Zone ID not found');
        setLoading(false);
        return;
      }

      console.log('📡 Fetching incidents for zone:', zoneId);

      // ✅ Pass zoneId to the API
      const incidentsResponse = await incidentsApi.getIncidents(
        user?.role,
        undefined,
        zoneId
      );
      
      console.log('📡 Incidents Response:', incidentsResponse);
      
      if (incidentsResponse.success && incidentsResponse.incidents) {
        const incidentList = incidentsResponse.incidents;
        setIncidents(incidentList);
        
        // Calculate stats
        const newStats: ZoneStats = {
          total: incidentList.length,
          pending: incidentList.filter(i => i.status?.toLowerCase() === 'pending').length,
          investigating: incidentList.filter(i => i.status?.toLowerCase() === 'investigating').length,
          resolved: incidentList.filter(i => i.status?.toLowerCase() === 'resolved').length,
          critical: incidentList.filter(i => i.severity?.toLowerCase() === 'critical').length,
          high: incidentList.filter(i => i.severity?.toLowerCase() === 'high').length,
          medium: incidentList.filter(i => i.severity?.toLowerCase() === 'medium').length,
          low: incidentList.filter(i => i.severity?.toLowerCase() === 'low').length,
        };
        setStats(newStats);
      } else if (incidentsResponse.error) {
        setError(incidentsResponse.error);
      }

      // Set zone name
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }
    } catch (error) {
      console.error('Error fetching zone incidents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load incidents');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load incidents",
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
  }, [fetchData, user?.zoneId]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData(false);
  };

  // Handle incident update
  const handleIncidentUpdate = async (incidentId: string, status: string, comment: string) => {
    try {
      const response = await incidentsApi.updateIncidentStatus(
        incidentId,
        status as 'Investigating' | 'Resolved',
        comment
      );
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Incident marked as ${status}`,
        });
        await fetchData(false);
      } else {
        throw new Error(response.message || 'Failed to update incident');
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update incident",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Color functions
  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-white',
      'low': 'bg-blue-500 text-white',
      'info': 'bg-gray-500 text-white'
    };
    return colors[severity?.toLowerCase()] || 'bg-gray-500 text-white';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500 text-white',
      'investigating': 'bg-blue-500 text-white',
      'resolved': 'bg-green-500 text-white',
      'rejected': 'bg-red-500 text-white',
      'verified': 'bg-green-500 text-white'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-500 text-white';
  };

  // Get unique wards count
  const uniqueWards = new Set(incidents.map(i => i.wardName || i.ward)).size;

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Incidents"
          subtitle="Manage incidents across all wards in your zone"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Incidents"
          subtitle="Manage incidents across all wards in your zone"
        />
        <div className="flex-1 container p-4 md:p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium text-red-600">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please try refreshing the page
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Zone Incidents"
        subtitle={`Manage incidents across all wards in ${zoneName || 'your zone'}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Investigating</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.investigating || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wards</p>
                  <p className="text-2xl font-bold">{uniqueWards || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Severity Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-sm">Critical: {stats.critical || 0}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-sm">High: {stats.high || 0}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-sm">Medium: {stats.medium || 0}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-sm">Low: {stats.low || 0}</span>
          </div>
        </div>

        {/* Incidents Table */}
        <IncidentsTable
          incidents={incidents}
          loading={loading}
          onRefresh={handleRefresh}
          onUpdate={handleIncidentUpdate}
          showWard={true}
          showZone={false}
          canUpdate={true}
          role="zone"
          title="Zone Incidents"
          description="All incidents reported across wards in your zone"
          getSeverityColor={getSeverityColor}
          getStatusColor={getStatusColor}
        />

        {/* Additional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Zone Overview
            </CardTitle>
            <CardDescription>
              Summary of incidents across your zone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-xl font-bold">{stats.total || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Incidents</p>
                <p className="text-xl font-bold text-yellow-600">
                  {(stats.pending || 0) + (stats.investigating || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.total > 0 
                    ? `${Math.round((stats.resolved / stats.total) * 100)}%` 
                    : '0%'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical Rate</p>
                <p className="text-xl font-bold text-red-600">
                  {stats.total > 0 
                    ? `${Math.round((stats.critical / stats.total) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}