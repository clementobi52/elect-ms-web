// lib/api/incidents.ts
import { apiClient } from './client';

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

export interface IncidentsResponse {
  success: boolean;
  incidents: Incident[];
  error?: string;
  message?: string;
}

export interface UpdateIncidentResponse {
  success: boolean;
  message: string;
  incident: Incident;
}

export interface IncidentStats {
  total: number;
  pending: number;
  investigating: number;
  resolved: number;
  critical: number;
  warning: number;
  info: number;
}

export const incidentsApi = {
  /**
   * Get incidents based on user role
   * - System Admin: All incidents
   * - Situation Room: All incidents (or filtered by zone if assigned)
   * - Zone Admin: Incidents in their zone
   * - Ward Admin: Incidents in their ward
   */
  getIncidents: async (role?: string, wardId?: string, zoneId?: string): Promise<IncidentsResponse> => {
    try {
      let url = '/admin/incidents';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/incidents`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/incidents`;
      }
      
      console.log('📡 Fetching incidents from:', url);
      const response = await apiClient.get<any>(url);
      console.log('📡 Raw response type:', Array.isArray(response) ? 'Array' : typeof response);
      console.log('📡 Raw response:', response);
      
      // Handle different response structures
      let incidentsData: Incident[] = [];
      
      // Case 1: Response is directly an array (your backend returns this)
      if (Array.isArray(response)) {
        incidentsData = response;
      }
      // Case 2: Response has incidents array
      else if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
      }
      // Case 3: Response has data property with incidents
      else if (response && response.data && response.data.incidents && Array.isArray(response.data.incidents)) {
        incidentsData = response.data.incidents;
      }
      // Case 4: Response has data as array
      else if (response && response.data && Array.isArray(response.data)) {
        incidentsData = response.data;
      }
      // Case 5: Response has results array
      else if (response && response.results && Array.isArray(response.results)) {
        incidentsData = response.results;
      }
      // Case 6: Response has items array
      else if (response && response.items && Array.isArray(response.items)) {
        incidentsData = response.items;
      }
      
      console.log('📊 Extracted incidents count:', incidentsData.length);
      
      return {
        success: true,
        incidents: incidentsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching incidents:', error);
      throw error;
    }
  },

  /**
   * Get all incidents (for system admin and situation room)
   */
  getAllIncidents: async (): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>('/admin/incidents');
      console.log('📡 Raw all incidents response:', response);
      
      let incidentsData: Incident[] = [];
      
      if (Array.isArray(response)) {
        incidentsData = response;
      } else if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
      } else if (response && response.data && response.data.incidents && Array.isArray(response.data.incidents)) {
        incidentsData = response.data.incidents;
      } else if (response && response.data && Array.isArray(response.data)) {
        incidentsData = response.data;
      } else if (response && response.results && Array.isArray(response.results)) {
        incidentsData = response.results;
      }
      
      return {
        success: true,
        incidents: incidentsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching all incidents:', error);
      throw error;
    }
  },

  /**
   * Get a single incident by ID
   */
  getIncidentById: async (incidentId: string): Promise<{ success: boolean; incident: Incident }> => {
    try {
      const response = await apiClient.get<any>(`/admin/incidents/${incidentId}`);
      
      // Handle different response structures
      let incident = null;
      if (response && response.incident) {
        incident = response.incident;
      } else if (response && response.data && response.data.incident) {
        incident = response.data.incident;
      } else if (response && response.data) {
        incident = response.data;
      } else {
        incident = response;
      }
      
      return {
        success: true,
        incident: incident
      };
    } catch (error) {
      console.error('❌ Error fetching incident:', error);
      throw error;
    }
  },

  /**
   * Update incident status
   */
  updateIncidentStatus: async (
    incidentId: string, 
    status: 'Investigating' | 'Resolved', 
    comment: string
  ): Promise<UpdateIncidentResponse> => {
    try {
      const response = await apiClient.patch<any>(`/admin/incidents/${incidentId}/status`, {
        status,
        reviewComment: comment
      });
      
      console.log('📡 Update response:', response);
      
      let incident = null;
      if (response && response.incident) {
        incident = response.incident;
      } else if (response && response.data && response.data.incident) {
        incident = response.data.incident;
      } else if (response && response.data) {
        incident = response.data;
      }
      
      return {
        success: response?.success !== undefined ? response.success : true,
        message: response?.message || 'Incident updated successfully',
        incident: incident
      };
    } catch (error) {
      console.error('❌ Error updating incident:', error);
      throw error;
    }
  },

  /**
   * Get incidents by ward (for ward admin)
   */
  getIncidentsByWard: async (wardId: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/ward/${wardId}/incidents`);
      
      let incidentsData: Incident[] = [];
      if (Array.isArray(response)) {
        incidentsData = response;
      } else if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
      } else if (response && response.data && Array.isArray(response.data)) {
        incidentsData = response.data;
      }
      
      return {
        success: true,
        incidents: incidentsData
      };
    } catch (error) {
      console.error('❌ Error fetching ward incidents:', error);
      throw error;
    }
  },

  /**
   * Get incidents by zone (for zone admin)
   */
  getIncidentsByZone: async (zoneId: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/zone/${zoneId}/incidents`);
      
      let incidentsData: Incident[] = [];
      if (Array.isArray(response)) {
        incidentsData = response;
      } else if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
      } else if (response && response.data && Array.isArray(response.data)) {
        incidentsData = response.data;
      }
      
      return {
        success: true,
        incidents: incidentsData
      };
    } catch (error) {
      console.error('❌ Error fetching zone incidents:', error);
      throw error;
    }
  },

  /**
   * Get incident statistics
   */
  getIncidentStats: async (wardId?: string, zoneId?: string): Promise<{ success: boolean; stats: IncidentStats }> => {
    try {
      let url = '/admin/incidents/stats';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/incidents/stats`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/incidents/stats`;
      }
      
      const response = await apiClient.get<any>(url);
      
      let stats: IncidentStats = response?.stats || response?.data || response;
      
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error fetching incident stats:', error);
      throw error;
    }
  },

  /**
   * Create a new incident
   */
  createIncident: async (data: {
    type: string;
    description: string;
    pollingUnitId: string;
    severity: string;
    images?: string[];
    latitude?: number;
    longitude?: number;
  }): Promise<{ success: boolean; incident: Incident }> => {
    try {
      const response = await apiClient.post<any>('/admin/incidents', data);
      
      let incident = null;
      if (response && response.incident) {
        incident = response.incident;
      } else if (response && response.data && response.data.incident) {
        incident = response.data.incident;
      } else if (response && response.data) {
        incident = response.data;
      } else {
        incident = response;
      }
      
      return {
        success: true,
        incident: incident
      };
    } catch (error) {
      console.error('❌ Error creating incident:', error);
      throw error;
    }
  },

  /**
   * Delete an incident (system admin only)
   */
  deleteIncident: async (incidentId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.delete<any>(`/admin/incidents/${incidentId}`);
      return {
        success: true,
        message: response?.message || 'Incident deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting incident:', error);
      throw error;
    }
  },

  /**
   * Bulk update incident status
   */
  bulkUpdateStatus: async (
    incidentIds: string[],
    status: 'Investigating' | 'Resolved',
    comment: string
  ): Promise<{ success: boolean; updated: number; failed: number; errors: string[] }> => {
    try {
      const response = await apiClient.patch<any>('/admin/incidents/bulk-status', {
        incidentIds,
        status,
        reviewComment: comment
      });
      
      return {
        success: true,
        updated: response?.updated || incidentIds.length,
        failed: response?.failed || 0,
        errors: response?.errors || []
      };
    } catch (error) {
      console.error('❌ Error bulk updating incidents:', error);
      throw error;
    }
  },

  /**
   * Get incidents by severity
   */
  getIncidentsBySeverity: async (severity: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/incidents?severity=${severity}`);
      
      let incidentsData: Incident[] = [];
      if (Array.isArray(response)) {
        incidentsData = response;
      } else if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
      } else if (response && response.data && Array.isArray(response.data)) {
        incidentsData = response.data;
      }
      
      return {
        success: true,
        incidents: incidentsData
      };
    } catch (error) {
      console.error('❌ Error fetching incidents by severity:', error);
      throw error;
    }
  },

  /**
   * Get incidents by status
   */
  getIncidentsByStatus: async (status: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/incidents?status=${status}`);
      
      let incidentsData: Incident[] = [];
      if (Array.isArray(response)) {
        incidentsData = response;
      } else if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
      } else if (response && response.data && Array.isArray(response.data)) {
        incidentsData = response.data;
      }
      
      return {
        success: true,
        incidents: incidentsData
      };
    } catch (error) {
      console.error('❌ Error fetching incidents by status:', error);
      throw error;
    }
  },

  /**
   * Get incidents with pagination
   */
  getIncidentsPaginated: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      severity?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    success: boolean;
    incidents: Incident[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate })
      });

      const response = await apiClient.get<any>(`/admin/incidents/paginated?${params.toString()}`);
      
      let incidentsData: Incident[] = [];
      let pagination = { total: 0, page: 1, limit: 20, totalPages: 0 };
      
      if (response && response.incidents && Array.isArray(response.incidents)) {
        incidentsData = response.incidents;
        pagination = response.pagination || pagination;
      } else if (response && response.data && response.data.incidents && Array.isArray(response.data.incidents)) {
        incidentsData = response.data.incidents;
        pagination = response.data.pagination || pagination;
      } else if (Array.isArray(response)) {
        incidentsData = response;
        pagination = { total: response.length, page: 1, limit: response.length, totalPages: 1 };
      }
      
      return {
        success: true,
        incidents: incidentsData,
        pagination: pagination
      };
    } catch (error) {
      console.error('❌ Error fetching paginated incidents:', error);
      throw error;
    }
  }
};

// Export a hook for easy use in React components
export const useIncidentsApi = () => {
  return {
    getIncidents: incidentsApi.getIncidents,
    getAllIncidents: incidentsApi.getAllIncidents,
    getIncidentById: incidentsApi.getIncidentById,
    updateIncidentStatus: incidentsApi.updateIncidentStatus,
    getIncidentsByWard: incidentsApi.getIncidentsByWard,
    getIncidentsByZone: incidentsApi.getIncidentsByZone,
    getIncidentStats: incidentsApi.getIncidentStats,
    createIncident: incidentsApi.createIncident,
    deleteIncident: incidentsApi.deleteIncident,
    bulkUpdateStatus: incidentsApi.bulkUpdateStatus,
    getIncidentsBySeverity: incidentsApi.getIncidentsBySeverity,
    getIncidentsByStatus: incidentsApi.getIncidentsByStatus,
    getIncidentsPaginated: incidentsApi.getIncidentsPaginated,
  };
};