"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Download, MoreVertical, RefreshCw, Search, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { getSocketAuth, withTenantHeaders } from '@/lib/tenant';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '@/lib/config';

interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  agent: string;
  agentId?: string;
  status: 'active' | 'offline' | 'inactive';
  resultsSubmitted: boolean;
  latitude?: number;
  longitude?: number;
  wardId?: string;
}

interface PollingUnitsTabProps {
  wardId?: string;
}

export function PollingUnitsTab({ wardId }: PollingUnitsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const targetWardId = wardId || user?.wardId;

  // ✅ Socket.IO setup
  const setupSocket = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !targetWardId) return;

    if (socket) {
      socket.disconnect();
    }

    console.log('🔌 PollingUnitsTab: Connecting to Socket.IO...');

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Both the token and the tenant are required: io.use() resolves the
      // tenant from the handshake and refuses the connection with 400 if the
      // slug is missing, then checks it against the token's tenantId.
      auth: getSocketAuth(token),
    });

    newSocket.on('connect', () => {
      console.log('✅ PollingUnitsTab: Socket.IO connected');
      setIsConnected(true);

      newSocket.emit('join-ward', {
        wardId: targetWardId,
        userId: user?.id,
        role: user?.role,
        userName: user?.name,
      });

      newSocket.emit('request-polling-units-data', {
        wardId: targetWardId,
      });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 PollingUnitsTab: Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ PollingUnitsTab: Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    // ✅ Polling unit status update
    newSocket.on('polling-unit-status-update', (payload) => {
      console.log('📊 PollingUnitsTab: Status update:', payload);
      handlePollingUnitStatusUpdate(payload);
    });

    // ✅ New polling unit added
    newSocket.on('polling-unit-added', (payload) => {
      console.log('📊 PollingUnitsTab: New polling unit:', payload);
      handlePollingUnitAdded(payload);
    });

    // ✅ Polling unit updated
    newSocket.on('polling-unit-updated', (payload) => {
      console.log('📊 PollingUnitsTab: Polling unit updated:', payload);
      handlePollingUnitUpdated(payload);
    });

    // ✅ Polling unit removed
    newSocket.on('polling-unit-removed', (payload) => {
      console.log('📊 PollingUnitsTab: Polling unit removed:', payload);
      handlePollingUnitRemoved(payload);
    });

    // ✅ Results submitted
    newSocket.on('result-submitted', (payload) => {
      console.log('📊 PollingUnitsTab: Result submitted:', payload);
      handleResultSubmitted(payload);
    });

    // ✅ Full data refresh
    newSocket.on('polling-units-data-refresh', (payload) => {
      console.log('🔄 PollingUnitsTab: Data refresh:', payload);
      if (payload.pollingUnits) {
        setPollingUnits(payload.pollingUnits);
      }
    });

    setSocket(newSocket);
  }, [targetWardId, user?.id, user?.role, user?.name]);

  // ✅ Handle polling unit status update
  const handlePollingUnitStatusUpdate = (payload: any) => {
    setPollingUnits((prev) =>
      prev.map((unit) =>
        unit.id === payload.pollingUnitId
          ? {
              ...unit,
              status: payload.status || unit.status,
              agent: payload.agentName || unit.agent,
              agentId: payload.agentId || unit.agentId,
            }
          : unit
      )
    );
  };

  // ✅ Handle new polling unit added
  const handlePollingUnitAdded = (payload: any) => {
    const newUnit: PollingUnit = {
      id: payload.id,
      name: payload.name,
      code: payload.code || `PU-${Date.now()}`,
      registeredVoters: payload.registeredVoters || 0,
      agent: payload.agentName || 'Unassigned',
      agentId: payload.agentId,
      status: payload.status || 'offline',
      resultsSubmitted: payload.resultsSubmitted || false,
      latitude: payload.latitude,
      longitude: payload.longitude,
      wardId: payload.wardId,
    };

    setPollingUnits((prev) => {
      if (prev.some((u) => u.id === newUnit.id)) {
        return prev.map((u) => (u.id === newUnit.id ? newUnit : u));
      }
      return [...prev, newUnit];
    });

    toast({
      title: '📊 New Polling Unit',
      description: `${newUnit.name} has been added to your ward.`,
      duration: 5000,
    });
  };

  // ✅ Handle polling unit updated
  const handlePollingUnitUpdated = (payload: any) => {
    setPollingUnits((prev) =>
      prev.map((unit) =>
        unit.id === payload.id
          ? {
              ...unit,
              name: payload.name || unit.name,
              code: payload.code || unit.code,
              registeredVoters: payload.registeredVoters || unit.registeredVoters,
              agent: payload.agentName || unit.agent,
              agentId: payload.agentId || unit.agentId,
              status: payload.status || unit.status,
              resultsSubmitted: payload.resultsSubmitted !== undefined ? payload.resultsSubmitted : unit.resultsSubmitted,
              latitude: payload.latitude || unit.latitude,
              longitude: payload.longitude || unit.longitude,
            }
          : unit
      )
    );
  };

  // ✅ Handle polling unit removed
  const handlePollingUnitRemoved = (payload: any) => {
    setPollingUnits((prev) => prev.filter((unit) => unit.id !== payload.pollingUnitId));

    toast({
      title: '📊 Polling Unit Removed',
      description: payload.message || 'A polling unit has been removed.',
      duration: 3000,
    });
  };

  // ✅ Handle result submitted
  const handleResultSubmitted = (payload: any) => {
    setPollingUnits((prev) =>
      prev.map((unit) =>
        unit.id === payload.pollingUnitId
          ? { ...unit, resultsSubmitted: true }
          : unit
      )
    );

    toast({
      title: '📄 Result Submitted',
      description: `${payload.pollingUnitName || 'A polling unit'} has submitted results.`,
      duration: 5000,
    });
  };

  // ✅ Fetch polling units
  const fetchPollingUnits = async (showToast = false) => {
    if (!targetWardId) {
      setError('No ward ID found');
      setLoading(false);
      return;
    }

    // If Socket.IO is connected, request data via socket
    if (socket && isConnected) {
      socket.emit('request-polling-units-data', {
        wardId: targetWardId,
      });

      if (showToast) {
        toast({
          title: 'Refreshing',
          description: 'Requesting latest polling unit data...',
        });
      }
      return;
    }

    // Fallback to REST API
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

      const response = await fetch(`${API_BASE_URL}/admin/ward/${targetWardId}/polling-units`, {
        headers: withTenantHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setPollingUnits(data);
    } catch (error) {
      console.error('❌ Error fetching polling units:', error);
      setError(error instanceof Error ? error.message : 'Failed to load polling units');
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to load polling units',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Setup Socket.IO
  useEffect(() => {
    if (targetWardId) {
      fetchPollingUnits();
      setupSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [targetWardId]);

  // ✅ Reconnect handler
  const handleReconnect = () => {
    setupSocket();
    fetchPollingUnits(true);
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unassigned') return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUnits = pollingUnits.filter(
    (unit) =>
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.agent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polling Units</CardTitle>
          <CardDescription>Loading polling units...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Polling Units</CardTitle>
              <Badge
                variant={isConnected ? 'default' : 'secondary'}
                className={
                  isConnected
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }
              >
                {isConnected ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {isConnected ? 'Live' : 'Polling'}
              </Badge>
            </div>
            <CardDescription>All polling units in your ward</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPollingUnits(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span>Real-time connection lost. Data may not show latest updates.</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto bg-white"
              onClick={handleReconnect}
            >
              Reconnect
            </Button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search polling units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Table */}
        {filteredUnits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No polling units found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Polling Unit</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Registered Voters</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Results</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((pu) => (
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
                    <Badge
                      variant={pu.status === 'active' ? 'default' : 'secondary'}
                      className={
                        pu.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {pu.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pu.resultsSubmitted ? (
                      <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
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
        )}
      </CardContent>
    </Card>
  );
}