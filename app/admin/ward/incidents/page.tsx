"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Flag,
  UserCheck,
  MapPin,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';

interface Incident {
  id: string;
  type: string;
  description?: string;
  pollingUnitId?: string;
  pollingUnitName: string;
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
  latitude?: number;
  longitude?: number;
}

export default function IncidentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'Investigating' | 'Resolved'>('Investigating');
  const [updateComment, setUpdateComment] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchIncidents();
  }, [user]);

  const fetchIncidents = async (showRefreshToast = false) => {
    if (!user?.wardId) {
      setError('No ward ID found');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
        
        if (showRefreshToast) {
          toast({
            title: "Success",
            description: `Loaded ${data.length} incidents`,
          });
        }
      } else {
        console.error('Failed to fetch incidents:', response.status);
        setError('Failed to load incidents from server');
        
        // Demo data as fallback
        const demoData: Incident[] = [
          {
            id: '1',
            type: 'Violence',
            description: 'Physical altercation between voters at polling unit',
            pollingUnitName: 'Polling Unit 1',
            reporterName: 'John Doe',
            severity: 'Critical',
            status: 'Pending',
            time: '2 hours ago'
          },
          {
            id: '2',
            type: 'Disruption',
            description: 'Minor disruption due to technical issues with card reader',
            pollingUnitName: 'Polling Unit 2',
            reporterName: 'Jane Smith',
            severity: 'High',
            status: 'Investigating',
            time: '5 hours ago'
          },
          {
            id: '3',
            type: 'Irregularity',
            description: 'Suspected ballot stuffing at polling unit',
            pollingUnitName: 'Polling Unit 3',
            reporterName: 'Mike Johnson',
            severity: 'Critical',
            status: 'Pending',
            time: '1 day ago'
          }
        ];
        setIncidents(demoData);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setError('Failed to load incidents');
      
      // Demo data on error
      const demoData: Incident[] = [
        {
          id: '1',
          type: 'Violence',
          description: 'Physical altercation between voters at polling unit',
          pollingUnitName: 'Polling Unit 1',
          reporterName: 'John Doe',
          severity: 'Critical',
          status: 'Pending',
          time: '2 hours ago'
        },
        {
          id: '2',
          type: 'Disruption',
          description: 'Minor disruption due to technical issues with card reader',
          pollingUnitName: 'Polling Unit 2',
          reporterName: 'Jane Smith',
          severity: 'High',
          status: 'Investigating',
          time: '5 hours ago'
        }
      ];
      setIncidents(demoData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update incident');
      }

      // Update local state with the returned incident data
      setIncidents(prev => prev.map(inc => 
        inc.id === selectedIncident.id ? data.incident : inc
      ));

      toast({
        title: "Success",
        description: data.message,
      });

      setIsUpdateDialogOpen(false);
      setUpdateComment('');
      setSelectedIncident(null);
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update incident",
        variant: "destructive",
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'investigating':
        return <Badge className="bg-blue-100 text-blue-800">Investigating</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredIncidents = incidents.filter(incident => 
    incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.pollingUnitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.reporterName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingIncidents = filteredIncidents.filter(i => i.status?.toLowerCase() === 'pending');
  const investigatingIncidents = filteredIncidents.filter(i => i.status?.toLowerCase() === 'investigating');
  const resolvedIncidents = filteredIncidents.filter(i => i.status?.toLowerCase() === 'resolved');

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Incidents" subtitle="Loading incidents..." />
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
        title="Incident Management" 
        subtitle={`Managing incidents in your ward`}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Header with search and stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="h-3 w-3 mr-1" /> Pending: {pendingIncidents.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-blue-50">
              <AlertTriangle className="h-3 w-3 mr-1" /> Investigating: {investigatingIncidents.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" /> Resolved: {resolvedIncidents.length}
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchIncidents(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="all">All ({filteredIncidents.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingIncidents.length})</TabsTrigger>
            <TabsTrigger value="investigating">Investigating ({investigatingIncidents.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedIncidents.length})</TabsTrigger>
          </TabsList>

          {/* All Incidents Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Incidents</CardTitle>
                    <CardDescription>Complete list of all reported incidents</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">{incident.type}</TableCell>
                        <TableCell>{incident.pollingUnitName}</TableCell>
                        <TableCell>{incident.reporterName}</TableCell>
                        <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                        <TableCell>{getStatusBadge(incident.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{incident.time}</TableCell>
                        <TableCell className="text-right">
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
                          {incident.status?.toLowerCase() !== 'resolved' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="ml-2"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setUpdateStatus(incident.status?.toLowerCase() === 'pending' ? 'Investigating' : 'Resolved');
                                setIsUpdateDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {incident.status?.toLowerCase() === 'pending' ? 'Investigate' : 'Resolve'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Incidents</CardTitle>
                <CardDescription>Incidents awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">{incident.type}</TableCell>
                        <TableCell>{incident.pollingUnitName}</TableCell>
                        <TableCell>{incident.reporterName}</TableCell>
                        <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{incident.time}</TableCell>
                        <TableCell className="text-right">
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="ml-2"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setUpdateStatus('Investigating');
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Investigate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investigating Tab */}
          <TabsContent value="investigating">
            <Card>
              <CardHeader>
                <CardTitle>Under Investigation</CardTitle>
                <CardDescription>Incidents currently being investigated</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investigatingIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">{incident.type}</TableCell>
                        <TableCell>{incident.pollingUnitName}</TableCell>
                        <TableCell>{incident.reporterName}</TableCell>
                        <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{incident.time}</TableCell>
                        <TableCell className="text-right">
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="ml-2"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setUpdateStatus('Resolved');
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resolved Tab */}
          <TabsContent value="resolved">
            <Card>
              <CardHeader>
                <CardTitle>Resolved Incidents</CardTitle>
                <CardDescription>Incidents that have been resolved</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">{incident.type}</TableCell>
                        <TableCell>{incident.pollingUnitName}</TableCell>
                        <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{incident.time}</TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Incident Dialog */}
        <Dialog open={isViewDialogOpen && selectedIncident !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Incident Details
              </DialogTitle>
              <DialogDescription>
                Reported from {selectedIncident?.pollingUnitName}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedIncident && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="font-medium">{selectedIncident.type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Severity</Label>
                      <div>{getSeverityBadge(selectedIncident.severity)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(selectedIncident.status)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Reported By</Label>
                      <p className="font-medium">{selectedIncident.reporterName}</p>
                    </div>
                  </div>

                  {selectedIncident.description && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                        {selectedIncident.description}
                      </p>
                    </div>
                  )}

                  {(selectedIncident.images && selectedIncident.images.length > 0) && (
                    <div>
                      <Label className="text-muted-foreground">Media Evidence</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {selectedIncident.images.map((image, index) => (
                          <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={image} 
                              alt={`Evidence ${index + 1}`} 
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(image, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedIncident.reviewComment && (
                    <div>
                      <Label className="text-muted-foreground">Review Comment</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                        {selectedIncident.reviewComment}
                      </p>
                    </div>
                  )}

                  {selectedIncident.latitude && selectedIncident.longitude && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <p className="text-sm">
                        Lat: {selectedIncident.latitude.toFixed(6)}, Long: {selectedIncident.longitude.toFixed(6)}
                      </p>
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
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {selectedIncident?.status?.toLowerCase() === 'pending' ? 'Start Investigation' : 'Resolve Incident'}
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
                {selectedIncident?.type} at {selectedIncident?.pollingUnitName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Review Comment</Label>
                <Textarea
                  id="comment"
                  placeholder="Add details about your investigation or resolution..."
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
                className={updateStatus === 'Resolved' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {updateStatus === 'Investigating' ? (
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
    </div>
  );
}