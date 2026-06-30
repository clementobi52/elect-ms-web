"use client";

import { useState } from 'react';
import { useIncidents } from '@/hooks/useIncidents';
import { IncidentsTable } from '@/components/admin/shared/IncidentsTable';
import { IncidentViewDialog, IncidentUpdateDialog } from '@/components/admin/shared/IncidentDialogs';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/badge';
import { Incident } from '@/components/admin/shared/IncidentsTable';

export default function SystemIncidentsPage() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateAction, setUpdateAction] = useState<'investigate' | 'resolve'>('investigate');
  const [updateComment, setUpdateComment] = useState('');

  const { 
    incidents, 
    loading, 
    refreshing, 
    usingDemoData, 
    error, 
    refreshIncidents, 
    updateIncident 
  } = useIncidents({
    autoRefresh: false
  });

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

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleUpdateIncident = (incident: Incident, action: 'investigate' | 'resolve') => {
    setSelectedIncident(incident);
    setUpdateAction(action);
    setUpdateComment('');
    setIsUpdateDialogOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!selectedIncident) return;
    
    const newStatus = updateAction === 'investigate' ? 'Investigating' : 'Resolved';
    const success = await updateIncident(selectedIncident.id, newStatus, updateComment);
    
    if (success) {
      setIsUpdateDialogOpen(false);
      setUpdateComment('');
      setSelectedIncident(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Incident Management" 
        subtitle="System Admin View - All Incidents"
      />
      <div className="flex-1 p-6">
        {error && !usingDemoData && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <IncidentsTable 
          incidents={incidents}
          loading={loading}
          onRefresh={() => refreshIncidents(true)}
          onView={handleViewIncident}
          onUpdate={handleUpdateIncident}
          showWard={true}
          showZone={true}
          canUpdate={true}
          role="system"
          description={usingDemoData ? "Using demo data - Backend connection not available" : undefined}
          getSeverityBadge={getSeverityBadge}
          getStatusBadge={getStatusBadge}
        />

        <IncidentViewDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          incident={selectedIncident}
          canUpdate={true}
          onStartInvestigation={(inc) => handleUpdateIncident(inc, 'investigate')}
          onResolve={(inc) => handleUpdateIncident(inc, 'resolve')}
          getSeverityBadge={getSeverityBadge}
          getStatusBadge={getStatusBadge}
        />

        <IncidentUpdateDialog
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          incident={selectedIncident}
          action={updateAction}
          comment={updateComment}
          onCommentChange={setUpdateComment}
          onConfirm={handleConfirmUpdate}
        />
      </div>
    </div>
  );
}