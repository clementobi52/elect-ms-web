// hooks/useIncidents.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { incidentsApi, Incident } from '@/lib/api/incidents';

// Demo data for fallback when backend is unavailable
const DEMO_INCIDENTS: Incident[] = [
  {
    id: '1',
    type: 'Violence',
    description: 'Physical altercation between voters at polling unit',
    pollingUnitName: 'Polling Unit 1',
    wardName: 'Ward 1',
    zoneName: 'Zone A',
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
    wardName: 'Ward 1',
    zoneName: 'Zone A',
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
    wardName: 'Ward 2',
    zoneName: 'Zone B',
    reporterName: 'Mike Johnson',
    severity: 'Critical',
    status: 'Pending',
    time: '1 day ago'
  },
  {
    id: '4',
    type: 'Malfunction',
    description: 'Voting machine malfunction at polling station',
    pollingUnitName: 'Polling Unit 4',
    wardName: 'Ward 2',
    zoneName: 'Zone B',
    reporterName: 'Sarah Brown',
    severity: 'Medium',
    status: 'Resolved',
    time: '2 days ago'
  }
];

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
  const [usingDemoData, setUsingDemoData] = useState(false);

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
      setUsingDemoData(false);

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
        // Fallback to demo data
        setIncidents(DEMO_INCIDENTS);
        setUsingDemoData(true);
        setLoading(false);
        return;
      }

      if (response && response.success) {
        // Format the incidents with proper time strings
        const processedIncidents = (response.incidents || []).map((incident: any) => ({
          ...incident,
          time: incident.time || formatTimeAgo(incident.createdAt || incident.timestamp)
        }));
        
        setIncidents(processedIncidents);
        setUsingDemoData(false);
        setError(null);
        
        if (showToastMessage) {
          toast({
            title: "Success",
            description: `Loaded ${processedIncidents.length} incidents`,
          });
        }
      } else {
        // Fallback to demo data
        setIncidents(DEMO_INCIDENTS);
        setUsingDemoData(true);
        if (showToastMessage) {
          toast({
            title: "Demo Mode",
            description: "Showing sample incident data",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setIncidents(DEMO_INCIDENTS);
      setUsingDemoData(true);
      setError('Failed to load incidents');
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample incident data",
          variant: "default",
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
    usingDemoData,
    refreshIncidents: (showToast = false) => fetchIncidents(showToast),
    updateIncident,
    formatTimeAgo,
  };
}