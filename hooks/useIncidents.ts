// hooks/useIncidents.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { incidentsApi, Incident } from '@/lib/api/incidents';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';

export function useIncidents(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
      return `${Math.floor(diffMins / 1440)} days ago`;
    } catch {
      return dateString;
    }
  };

  const fetchIncidents = useCallback(async (showToastMessage = false) => {
    if (!user) return;

    try {
      if (showToastMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let response;
      
      // Determine which API endpoint to use based on user role
      if (user.role === 'System Admin' || user.role === 'Situation Room Admin') {
        // These roles can see all incidents
        response = await incidentsApi.getAllIncidents();
      } else if (user.role === 'Zone Admin' && user.zoneId) {
        // Zone Admin sees incidents in their zone
        response = await incidentsApi.getIncidentsByZone(user.zoneId);
      } else if (user.role === 'Ward Admin' && user.wardId) {
        // Ward Admin sees incidents in their ward
        response = await incidentsApi.getIncidentsByWard(user.wardId);
      } else {
        setIncidents([]);
        setError('Incidents are not available for your role.');
        return;
      }

      if (response && response.success) {
        // Format the incidents with proper time strings
        const processedIncidents = (response.incidents || []).map((incident: any) => ({
          ...incident,
          time: incident.time || formatTimeAgo(incident.createdAt || incident.timestamp)
        }));
        
        setIncidents(processedIncidents);
        setError(null);
        
        if (showToastMessage) {
          toast({
            title: "Success",
            description: `Loaded ${processedIncidents.length} incidents`,
          });
        }
      } else {
        setIncidents([]);
        setError('Failed to load incidents');
        if (showToastMessage) {
          toast({
            title: "Error",
            description: "Failed to load incidents",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      const offline = isNetworkError(error);
      const message = offline ? SERVER_OFFLINE_MESSAGE : 'Failed to load incidents';
      setIncidents([]);
      setError(message);
      if (showToastMessage) {
        toast({
          title: offline ? 'Server Offline' : 'Error',
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  const updateIncident = useCallback(async (
    incidentId: string,
    status: 'Investigating' | 'Resolved',
    comment: string
  ) => {
    try {
      const response = await incidentsApi.updateIncidentStatus(incidentId, status, comment);

      if (response && response.success) {
        // Update local state
        setIncidents(prev => prev.map(inc => 
          inc.id === incidentId ? {
            ...inc,
            status: status,
            reviewComment: comment,
            time: formatTimeAgo(new Date().toISOString())
          } : inc
        ));

        toast({
          title: "Success",
          description: response.message || `Incident marked as ${status}`,
        });

        return true;
      } else {
        throw new Error('Failed to update incident');
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update incident",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchIncidents();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchIncidents(false);
      }, options.refreshInterval || 30000);
      
      return () => clearInterval(interval);
    }
  }, [fetchIncidents, options?.autoRefresh, options?.refreshInterval]);

  return {
    incidents,
    loading,
    refreshing,
    error,
    refreshIncidents: (showToast = false) => fetchIncidents(showToast),
    updateIncident,
    formatTimeAgo,
  };
}