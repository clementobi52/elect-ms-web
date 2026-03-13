"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Users, Search, RefreshCw, AlertCircle, Mail } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnitName: string;
  updatedAt?: string;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
  resultsSubmitted?: number;
}

export default function AgentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAgents();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAgents(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const fetchAgents = async (showToast = false) => {
    if (!user?.wardId) {
      setError('No ward ID found');
      setLoading(false);
      return;
    }

    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/admin/ward/${user.wardId}/agents`;
      console.log('📡 Fetching agents from:', url);
      
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('Error response data:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Raw agent data:', data);
      
      // Process agents to calculate online status based on last activity
      const processedAgents = data.map((agent: any) => {
        // Calculate online status (active in last 5 minutes)
        let isOnline = false;
        let lastActiveText = 'Unknown';
        
        if (agent.updatedAt) {
          const lastActive = new Date(agent.updatedAt).getTime();
          const now = Date.now();
          const diffMs = now - lastActive;
          const diffMins = Math.floor(diffMs / 60000);
          
          // Online if active in last 5 minutes
          isOnline = diffMins < 5;
          
          // Calculate last active text
          if (diffMins < 1) {
            lastActiveText = 'Just now';
          } else if (diffMins < 60) {
            lastActiveText = `${diffMins} min ago`;
          } else if (diffMins < 1440) {
            lastActiveText = `${Math.floor(diffMins / 60)} hours ago`;
          } else {
            lastActiveText = `${Math.floor(diffMins / 1440)} days ago`;
          }
        }

        return {
          ...agent,
          status: isOnline ? 'Online' : 'Offline',
          lastActive: lastActiveText
        };
      });
      
      console.log('✅ Processed agents:', processedAgents);
      setAgents(processedAgents);
      
      if (showToast) {
        toast({
          title: "Success",
          description: `Loaded ${processedAgents.length} agents`,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching agents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load agents');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.pollingUnitName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount = agents.filter(a => a.status === 'Online').length;
  const offlineCount = agents.filter(a => a.status === 'Offline').length;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Polling Agents" subtitle="Loading agents..." />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Polling Agents" 
        subtitle={`Managing agents in your ward`}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Header with stats and refresh */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="px-3 py-1">
                <Users className="h-3 w-3 mr-1" /> Total: {agents.length}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-green-50">
                <span className="mr-1 h-2 w-2 rounded-full bg-green-600 inline-block" />
                Online: {onlineCount}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-gray-50">
                <span className="mr-1 h-2 w-2 rounded-full bg-gray-400 inline-block" />
                Offline: {offlineCount}
              </Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAgents(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>All Polling Agents</CardTitle>
              <CardDescription>View and manage agents assigned to polling units</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agents found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Polling Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {agent.email}
                        </div>
                      </TableCell>
                      <TableCell>{agent.pollingUnitName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={agent.status === 'Online' ? 'default' : 'secondary'}
                          className={agent.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          <span className={`mr-1 h-2 w-2 rounded-full inline-block ${agent.status === 'Online' ? 'bg-green-600 animate-pulse' : 'bg-gray-500'}`} />
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agent.lastActive}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{agent.resultsSubmitted || 0} submitted</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}