"use client";

import React, { useState, useEffect } from 'react';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Eye, Filter, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Incident } from '@/lib/types/ward-admin';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';

interface IncidentsTabProps {
  incidents: Incident[];
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
  onIncidentUpdate?: (incidentId: string, status: string, comment: string) => Promise<void>;
}

export function IncidentsTab({ 
  incidents, 
  getSeverityColor, 
  getStatusColor,
  onIncidentUpdate 
}: IncidentsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'Investigating' | 'Resolved'>('Investigating');
  const [updateComment, setUpdateComment] = useState('');

  // Debug: Log incidents to see their structure
  useEffect(() => {
    if (incidents.length > 0) {
      console.log('Incidents data structure:', incidents[0]);
    }
  }, [incidents]);

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;

    try {
      if (onIncidentUpdate) {
        await onIncidentUpdate(selectedIncident.id, updateStatus, updateComment);
      } else {
        // Fallback to direct API call if no callback provided
        const token = localStorage.getItem('authToken');
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        
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
      }

      setIsUpdateDialogOpen(false);
      setUpdateComment('');
      setSelectedIncident(null);
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: "Error",
        description: "Failed to update incident",
        variant: "destructive",
      });
    }
  };

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

  // Helper function to get polling unit name from various possible property names
  const getPollingUnitName = (incident: Incident): string => {
    return incident.pollingUnitName || 
           incident.pollingUnit || 
           incident.polling_unit || 
           'Unknown';
  };

  // Helper function to get reporter name from various possible property names
  const getReporterName = (incident: Incident): string => {
    return incident.reporterName || 
           incident.reporter || 
           incident.reported_by || 
           'Unknown';
  };

  // Format the time to be more readable
  const formatTime = (time: string) => {
    if (!time) return 'Unknown';
    return time;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Incidents reported from polling units in your ward</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No incidents reported</p>
          </div>
        ) : (
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
              {incidents.map((incident) => {
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
                    <TableCell className="text-right space-x-2">
                      {/* View Button */}
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

                      {/* Action Button (Investigate/Resolve) */}
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                {/* Type and Severity */}
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

                {/* Status and Reporter */}
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

                {/* Polling Unit */}
                <div>
                  <Label className="text-muted-foreground">Polling Unit</Label>
                  <p className="font-medium">{getPollingUnitName(selectedIncident)}</p>
                </div>

                {/* Description */}
                {selectedIncident.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                      {selectedIncident.description}
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
    </Card>
  );
}