// components/admin/ward/IncidentsTab.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Eye, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Incident } from '@/lib/types/ward-admin';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { incidentsApi } from '@/lib/api/incidents';

interface IncidentsTabProps {
  incidents?: Incident[];
  wardId?: string;
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
  onIncidentUpdate?: (incidentId: string, status: string, comment: string) => Promise<void>;
  onRefresh?: () => void;
  title?: string;
  description?: string;
}

export function IncidentsTab({ 
  incidents: initialIncidents = [],
  wardId,
  getSeverityColor, 
  getStatusColor,
  onIncidentUpdate,
  onRefresh,
  title = "Recent Incidents",
  description = "Incidents reported from polling units in your ward"
}: IncidentsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'Investigating' | 'Resolved'>('Investigating');
  const [updateComment, setUpdateComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load incidents if not provided
  useEffect(() => {
    if (initialIncidents.length === 0 && wardId) {
      loadIncidents();
    }
  }, [wardId]);

  // Update incidents when initialIncidents changes
  useEffect(() => {
    if (initialIncidents.length > 0) {
      setIncidents(initialIncidents);
    }
  }, [initialIncidents]);

  // Debug logging
  useEffect(() => {
    if (incidents.length > 0) {
      console.log('📊 Incidents data structure:', incidents[0]);
    }
  }, [incidents]);

  // Load incidents from API
  const loadIncidents = async () => {
    setLoading(true);
    try {
      const response = wardId 
        ? await incidentsApi.getIncidentsByWard(wardId)
        : await incidentsApi.getIncidents();
      
      if (response.success && response.incidents) {
        // API incident type may differ from local Incident type (missing required polling_unit).
        // Assert to the expected type to satisfy state setter. Ensure downstream code handles potential undefined fields.
        setIncidents(response.incidents as unknown as Incident[]);
      } else {
        setIncidents([]);
      }
    } catch (error) {
      console.error('❌ Error loading incidents:', error);
      toast({
        title: "Error",
        description: "Failed to load incidents",
        variant: "destructive",
      });
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      await loadIncidents();
    }
  };

  // Handle incident update
  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;

    setIsUpdating(true);

    try {
      if (onIncidentUpdate) {
        await onIncidentUpdate(selectedIncident.id, updateStatus, updateComment);
      } else {
        const response = await incidentsApi.updateIncidentStatus(
          selectedIncident.id,
          updateStatus,
          updateComment
        );
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to update incident');
        }
        
        // Update the incident in the local list
        if (response.incident) {
          const updatedIncident: Incident = {
            ...selectedIncident,
            ...(response.incident as Partial<Incident>),
            id: selectedIncident.id,
            status: response.incident.status || updateStatus,
            time: formatTime(response.incident.time || new Date().toISOString()),
            polling_unit: response.incident.polling_unit ?? selectedIncident.polling_unit,
          };

          setIncidents(prev => 
            prev.map(i => 
              i.id === selectedIncident.id ? updatedIncident : i
            )
          );
        }
      }

      toast({
        title: "Success",
        description: `Incident marked as ${updateStatus}`,
      });

      setIsUpdateDialogOpen(false);
      setUpdateComment('');
      setSelectedIncident(null);
      
      // Refresh the list
      await handleRefresh();
    } catch (error) {
      console.error('❌ Error updating incident:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update incident",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get action button configuration
  const getActionButton = useCallback((incident: Incident) => {
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
  }, []);

  // Helper functions
  const getPollingUnitName = useCallback((incident: Incident): string => {
    return incident.pollingUnitName || 
           incident.pollingUnit || 
           incident.polling_unit || 
           'Unknown';
  }, []);

  const getReporterName = useCallback((incident: Incident): string => {
    return incident.reporterName || 
           incident.reporter || 
           incident.reported_by || 
           'Unknown';
  }, []);

  const formatTime = useCallback((time: string) => {
    if (!time) return 'Unknown';
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return time;
      return date.toLocaleString();
    } catch {
      return time;
    }
  }, []);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = 
        incident.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPollingUnitName(incident).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getReporterName(incident).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = filterSeverity === 'all' || 
        incident.severity?.toLowerCase() === filterSeverity.toLowerCase();
      
      const matchesStatus = filterStatus === 'all' || 
        incident.status?.toLowerCase() === filterStatus.toLowerCase();
      
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, searchTerm, filterSeverity, filterStatus, getPollingUnitName, getReporterName]);

  // Statistics
  const stats = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter(i => i.status?.toLowerCase() === 'pending').length,
    investigating: incidents.filter(i => i.status?.toLowerCase() === 'investigating').length,
    resolved: incidents.filter(i => i.status?.toLowerCase() === 'resolved').length,
    critical: incidents.filter(i => i.severity?.toLowerCase() === 'critical').length,
  }), [incidents]);

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterSeverity('all');
    setFilterStatus('all');
    setShowFilters(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {loading ? 'Loading incidents...' : 
               incidents.length === 0 ? description : 
               `${filteredIncidents.length} of ${incidents.length} incidents`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents by type, polling unit, or reporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
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
              
              {(filterSeverity !== 'all' || filterStatus !== 'all' || searchTerm) && (
                <div className="sm:col-span-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="h-3 w-3 mr-1" /> Total: {stats.total}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-yellow-50">
              <AlertTriangle className="h-3 w-3 mr-1" /> Pending: {stats.pending}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-blue-50">
              <AlertTriangle className="h-3 w-3 mr-1" /> Investigating: {stats.investigating}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" /> Resolved: {stats.resolved}
            </Badge>
            {stats.critical > 0 && (
              <Badge variant="outline" className="px-3 py-1 bg-red-50 border-red-200 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" /> Critical: {stats.critical}
              </Badge>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
            <p>Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
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
                      <TableCell>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </TableCell>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">{selectedIncident.type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Severity</Label>
                    <Badge className={getSeverityColor(selectedIncident.severity)}>
                      {selectedIncident.severity}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={getStatusColor(selectedIncident.status)}>
                      {selectedIncident.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reported By</Label>
                    <p className="font-medium">{getReporterName(selectedIncident)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Polling Unit</Label>
                  <p className="font-medium">{getPollingUnitName(selectedIncident)}</p>
                </div>

                {selectedIncident.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                      {selectedIncident.description}
                    </p>
                  </div>
                )}

                {selectedIncident.reviewComment && (
                  <div>
                    <Label className="text-muted-foreground">Review Comment</Label>
                    <p className="text-sm mt-1 p-3 bg-blue-50 rounded-lg whitespace-pre-wrap">
                      {selectedIncident.reviewComment}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Reported Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(selectedIncident.time)}
                  </p>
                </div>

                {Array.isArray(selectedIncident.images) && selectedIncident.images.length > 0 && (
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
              <p className="text-xs text-muted-foreground">
                {updateStatus === 'Investigating' 
                  ? 'This comment will be visible to other admins.' 
                  : 'This comment will be visible to other admins.'}
              </p>
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
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
    </Card>
  );
}