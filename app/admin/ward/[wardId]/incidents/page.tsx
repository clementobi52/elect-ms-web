// app/admin/ward/[wardId]/incidents/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  Download,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface Incident {
  id: string;
  type: string;
  description?: string;
  pollingUnitId?: string;
  pollingUnitName: string;
  wardId?: string;
  wardName?: string;
  reporterId?: string;
  reporterName: string;
  severity: string;
  status: string;
  time: string;
  images?: string[];
  mediaUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewComment?: string;
}

export default function WardIncidentsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const wardId = params.wardId as string;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'Investigating' | 'Resolved'>('Investigating');
  const [updateComment, setUpdateComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [wardName, setWardName] = useState<string>('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Fetch incidents
  const fetchIncidents = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch incidents for this ward
      const response = await fetch(`${API_BASE_URL}/admin/ward/${wardId}/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }

      const data = await response.json();
      setIncidents(data);

      // Also fetch ward name
      const wardResponse = await fetch(`${API_BASE_URL}/admin/wards/${wardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (wardResponse.ok) {
        const wardData = await wardResponse.json();
        setWardName(wardData.name);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast({
        title: "Error",
        description: "Failed to load incidents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wardId, toast]);

  // Initial load
  useEffect(() => {
    if (wardId) {
      fetchIncidents(true);
    }
  }, [wardId, fetchIncidents]);

  // Handle refresh
  const handleRefresh = () => {
    fetchIncidents(false);
  };

  // Handle update incident status
  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;

    setIsUpdating(true);

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/incidents/${selectedIncident.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: updateStatus,
          reviewComment: updateComment
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update incident');
      }

      toast({
        title: "Success",
        description: `Incident marked as ${updateStatus}`,
      });

      setIsUpdateDialogOpen(false);
      setUpdateComment('');
      setSelectedIncident(null);
      
      // Refresh the list
      await fetchIncidents(false);
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: "Error",
        description: "Failed to update incident",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get action button based on status
  const getActionButton = (incident: Incident) => {
    switch (incident.status?.toLowerCase()) {
      case 'pending':
        return {
          label: 'Investigate',
          icon: <AlertTriangle className="h-4 w-4 mr-1" />,
          nextStatus: 'Investigating' as const,
          className: 'text-blue-600 hover:text-blue-700'
        };
      case 'investigating':
        return {
          label: 'Resolve',
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          nextStatus: 'Resolved' as const,
          className: 'text-green-600 hover:text-green-700'
        };
      default:
        return null;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-100 text-red-800 border-red-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'low': 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const color = colors[severity?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={color}>{severity}</Badge>;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'investigating': 'bg-blue-100 text-blue-800 border-blue-200',
      'resolved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
    };
    const color = colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={color}>{status}</Badge>;
  };

  // Get severity color
  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-blue-100 text-blue-800',
    };
    return colors[severity?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'investigating': 'bg-blue-100 text-blue-800',
      'resolved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Format time
  const formatTime = (time: string) => {
    if (!time) return 'Unknown';
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return time;
      return date.toLocaleString();
    } catch {
      return time;
    }
  };

  // Get polling unit name
  const getPollingUnitName = (incident: Incident): string => {
    return incident.pollingUnitName || incident.pollingUnitId || 'Unknown';
  };

  // Get reporter name
  const getReporterName = (incident: Incident): string => {
    return incident.reporterName || incident.reporterId || 'Unknown';
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch =
      incident.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPollingUnitName(incident).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getReporterName(incident).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || incident.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesSeverity = filterSeverity === 'all' || incident.severity?.toLowerCase() === filterSeverity.toLowerCase();

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Stats
  const stats = {
    total: incidents.length,
    pending: incidents.filter(i => i.status?.toLowerCase() === 'pending').length,
    investigating: incidents.filter(i => i.status?.toLowerCase() === 'investigating').length,
    resolved: incidents.filter(i => i.status?.toLowerCase() === 'resolved').length,
    critical: incidents.filter(i => i.severity?.toLowerCase() === 'critical').length,
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterSeverity('all');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Ward Incidents" 
          subtitle="Loading incidents..."
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Ward Incidents" 
        subtitle={`Viewing incidents for ${wardName || 'Ward'}`}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Link href={`/admin/ward/${wardId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ward
            </Button>
          </Link>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/ward/${wardId}/incidents/export`)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Incidents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{stats.investigating}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents by type, polling unit, or reporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {(filterStatus !== 'all' || filterSeverity !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        )}

        {/* Incidents Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Incident Reports</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {filteredIncidents.length} of {incidents.length} incidents
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No incidents reported</p>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No incidents match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((incident) => {
                      const actionButton = getActionButton(incident);
                      const pollingUnitName = getPollingUnitName(incident);
                      const reporterName = getReporterName(incident);
                      
                      return (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium">{incident.type}</TableCell>
                          <TableCell>{pollingUnitName}</TableCell>
                          <TableCell>{reporterName}</TableCell>
                          <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                          <TableCell>{getStatusBadge(incident.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTime(incident.time)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedIncident(incident);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {actionButton && incident.status?.toLowerCase() !== 'resolved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={actionButton.className}
                                  onClick={() => {
                                    setSelectedIncident(incident);
                                    setUpdateStatus(actionButton.nextStatus);
                                    setIsUpdateDialogOpen(true);
                                  }}
                                >
                                  {actionButton.icon}
                                  {actionButton.label}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Incident Dialog */}
      <Dialog open={isViewDialogOpen && selectedIncident !== null} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Details
            </DialogTitle>
            <DialogDescription>
              Reported from {selectedIncident && getPollingUnitName(selectedIncident)}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedIncident && (
              <div className="space-y-4 py-4">
                {/* Type and Severity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">{selectedIncident.type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Severity</Label>
                    {getSeverityBadge(selectedIncident.severity)}
                  </div>
                </div>

                {/* Status and Reporter */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    {getStatusBadge(selectedIncident.status)}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reported By</Label>
                    <p className="font-medium">{getReporterName(selectedIncident)}</p>
                  </div>
                </div>

                {/* Polling Unit */}
                <div>
                  <Label className="text-muted-foreground">Polling Unit</Label>
                  <p className="font-medium">{getPollingUnitName(selectedIncident)}</p>
                </div>

                {/* Description */}
                {selectedIncident.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                      {selectedIncident.description}
                    </p>
                  </div>
                )}

                {/* Review Comment */}
                {selectedIncident.reviewComment && (
                  <div>
                    <Label className="text-muted-foreground">Review Comment</Label>
                    <p className="text-sm mt-1 p-3 bg-blue-50 rounded-lg whitespace-pre-wrap">
                      {selectedIncident.reviewComment}
                    </p>
                  </div>
                )}

                {/* Time */}
                <div>
                  <Label className="text-muted-foreground">Reported Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(selectedIncident.time)}
                  </p>
                </div>

                {/* Images if available */}
                {selectedIncident.images && selectedIncident.images.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Evidence</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {selectedIncident.images.map((image, index) => (
                        <div 
                          key={index} 
                          className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer"
                          onClick={() => window.open(image, '_blank')}
                        >
                          <img 
                            src={image} 
                            alt={`Evidence ${index + 1}`} 
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            {selectedIncident?.status?.toLowerCase() !== 'resolved' && (
              <Button 
                variant="default"
                onClick={() => {
                  setIsViewDialogOpen(false);
                  setUpdateStatus(selectedIncident?.status?.toLowerCase() === 'pending' ? 'Investigating' : 'Resolved');
                  setIsUpdateDialogOpen(true);
                }}
              >
                {selectedIncident?.status?.toLowerCase() === 'pending' ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Start Investigation
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Incident
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Incident Dialog */}
      <Dialog open={isUpdateDialogOpen && selectedIncident !== null} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {updateStatus === 'Investigating' ? 'Start Investigation' : 'Resolve Incident'}
            </DialogTitle>
            <DialogDescription>
              {selectedIncident?.type} at {selectedIncident && getPollingUnitName(selectedIncident)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Review Comment</Label>
              <Textarea
                id="comment"
                placeholder={updateStatus === 'Investigating' ? 
                  "Add details about your investigation plan..." : 
                  "Add details about how this incident was resolved..."}
                value={updateComment}
                onChange={(e) => setUpdateComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateIncident}
              disabled={isUpdating || !updateComment.trim()}
              className={updateStatus === 'Resolved' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : updateStatus === 'Investigating' ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Start Investigation
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve Incident
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}