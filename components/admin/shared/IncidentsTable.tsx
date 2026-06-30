// components/admin/shared/IncidentsTable.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search, 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Shield, 
  MapPin, 
  Building2, 
  Globe,
  Filter,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { incidentsApi } from '@/lib/api/incidents';

// Use the same Incident type as IncidentsTab
export interface Incident {
  id: string;
  type: string;
  description?: string;
  pollingUnitId?: string;
  pollingUnitName: string;
  pollingUnit?: string;
  polling_unit?: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  reporterId?: string;
  reporterName: string;
  reporter?: string;
  reported_by?: string;
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

interface IncidentsTableProps {
  incidents?: Incident[];
  loading?: boolean;
  onRefresh?: () => void;
  onView?: (incident: Incident) => void;
  onUpdate?: (incidentId: string, status: string, comment: string) => Promise<void>;
  showWard?: boolean;
  showZone?: boolean;
  canUpdate?: boolean;
  role: 'ward' | 'zone' | 'situation' | 'system';
  title?: string;
  description?: string;
  wardId?: string;
  zoneId?: string;
  getSeverityColor?: (severity: string) => string;
  getStatusColor?: (status: string) => string;
}

export function IncidentsTable({ 
  incidents: initialIncidents = [],
  loading: externalLoading = false,
  onRefresh: externalRefresh,
  onView,
  onUpdate,
  showWard = false, 
  showZone = false,
  canUpdate = false,
  role,
  title = "Incidents",
  description,
  wardId,
  zoneId,
  getSeverityColor,
  getStatusColor
}: IncidentsTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [loading, setLoading] = useState(externalLoading);
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

  // Default color functions if not provided
  const defaultGetSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-white',
      'low': 'bg-blue-500 text-white',
      'info': 'bg-gray-500 text-white'
    };
    return colors[severity?.toLowerCase()] || 'bg-gray-500 text-white';
  };

  const defaultGetStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500 text-white',
      'investigating': 'bg-blue-500 text-white',
      'resolved': 'bg-green-500 text-white',
      'rejected': 'bg-red-500 text-white',
      'verified': 'bg-green-500 text-white'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-500 text-white';
  };

  // Use provided functions or defaults
  const severityColorFn = getSeverityColor || defaultGetSeverityColor;
  const statusColorFn = getStatusColor || defaultGetStatusColor;

  // Load incidents if not provided
  useEffect(() => {
    if (initialIncidents.length === 0 && !externalLoading) {
      loadIncidents();
    }
  }, []);

  // Update incidents when initialIncidents changes
  useEffect(() => {
    if (initialIncidents.length > 0) {
      setIncidents(initialIncidents);
    }
  }, [initialIncidents]);

  // Update loading state
  useEffect(() => {
    setLoading(externalLoading);
  }, [externalLoading]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      let response;
      
      if (wardId) {
        response = await incidentsApi.getIncidentsByWard(wardId);
      } else if (zoneId) {
        response = await incidentsApi.getIncidentsByZone(zoneId);
      } else {
        response = await incidentsApi.getIncidents();
      }
      
      if (response.success && response.incidents) {
        setIncidents(response.incidents);
      } else {
        setIncidents([]);
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
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

  const handleRefresh = async () => {
    if (externalRefresh) {
      externalRefresh();
    } else {
      await loadIncidents();
    }
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = 
      incident.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPollingUnitName(incident).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getReporterName(incident).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (incident.wardName && incident.wardName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (incident.zoneName && incident.zoneName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSeverity = filterSeverity === 'all' || incident.severity?.toLowerCase() === filterSeverity.toLowerCase();
    const matchesStatus = filterStatus === 'all' || incident.status?.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Statistics
  const totalIncidents = incidents.length;
  const pendingCount = incidents.filter(i => i.status?.toLowerCase() === 'pending').length;
  const investigatingCount = incidents.filter(i => i.status?.toLowerCase() === 'investigating').length;
  const resolvedCount = incidents.filter(i => i.status?.toLowerCase() === 'resolved').length;
  const criticalCount = incidents.filter(i => i.severity?.toLowerCase() === 'critical').length;

  const getRoleBadge = () => {
    switch(role) {
      case 'system': return { bg: 'bg-purple-50', text: 'text-purple-700', icon: Shield };
      case 'situation': return { bg: 'bg-orange-50', text: 'text-orange-700', icon: Globe };
      case 'zone': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: MapPin };
      default: return { bg: 'bg-green-50', text: 'text-green-700', icon: Building2 };
    }
  };

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  // Helper functions
  const getPollingUnitName = (incident: Incident): string => {
    return incident.pollingUnitName || 
           incident.pollingUnit || 
           incident.polling_unit || 
           'Unknown';
  };

  const getReporterName = (incident: Incident): string => {
    return incident.reporterName || 
           incident.reporter || 
           incident.reported_by || 
           incident.reporterId || 
           'Unknown';
  };

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

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;

    setIsUpdating(true);

    try {
      if (onUpdate) {
        await onUpdate(selectedIncident.id, updateStatus, updateComment);
      } else {
        const response = await incidentsApi.updateIncidentStatus(
          selectedIncident.id,
          updateStatus,
          updateComment
        );
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to update incident');
        }
        
        if (response.incident) {
          setIncidents(prev => 
            prev.map(i => 
              i.id === selectedIncident.id 
                ? { ...response.incident, time: formatTime(response.incident.time || new Date().toISOString()) }
                : i
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
      
      await handleRefresh();
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update incident",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getActionButton = (incident: Incident) => {
    if (!canUpdate) return null;
    
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

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSeverity('all');
    setFilterStatus('all');
  };

  return (
    <div className="space-y-6">
      {/* Role-specific header */}
      <div className={`${roleBadge.bg} border rounded-lg p-4 flex items-center gap-3`}>
        <RoleIcon className={`h-5 w-5 ${roleBadge.text}`} />
        <div>
          <p className={`font-medium ${roleBadge.text}`}>
            {role === 'system' && 'System Admin View'}
            {role === 'situation' && 'Situation Room View'}
            {role === 'zone' && 'Zone Admin View'}
            {role === 'ward' && 'Ward Admin View'}
          </p>
          <p className="text-sm opacity-90">
            {description || `Viewing incidents ${role === 'ward' ? 'in your ward' : 
              role === 'zone' ? 'in your zone' : 
              role === 'situation' ? 'across all zones' : 
              'across all wards and zones'}`}
          </p>
        </div>
      </div>

      {/* Header with stats and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          
          {(filterSeverity !== 'all' || filterStatus !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="h-3 w-3 mr-1" /> Pending: {pendingCount}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-blue-50">
              <AlertTriangle className="h-3 w-3 mr-1" /> Investigating: {investigatingCount}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" /> Resolved: {resolvedCount}
            </Badge>
            {criticalCount > 0 && (
              <Badge variant="outline" className="px-3 py-1 bg-red-50 border-red-200 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" /> Critical: {criticalCount}
              </Badge>
            )}
          </div>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-muted p-4 rounded-lg flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
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
          
          <div className="flex-1 min-w-[150px]">
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
          
          <Button variant="default" size="sm" onClick={clearFilters}>
            Apply Filters
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {loading ? 'Loading incidents...' :
               totalIncidents === 0 ? 'No incidents found' : 
               `Showing ${filteredIncidents.length} of ${totalIncidents} incidents`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
              <p>Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No incidents found</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No incidents match your filters</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Polling Unit</TableHead>
                  {showWard && <TableHead>Ward</TableHead>}
                  {showZone && <TableHead>Zone</TableHead>}
                  <TableHead>Reported By</TableHead>
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
                      {showWard && <TableCell>{incident.wardName || 'Unknown'}</TableCell>}
                      {showZone && <TableCell>{incident.zoneName || 'Unknown'}</TableCell>}
                      <TableCell>{reporterName}</TableCell>
                      <TableCell>
                        <Badge className={severityColorFn(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColorFn(incident.status)}>
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTime(incident.time)}</TableCell>
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
          )}
        </CardContent>
      </Card>

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
                    <Badge className={severityColorFn(selectedIncident.severity)}>
                      {selectedIncident.severity}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={statusColorFn(selectedIncident.status)}>
                      {selectedIncident.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reported By</Label>
                    <p className="font-medium">{getReporterName(selectedIncident)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Polling Unit</Label>
                    <p className="font-medium">{getPollingUnitName(selectedIncident)}</p>
                  </div>
                  {showWard && (
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedIncident.wardName || 'Unknown'}</p>
                    </div>
                  )}
                  {showZone && (
                    <div>
                      <Label className="text-muted-foreground">Zone</Label>
                      <p className="font-medium">{selectedIncident.zoneName || 'Unknown'}</p>
                    </div>
                  )}
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
            {canUpdate && selectedIncident?.status?.toLowerCase() !== 'resolved' && (
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
    </div>
  );
}