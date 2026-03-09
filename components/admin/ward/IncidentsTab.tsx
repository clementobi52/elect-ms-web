"use client";

import React, { useState } from 'react';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Eye, Filter } from 'lucide-react';
import { Incident } from '@/lib/types/ward-admin';

interface IncidentsTabProps {
  incidents: Incident[];
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
}

export function IncidentsTab({ incidents, getSeverityColor, getStatusColor }: IncidentsTabProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);

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
            No incidents reported
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.type}</TableCell>
                  <TableCell>{incident.pollingUnit}</TableCell>
                  <TableCell>{incident.reporter}</TableCell>
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
                  <TableCell className="text-muted-foreground">{incident.time}</TableCell>
                  <TableCell>
                    <Dialog 
                      open={isIncidentDialogOpen && selectedIncident?.id === incident.id} 
                      onOpenChange={(open) => {
                        setIsIncidentDialogOpen(open);
                        if (open) setSelectedIncident(incident);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Incident Details</DialogTitle>
                          <DialogDescription>
                            Reported from {incident.pollingUnit}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Type</Label>
                              <p className="font-medium">{incident.type}</p>
                            </div>
                            <div>
                              <Label>Severity</Label>
                              <Badge className={getSeverityColor(incident.severity)}>
                                {incident.severity}
                              </Badge>
                            </div>
                          </div>
                          {incident.description && (
                            <div>
                              <Label>Description</Label>
                              <p className="text-sm mt-1">{incident.description}</p>
                            </div>
                          )}
                          <div>
                            <Label>Reported By</Label>
                            <p className="font-medium">{incident.reporter}</p>
                          </div>
                          <div>
                            <Label>Time</Label>
                            <p className="text-sm text-muted-foreground">{incident.time}</p>
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Badge className={getStatusColor(incident.status)}>
                              {incident.status}
                            </Badge>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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