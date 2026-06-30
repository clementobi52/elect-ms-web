// components/admin/shared/IncidentDialogs.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Incident } from './IncidentsTable';

interface IncidentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident | null;
  canUpdate?: boolean;
  onStartInvestigation?: (incident: Incident) => void;
  onResolve?: (incident: Incident) => void;
  getSeverityBadge: (severity: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function IncidentViewDialog({
  open,
  onOpenChange,
  incident,
  canUpdate = false,
  onStartInvestigation,
  onResolve,
  getSeverityBadge,
  getStatusBadge,
}: IncidentViewDialogProps) {
  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Incident Details
          </DialogTitle>
          <DialogDescription>
            Reported from {incident.pollingUnitName}
            {incident.wardName && ` in ${incident.wardName}`}
            {incident.zoneName && `, ${incident.zoneName}`}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">{incident.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Severity</Label>
                <div>{getSeverityBadge(incident.severity)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div>{getStatusBadge(incident.status)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reported By</Label>
                <p className="font-medium">{incident.reporterName}</p>
              </div>
            </div>

            {incident.description && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                  {incident.description}
                </p>
              </div>
            )}

            {incident.images && incident.images.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Media Evidence</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {incident.images.map((image, index) => (
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

            {incident.reviewComment && (
              <div>
                <Label className="text-muted-foreground">Review Comment</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                  {incident.reviewComment}
                </p>
              </div>
            )}

            {incident.latitude && incident.longitude && (
              <div>
                <Label className="text-muted-foreground">Location</Label>
                <p className="text-sm">
                  Lat: {incident.latitude.toFixed(6)}, Long: {incident.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {canUpdate && incident.status?.toLowerCase() !== 'resolved' && (
            <Button 
              variant="default"
              onClick={() => {
                onOpenChange(false);
                if (incident.status?.toLowerCase() === 'pending' && onStartInvestigation) {
                  onStartInvestigation(incident);
                } else if (onResolve) {
                  onResolve(incident);
                }
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {incident.status?.toLowerCase() === 'pending' ? 'Start Investigation' : 'Resolve Incident'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface IncidentUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident | null;
  action: 'investigate' | 'resolve';
  comment: string;
  onCommentChange: (comment: string) => void;
  onConfirm: () => void;
}

export function IncidentUpdateDialog({
  open,
  onOpenChange,
  incident,
  action,
  comment,
  onCommentChange,
  onConfirm,
}: IncidentUpdateDialogProps) {
  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'investigate' ? 'Start Investigation' : 'Resolve Incident'}
          </DialogTitle>
          <DialogDescription>
            {incident.type} at {incident.pollingUnitName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comment">Review Comment</Label>
            <Textarea
              id="comment"
              placeholder="Add details about your investigation or resolution..."
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className={action === 'resolve' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {action === 'investigate' ? (
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
  );
}