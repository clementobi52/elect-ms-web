"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AgentMessaging } from "./AgentMessaging";
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
  status?: "Online" | "Offline";
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
  const [selectedAgentForMessage, setSelectedAgentForMessage] =
    useState<Agent | null>(null);
  const [agentToReconcile, setAgentToReconcile] = useState<Agent | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Add ref to track if component is mounted and if refresh is paused
  const isMounted = useRef(true);
  const refreshPaused = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const targetWardId = wardId || user?.wardId;

  // Pause refresh when typing in search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Pause auto-refresh while typing
    refreshPaused.current = true;

    // Resume auto-refresh after 2 seconds of no typing
    const timeout = setTimeout(() => {
      refreshPaused.current = false;
    }, 2000);

    return () => clearTimeout(timeout);
  };

  useEffect(() => {
    isMounted.current = true;

    if (targetWardId) {
      fetchAgents();
    }

    return () => {
      isMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [targetWardId]);

  // Separate effect for setting up auto-refresh
  useEffect(() => {
    if (!targetWardId) return;

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      // Only refresh if not paused and component is mounted
      if (!refreshPaused.current && isMounted.current) {
        fetchAgents(false);
      }
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [targetWardId]); // Re-run when wardId changes

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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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

      // Only update state if component is still mounted
      if (isMounted.current) {
        setAgents(processedAgents);
      }

      if (showToast && isMounted.current) {
        toast({
          title: "Success",
          description: `Loaded ${processedAgents.length} agents`,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching agents:", error);
      if (isMounted.current) {
        setError(
          error instanceof Error ? error.message : "Failed to load agents",
        );
        if (showToast) {
          toast({
            title: "Error",
            description:
              error instanceof Error ? error.message : "Failed to load agents",
            variant: "destructive",
          });
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Rest of your handlers (handleReconcileLocation, getInitials, etc.) remain the same
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
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
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

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.pollingUnitName.toLowerCase().includes(searchTerm.toLowerCase()),
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
              <CardTitle>Polling Agents</CardTitle>
              <CardDescription>
                Agents assigned to polling units in your ward
              </CardDescription>
            </div>
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
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error display */}
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
                          className={`mr-1 h-2 w-2 rounded-full inline-block ${agent.status === "Online" ? "bg-green-600 animate-pulse" : "bg-gray-500"}`}
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
                            onSelect={() => setSelectedAgentForMessage(agent)}
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

      {/* Agent Messaging Modal */}
      {selectedAgentForMessage && (
        <AgentMessaging
          agent={selectedAgentForMessage}
          onClose={() => setSelectedAgentForMessage(null)}
          getInitials={getInitials}
        />
      )}
    </>
  );
}
