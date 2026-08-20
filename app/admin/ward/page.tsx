// app/admin/ward/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { MessagingWidget } from '@/components/admin/MessagingWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin, Users, AlertTriangle, AlertCircle, MessageSquare, Bell, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { io, Socket } from 'socket.io-client';

// Import components
import { StatsCards } from '@/components/admin/ward/StatsCards';
import { ResultStatusCards } from '@/components/admin/ward/ResultStatusCards';
import { PendingResultsTab } from '@/components/admin/ward/PendingResultsTab';
import { PollingUnitsTab } from '@/components/admin/ward/PollingUnitsTab';
import { AgentsTab } from '@/components/admin/ward/AgentsTab';
import { IncidentsTab } from '@/components/admin/ward/IncidentsTab';
import { PartiesQuickRef } from '@/components/admin/ward/PartiesQuickRef';
import { NotificationsPanel } from '@/components/admin/NotificationsPanel';

// Import types
import { 
  Party, 
  DashboardData, 
  PendingResult, 
  WardStats,
  PollingUnit,
  Incident 
} from '@/lib/types/ward-admin';
import { ROLES } from '@/lib/types';

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

export default function WardAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wardName, setWardName] = useState<string>('');
  const isSystemAdmin = user?.role === ROLES.SYSTEM_ADMIN;
  
  // Messaging Modal State
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [zonalAdminContact, setZonalAdminContact] = useState<{ id: string; name: string } | null>(null);
  
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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

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

  // Fetch Zonal Admin contact info
  const fetchZonalAdminContact = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const zoneId = user?.zoneId;
      
      if (!zoneId) {
        console.log('No zone ID found, skipping zonal admin fetch');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/admin/zone/${zoneId}/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.admin && isValidUUID(data.admin.id)) {
          console.log('✅ Found Zonal Admin:', data.admin.name);
          setZonalAdminContact({
            id: data.admin.id,
            name: data.admin.name
          });
        }
      }
    } catch (error) {
      console.error('Error fetching zonal admin:', error);
    }
  };

  // ✅ Socket.IO connection setup
  const setupSocketIO = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !user?.wardId) return;

    // Close existing connection
    if (socket) {
      socket.disconnect();
    }

    console.log('🔌 Connecting to Socket.IO...');

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      setIsConnected(true);
      
      // Join ward room
      newSocket.emit('join-ward', {
        wardId: user.wardId,
        userId: user.id,
        role: user.role,
        userName: user.name
      });
      
      // Request initial data
      newSocket.emit('request-ward-data', {
        wardId: user.wardId
      });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    // ✅ Ward data update
    newSocket.on('ward-data-update', (payload) => {
      console.log('📊 Ward data update received:', payload);
      handleWardDataUpdate(payload);
    });

    // ✅ New result
    newSocket.on('new-result', (payload) => {
      console.log('📄 New result submitted:', payload);
      handleNewResult(payload);
    });

    // ✅ Result approved
    newSocket.on('result-approved', (payload) => {
      console.log('✅ Result approved:', payload);
      handleResultApproved(payload);
    });

    // ✅ Result rejected
    newSocket.on('result-rejected', (payload) => {
      console.log('❌ Result rejected:', payload);
      handleResultRejected(payload);
    });

    // ✅ New incident
    newSocket.on('new-incident', (payload) => {
      console.log('🚨 New incident:', payload);
      handleNewIncident(payload);
    });

    // ✅ Incident updated
    newSocket.on('incident-updated', (payload) => {
      console.log('🔄 Incident updated:', payload);
      handleIncidentUpdated(payload);
    });

    // ✅ Agent status update
    newSocket.on('agent-status-update', (payload) => {
      console.log('👤 Agent status update:', payload);
      handleAgentStatusUpdate(payload);
    });

    // ✅ New message
    newSocket.on('new-message', (payload) => {
      console.log('📨 New message received:', payload);
      handleNewMessage(payload);
    });

    // ✅ Joined ward confirmation
    newSocket.on('joined-ward', (data) => {
      console.log('✅ Successfully joined ward room:', data.wardId);
    });

    setSocket(newSocket);
  }, [user?.wardId, user?.id, user?.role, user?.name]);

  // ✅ Handle ward data update (batch update)
  const handleWardDataUpdate = (payload: any) => {
    console.log('📊 Ward data update received:', payload);
    
    if (payload.stats) {
      setWardStats(prev => ({
        ...prev,
        ...payload.stats
      }));
    }
    
    if (payload.incidents) {
      setIncidents(payload.incidents);
    }
    
    if (payload.pendingResults !== undefined) {
      setPendingResults(payload.pendingResults);
    }
    
    toast({
      title: "🔄 Dashboard Updated",
      description: "Real-time data has been refreshed.",
      duration: 3000,
    });
  };

  // ✅ Handle new result
  const handleNewResult = (payload: any) => {
    console.log('📄 New result submitted:', payload);
    
    setPendingResults(prev => {
      if (prev.some(r => r.id === payload.id)) return prev;
      return [payload, ...prev];
    });
    
    setWardStats(prev => ({
      ...prev,
      pendingResults: prev.pendingResults + 1,
      totalResults: prev.totalResults + 1
    }));
    
    toast({
      title: "📄 New Result Submitted",
      description: `${payload.pollingUnitName || 'A polling unit'} has submitted results.`,
      duration: 5000,
    });
  };

  // ✅ Handle result approved
  const handleResultApproved = (payload: any) => {
    console.log('✅ Result approved:', payload);
    
    setPendingResults(prev => prev.filter(r => r.id !== payload.resultId));
    
    setWardStats(prev => ({
      ...prev,
      pendingResults: Math.max(0, prev.pendingResults - 1),
      approvedResults: prev.approvedResults + 1
    }));
    
    toast({
      title: "✅ Result Approved",
      description: payload.message || "A result has been approved.",
      duration: 3000,
    });
  };

  // ✅ Handle result rejected
  const handleResultRejected = (payload: any) => {
    console.log('❌ Result rejected:', payload);
    
    setPendingResults(prev => prev.filter(r => r.id !== payload.resultId));
    
    setWardStats(prev => ({
      ...prev,
      pendingResults: Math.max(0, prev.pendingResults - 1),
      rejectedResults: prev.rejectedResults + 1
    }));
    
    toast({
      title: "❌ Result Rejected",
      description: payload.message || "A result has been rejected.",
      duration: 3000,
      variant: "destructive",
    });
  };

  // ✅ Handle new incident
  const handleNewIncident = (payload: any) => {
    console.log('🚨 New incident:', payload);
    
    setIncidents(prev => [payload, ...prev]);
    
    setWardStats(prev => ({
      ...prev,
      totalIncidents: prev.totalIncidents + 1,
      criticalIncidents: payload.severity === 'critical' 
        ? prev.criticalIncidents + 1 
        : prev.criticalIncidents
    }));
    
    toast({
      title: `🚨 ${payload.severity?.toUpperCase() || 'New'} Incident`,
      description: payload.message || "A new incident has been reported.",
      duration: 5000,
      variant: payload.severity === 'critical' ? 'destructive' : 'default',
    });
  };

  // ✅ Handle incident updated
  const handleIncidentUpdated = (payload: any) => {
    console.log('🔄 Incident updated:', payload);
    
    setIncidents(prev => 
      prev.map(inc => 
        inc.id === payload.id ? { ...inc, ...payload } : inc
      )
    );
  };

  // ✅ Handle agent status update
  const handleAgentStatusUpdate = (payload: any) => {
    console.log('👤 Agent status update:', payload);
    
    if (payload.online !== undefined) {
      setWardStats(prev => ({
        ...prev,
        activeAgents: payload.online,
        offlineAgents: (prev.activeAgents + prev.offlineAgents) - payload.online
      }));
    }
  };

  // ✅ Handle new message
  const handleNewMessage = (payload: any) => {
    console.log('📨 New message received:', payload);
    setUnreadMessageCount(prev => prev + 1);
    
    toast({
      title: `📨 New Message from ${payload.fromName || 'Unknown'}`,
      description: payload.message?.substring(0, 50) + (payload.message?.length > 50 ? '...' : ''),
      duration: 5000,
    });
  };

  const fetchAllData = async (showRefreshToast = false) => {
    if (isSystemAdmin) {
      setLoading(false);
      return;
    }

    if (!user?.wardId) {
      console.error('No ward ID found');
      setLoading(false);
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

      const [dashboardRes, statsRes, resultsRes, partiesRes, incidentsRes, wardRes] = await Promise.all([
        fetch(`${API_BASE_URL}/protected/dashboard`, { headers }),
        fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/stats`, { headers }),
        fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/pending-results`, { headers }),
        fetch(`${API_BASE_URL}/parties`, { headers }),
        fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/incidents`, { headers }),
        fetch(`${API_BASE_URL}/admin/wards/${user.wardId}`, { headers })
      ]);

      if (!dashboardRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await dashboardRes.json();
      setDashboardData(dashboardData);

      if (wardRes.ok) {
        const wardData = await wardRes.json();
        setWardName(wardData.name);
      }

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

      await fetchUnreadCount();
      await fetchZonalAdminContact();

      // ✅ Setup Socket.IO after initial data load
      setupSocketIO();

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

  const handleOpenMessaging = () => {
    if (zonalAdminContact && isValidUUID(zonalAdminContact.id)) {
      setSelectedContactId(zonalAdminContact.id);
      setSelectedContactName(zonalAdminContact.name);
      setShowMessagingModal(true);
    } else {
      toast({
        title: "Messages",
        description: "Opening all conversations.",
        variant: "default",
      });
      setSelectedContactId(null);
      setSelectedContactName('');
      setShowMessagingModal(true);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // ✅ Cleanup Socket.IO on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Transform polling agents for UI
  const pollingUnits: PollingUnit[] = dashboardData?.pollingAgents?.map((agent, index) => {
    const isOnline = agent.updatedAt && 
      new Date(agent.updatedAt).getTime() > Date.now() - 5 * 60 * 1000;
    
    return {
      id: agent.id,
      name: agent.assignedPollingUnit?.name || `Polling Unit ${index + 1}`,
      code: `PU-${(index + 1).toString().padStart(3, '0')}`,
      registeredVoters: 0,
      agent: agent.name,
      status: isOnline ? 'active' : 'offline',
      resultsSubmitted: false
    };
  }) || [];

  const agents = dashboardData?.pollingAgents?.map(agent => ({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    pollingUnitName: agent.assignedPollingUnit?.name || 'Unassigned',
    updatedAt: agent.updatedAt,
    lastKnownLocation: agent.lastKnownLocation,
    resultsSubmitted: agent.resultsSubmitted || 0
  })) || [];

  const handleApprove = async (resultId: string, comment: string) => {
    if (isSystemAdmin) {
      toast({
        title: "System Admin View",
        description: "You are viewing as System Admin. To manage results, use the System Admin dashboard.",
        variant: "default",
      });
      return;
    }

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
    if (isSystemAdmin) {
      toast({
        title: "System Admin View",
        description: "You are viewing as System Admin. To manage results, use the System Admin dashboard.",
        variant: "default",
      });
      return;
    }

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
          hideNotifications={true}
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

  // System Admin view
  if (isSystemAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Ward Admin Dashboard" 
          subtitle="System Admin View"
          hideNotifications={true}
        />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">System Admin View</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You are logged in as a System Administrator. The Ward Admin dashboard requires a specific ward assignment.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/admin/system">
                    <Button size="lg">
                      Go to System Admin Dashboard
                    </Button>
                  </Link>
                  <Link href="/admin/ward/polling-units">
                    <Button variant="outline" size="lg">
                      <MapPin className="h-4 w-4 mr-2" />
                      View All Polling Units
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ✅ Regular Ward Admin view with hideNotifications={true}
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Ward Admin Dashboard" 
        subtitle={`Managing ${wardName || 'Ward'} ${!isConnected ? '🔴 Offline' : '🟢 Live'}`}
        hideNotifications={true}
        actions={
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <Badge variant={isConnected ? "default" : "destructive"} className="hidden sm:flex">
              {isConnected ? (
                <><Wifi className="h-3 w-3 mr-1" /> Live</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
              )}
            </Badge>
            
            {/* ✅ Notifications Panel - Only here, not in AdminHeader */}
            {user?.id && (
              <NotificationsPanel 
                userId={user.id}
                userRole={user.role}
                wardId={user.role === ROLES.WARD_ADMIN ? user.wardId : undefined}
              />
            )}
            
            {/* Message Button */}
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
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span>Real-time connection lost. Dashboard may not show latest updates.</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto bg-white"
              onClick={setupSocketIO}
            >
              Reconnect
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Overview</h2>
            <Badge variant="outline" className="ml-2">
              {isConnected ? 'Live Updates' : 'Offline'}
            </Badge>
          </div>
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
              Agents ({agents.length})
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
            <PollingUnitsTab wardId={user?.wardId} />
          </TabsContent>

          <TabsContent value="agents">
            <AgentsTab wardId={user?.wardId} />
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