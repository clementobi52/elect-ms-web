// components/admin/ward/AgentsTab.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessagingWidget } from "@/components/admin/MessagingWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket-service";
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';

interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnitName: string;
  pollingUnitId?: string;
  updatedAt?: string;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
  resultsSubmitted?: number;
  status: "Online" | "Offline";
  lastActive?: string;
  locationReconciledBy?: string;
  locationReconciledAt?: string;
}

interface AgentsTabProps {
  wardId?: string;
}

export function AgentsTab({ wardId }: AgentsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentForMessage, setSelectedAgentForMessage] = useState<Agent | null>(null);
  const [agentToReconcile, setAgentToReconcile] = useState<Agent | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const targetWardId = wardId || user?.wardId;

  // ✅ Listen for agent status updates from socket
  useEffect(() => {
    if (!targetWardId) return;

    const socket = getSocket();

    // ✅ Handler for ward data update
    const handleWardDataUpdate = (data: any) => {
      console.log('📢 AgentsTab: Socket ward-data-update received:', data);
      if (data && data.agents) {
        const processedAgents = data.agents.map((agent: any) => {
          const isOnline = agent.status === 'Online' || agent.status === 'online';
          return {
            ...agent,
            status: isOnline ? 'Online' : 'Offline',
            lastActive: isOnline ? 'Just now' : agent.lastActive || 'Offline'
          };
        });
        setAgents(processedAgents);
        
        // Show toast for status changes
        const onlineAgents = processedAgents.filter((a: Agent) => a.status === 'Online');
        const offlineAgents = processedAgents.filter((a: Agent) => a.status === 'Offline');
        console.log(`📊 AgentsTab: ${onlineAgents.length} online, ${offlineAgents.length} offline`);
      }
    };

    // ✅ Handler for individual agent status update
    const handleAgentStatusUpdate = (data: any) => {
      console.log('📢 AgentsTab: Socket agent-status-update received:', data);
      if (data && data.agentId && data.status) {
        setAgents(prev => 
          prev.map(agent => 
            agent.id === data.agentId 
              ? { 
                  ...agent, 
                  status: data.status === 'Online' ? 'Online' : 'Offline',
                  lastActive: data.status === 'Online' ? 'Just now' : agent.lastActive,
                  updatedAt: data.timestamp || agent.updatedAt
                } 
              : agent
          )
        );
        
        // Show toast for status change
        const agentName = agents.find(a => a.id === data.agentId)?.name || 'Agent';
        toast({
          title: `${agentName} is now ${data.status}`,
          description: data.status === 'Online' ? 'Agent is online' : 'Agent is offline',
          duration: 3000,
          variant: data.status === 'Online' ? 'default' : 'destructive',
        });
      }
    };

    if (socket) {
      socket.on('ward-data-update', handleWardDataUpdate);
      socket.on('agent-status-update', handleAgentStatusUpdate);
      
      // Check connection status
      setIsConnected(socket.connected);
      
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
    }

    return () => {
      if (socket) {
        socket.off('ward-data-update', handleWardDataUpdate);
        socket.off('agent-status-update', handleAgentStatusUpdate);
      }
    };
  }, [targetWardId, toast]);

  // Pause refresh when typing in search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // ✅ Fetch agents - now handles both initial load and refresh
  const fetchAgents = async (showToast = false) => {
    if (!targetWardId) {
      setError("No ward ID found");
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
      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const url = `${API_BASE_URL}/admin/ward/${targetWardId}/agents`;
      console.log("📡 Fetching agents from:", url);

      const response = await fetch(url, {
        headers: withTenantHeaders({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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

      // Process agents to calculate online status based on last activity
      const processedAgents = data.map((agent: any) => {
        let isOnline = false;
        let lastActiveText = "Unknown";

        if (agent.updatedAt) {
          const lastActive = new Date(agent.updatedAt).getTime();
          const now = Date.now();
          const diffMs = now - lastActive;
          const diffMins = Math.floor(diffMs / 60000);

          isOnline = diffMins < 5;

          if (diffMins < 1) {
            lastActiveText = "Just now";
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
          status: isOnline ? "Online" : "Offline",
          lastActive: lastActiveText,
        };
      });

      setAgents(processedAgents);

      if (showToast) {
        toast({
          title: "Success",
          description: `Loaded ${processedAgents.length} agents`,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching agents:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load agents"
      );
      if (showToast) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load agents",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (targetWardId) {
      fetchAgents();
    }
  }, [targetWardId]);

  const handleReconcileLocation = async (agent: Agent) => {
    if (!agent.lastKnownLocation) {
      toast({
        title: "Cannot Reconcile",
        description: "Agent does not have a current location",
        variant: "destructive",
      });
      setShowReconcileModal(false);
      return;
    }

    try {
      setReconciling(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_BASE_URL}/admin/agents/${agent.id}/reconcile-location`,
        {
          method: "POST",
          headers: withTenantHeaders({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reconcile location");
      }

      toast({
        title: "Success",
        description: `Polling unit location updated based on ${agent.name}'s location`,
      });

      await fetchAgents(true);
      setShowReconcileModal(false);
      setAgentToReconcile(null);
    } catch (error) {
      console.error("Error reconciling location:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to reconcile location",
        variant: "destructive",
      });
    } finally {
      setReconciling(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleOpenMessaging = (agent: Agent) => {
    setSelectedAgentForMessage(agent);
    setShowMessagingModal(true);
  };

  const handleCloseMessaging = () => {
    setShowMessagingModal(false);
    setSelectedAgentForMessage(null);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.pollingUnitName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount = agents.filter((a) => a.status === "Online").length;
  const offlineCount = agents.filter((a) => a.status === "Offline").length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polling Agents</CardTitle>
          <CardDescription>Loading agents...</CardDescription>
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Polling Agents</CardTitle>
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className={
                    isConnected
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {isConnected ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {isConnected ? "Live" : "Polling"}
                </Badge>
              </div>
              <CardDescription>
                Agents assigned to polling units in your ward
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAgents(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Search and Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
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

          {/* Agents Table */}
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No agents found</p>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(agent.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{agent.name}</span>
                          {agent.lastKnownLocation && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {agent.lastKnownLocation.latitude.toFixed(4)},{" "}
                                {agent.lastKnownLocation.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
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
                        variant={
                          agent.status === "Online" ? "default" : "secondary"
                        }
                        className={
                          agent.status === "Online"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        <span
                          className={`mr-1 h-2 w-2 rounded-full inline-block ${
                            agent.status === "Online"
                              ? "bg-green-600 animate-pulse"
                              : "bg-gray-500"
                          }`}
                        />
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agent.lastActive}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {agent.resultsSubmitted || 0} submitted
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => handleOpenMessaging(agent)}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              if (!agent.lastKnownLocation) {
                                toast({
                                  title: "Cannot Reconcile",
                                  description:
                                    "Agent does not have a current location",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setAgentToReconcile(agent);
                              setShowReconcileModal(true);
                            }}
                            disabled={!agent.lastKnownLocation}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Update Polling Unit Location
                          </DropdownMenuItem>
                          {agent.lastKnownLocation && (
                            <DropdownMenuItem>
                              <MapPin className="mr-2 h-4 w-4" />
                              View Location
                            </DropdownMenuItem>
                          )}
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

      {/* Update Polling Unit Location Modal */}
      <Dialog
        open={showReconcileModal && agentToReconcile !== null}
        onOpenChange={setShowReconcileModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Polling Unit Location</DialogTitle>
            <DialogDescription>
              This will update the polling unit's coordinates to match where{" "}
              {agentToReconcile?.name} is currently located.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Agent's Current Location:</strong>{" "}
                {agentToReconcile?.lastKnownLocation
                  ? `${agentToReconcile.lastKnownLocation.latitude.toFixed(6)}, ${agentToReconcile.lastKnownLocation.longitude.toFixed(6)}`
                  : "Unknown"}
              </p>
              <p className="text-sm text-yellow-800 mt-2">
                <strong>Polling Unit:</strong>{" "}
                {agentToReconcile?.pollingUnitName}
              </p>
              <p className="text-sm text-yellow-800">
                <strong>Action:</strong> The polling unit's coordinates will be
                updated to match the agent's current location
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this when a polling station has physically moved. The agent
              will receive a notification about this change. This action is
              logged for audit purposes.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReconcileModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                agentToReconcile && handleReconcileLocation(agentToReconcile)
              }
              disabled={reconciling}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {reconciling ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Polling Unit Location
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messaging Modal */}
      {showMessagingModal && selectedAgentForMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseMessaging();
            }
          }}
        >
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedAgentForMessage.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold truncate">
                    {selectedAgentForMessage.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedAgentForMessage.pollingUnitName}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseMessaging}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px] max-h-[calc(90vh-80px)]">
              <MessagingWidget
                initialContactId={selectedAgentForMessage.id}
                initialContactName={selectedAgentForMessage.name}
                onSelectConversation={() => {
                  console.log(
                    "Conversation selected with:",
                    selectedAgentForMessage.name
                  );
                }}
                className="h-full border-0 rounded-none"
                showHeader={false}
                maxHeight="100%"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}