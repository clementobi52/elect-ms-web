// lib/api/pollingUnits.ts
import { apiClient } from './client';

export interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  agentId?: string;
  agentName?: string;
  agentStatus: 'Online' | 'Offline' | 'Unassigned';
  resultStatus: 'Submitted' | 'Pending' | 'Not Submitted' | 'Verified' | 'Rejected';
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PollingUnitsResponse {
  success: boolean;
  pollingUnits: PollingUnit[];
  error?: string;
  message?: string;
}

export interface PollingUnitStats {
  total: number;
  withAgents: number;
  withoutAgents: number;
  withResults: number;
  withoutResults: number;
  verifiedResults: number;
  pendingResults: number;
  rejectedResults: number;
}

export const pollingUnitsApi = {
  /**
   * Get polling units based on user role
   */
  getPollingUnits: async (role?: string, wardId?: string, zoneId?: string): Promise<PollingUnitsResponse> => {
    try {
      let url = '/admin/polling-units';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/polling-units`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/polling-units`;
      }
      
      console.log('📡 Fetching polling units from:', url);
      const response = await apiClient.get<any>(url);
      console.log('📡 Raw response:', response);
      
      let pollingUnitsData: PollingUnit[] = [];
      
      if (Array.isArray(response)) {
        pollingUnitsData = response;
      } else if (response && response.pollingUnits && Array.isArray(response.pollingUnits)) {
        pollingUnitsData = response.pollingUnits;
      } else if (response && response.data && response.data.pollingUnits && Array.isArray(response.data.pollingUnits)) {
        pollingUnitsData = response.data.pollingUnits;
      } else if (response && response.data && Array.isArray(response.data)) {
        pollingUnitsData = response.data;
      }
      
      return {
        success: true,
        pollingUnits: pollingUnitsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching polling units:', error);
      throw error;
    }
  },

  /**
   * Get all polling units (for system admin and situation room)
   */
  getAllPollingUnits: async (): Promise<PollingUnitsResponse> => {
    try {
      const response = await apiClient.get<any>('/admin/polling-units');
      
      let pollingUnitsData: PollingUnit[] = [];
      
      if (Array.isArray(response)) {
        pollingUnitsData = response;
      } else if (response && response.pollingUnits && Array.isArray(response.pollingUnits)) {
        pollingUnitsData = response.pollingUnits;
      } else if (response && response.data && response.data.pollingUnits && Array.isArray(response.data.pollingUnits)) {
        pollingUnitsData = response.data.pollingUnits;
      } else if (response && response.data && Array.isArray(response.data)) {
        pollingUnitsData = response.data;
      }
      
      return {
        success: true,
        pollingUnits: pollingUnitsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching all polling units:', error);
      throw error;
    }
  },

  /**
   * Get a single polling unit by ID with full details
   */
  getPollingUnitById: async (pollingUnitId: string): Promise<{ success: boolean; pollingUnit: PollingUnit }> => {
    try {
      const response = await apiClient.get<any>(`/admin/polling-units/${pollingUnitId}`);
      
      let pollingUnit = null;
      if (response && response.pollingUnit) {
        pollingUnit = response.pollingUnit;
      } else if (response && response.data && response.data.pollingUnit) {
        pollingUnit = response.data.pollingUnit;
      } else if (response && response.data) {
        pollingUnit = response.data;
      } else {
        pollingUnit = response;
      }
      
      return {
        success: true,
        pollingUnit: pollingUnit
      };
    } catch (error) {
      console.error('❌ Error fetching polling unit:', error);
      throw error;
    }
  },

  /**
   * Get polling units by ward
   */
  getPollingUnitsByWard: async (wardId: string): Promise<PollingUnitsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/ward/${wardId}/polling-units`);
      
      let pollingUnitsData: PollingUnit[] = [];
      if (Array.isArray(response)) {
        pollingUnitsData = response;
      } else if (response && response.pollingUnits && Array.isArray(response.pollingUnits)) {
        pollingUnitsData = response.pollingUnits;
      } else if (response && response.data && Array.isArray(response.data)) {
        pollingUnitsData = response.data;
      }
      
      return {
        success: true,
        pollingUnits: pollingUnitsData
      };
    } catch (error) {
      console.error('❌ Error fetching ward polling units:', error);
      throw error;
    }
  },

  /**
   * Get polling units by zone
   */
  getPollingUnitsByZone: async (zoneId: string): Promise<PollingUnitsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/zone/${zoneId}/polling-units`);
      
      let pollingUnitsData: PollingUnit[] = [];
      if (Array.isArray(response)) {
        pollingUnitsData = response;
      } else if (response && response.pollingUnits && Array.isArray(response.pollingUnits)) {
        pollingUnitsData = response.pollingUnits;
      } else if (response && response.data && Array.isArray(response.data)) {
        pollingUnitsData = response.data;
      }
      
      return {
        success: true,
        pollingUnits: pollingUnitsData
      };
    } catch (error) {
      console.error('❌ Error fetching zone polling units:', error);
      throw error;
    }
  },

  /**
   * Get polling unit statistics
   */
  getPollingUnitStats: async (wardId?: string, zoneId?: string): Promise<{ success: boolean; stats: PollingUnitStats }> => {
    try {
      let url = '/admin/polling-units/stats';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/polling-units/stats`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/polling-units/stats`;
      }
      
      const response = await apiClient.get<any>(url);
      
      let stats: PollingUnitStats = response?.stats || response?.data || response;
      
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error fetching polling unit stats:', error);
      throw error;
    }
  },

  /**
   * Create a new polling unit
   */
  createPollingUnit: async (data: {
    name: string;
    code?: string;
    wardId: string;
    registeredVoters?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
  }): Promise<{ success: boolean; message: string; pollingUnit: PollingUnit }> => {
    try {
      const response = await apiClient.post<any>('/admin/polling-units', data);
      
      let pollingUnit = null;
      if (response && response.pollingUnit) {
        pollingUnit = response.pollingUnit;
      } else if (response && response.data && response.data.pollingUnit) {
        pollingUnit = response.data.pollingUnit;
      } else if (response && response.data) {
        pollingUnit = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Polling unit created successfully',
        pollingUnit: pollingUnit
      };
    } catch (error) {
      console.error('❌ Error creating polling unit:', error);
      throw error;
    }
  },

  /**
   * Update a polling unit
   */
  updatePollingUnit: async (
    pollingUnitId: string,
    data: {
      name?: string;
      code?: string;
      wardId?: string;
      registeredVoters?: number;
      latitude?: number;
      longitude?: number;
      address?: string;
    }
  ): Promise<{ success: boolean; message: string; pollingUnit: PollingUnit }> => {
    try {
      const response: any = await apiClient.put<any>(`/admin/polling-units/${pollingUnitId}`, data);
      
      let pollingUnit = null;
      if (response && response.pollingUnit) {
        pollingUnit = response.pollingUnit;
      } else if (response && response.data && response.data.pollingUnit) {
        pollingUnit = response.data.pollingUnit;
      } else if (response && response.data) {
        pollingUnit = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Polling unit updated successfully',
        pollingUnit: pollingUnit
      };
    } catch (error) {
      console.error('❌ Error updating polling unit:', error);
      throw error;
    }
  },

  /**
   * Delete a polling unit (system admin only)
   */
  deletePollingUnit: async (pollingUnitId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.delete<any>(`/admin/polling-units/${pollingUnitId}`);
      
      return {
        success: true,
        message: response?.message || 'Polling unit deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting polling unit:', error);
      throw error;
    }
  },

  /**
   * Assign agent to polling unit
   */
  assignAgent: async (
    pollingUnitId: string,
    agentId: string
  ): Promise<{ success: boolean; message: string; pollingUnit: PollingUnit }> => {
    try {
      const response = await apiClient.patch<any>(`/admin/polling-units/${pollingUnitId}/assign-agent`, {
        agentId
      });
      
      let pollingUnit = null;
      if (response && response.pollingUnit) {
        pollingUnit = response.pollingUnit;
      } else if (response && response.data && response.data.pollingUnit) {
        pollingUnit = response.data.pollingUnit;
      } else if (response && response.data) {
        pollingUnit = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Agent assigned successfully',
        pollingUnit: pollingUnit
      };
    } catch (error) {
      console.error('❌ Error assigning agent:', error);
      throw error;
    }
  },

  /**
   * Get polling units with pagination
   */
  getPollingUnitsPaginated: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      wardId?: string;
      zoneId?: string;
      hasAgent?: boolean;
      hasResults?: boolean;
      search?: string;
    }
  ): Promise<{
    success: boolean;
    pollingUnits: PollingUnit[];
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
        ...(filters?.wardId && { wardId: filters.wardId }),
        ...(filters?.zoneId && { zoneId: filters.zoneId }),
        ...(filters?.hasAgent !== undefined && { hasAgent: filters.hasAgent.toString() }),
        ...(filters?.hasResults !== undefined && { hasResults: filters.hasResults.toString() }),
        ...(filters?.search && { search: filters.search })
      });

      const response = await apiClient.get<any>(`/admin/polling-units/paginated?${params.toString()}`);
      
      let pollingUnitsData: PollingUnit[] = [];
      let pagination = { total: 0, page: 1, limit: 20, totalPages: 0 };
      
      if (response && response.pollingUnits && Array.isArray(response.pollingUnits)) {
        pollingUnitsData = response.pollingUnits;
        pagination = response.pagination || pagination;
      } else if (response && response.data && response.data.pollingUnits && Array.isArray(response.data.pollingUnits)) {
        pollingUnitsData = response.data.pollingUnits;
        pagination = response.data.pagination || pagination;
      } else if (Array.isArray(response)) {
        pollingUnitsData = response;
        pagination = { total: response.length, page: 1, limit: response.length, totalPages: 1 };
      }
      
      return {
        success: true,
        pollingUnits: pollingUnitsData,
        pagination: pagination
      };
    } catch (error) {
      console.error('❌ Error fetching paginated polling units:', error);
      throw error;
    }
  }
};

// Export a hook for easy use
export const usePollingUnitsApi = () => {
  return {
    getPollingUnits: pollingUnitsApi.getPollingUnits,
    getAllPollingUnits: pollingUnitsApi.getAllPollingUnits,
    getPollingUnitById: pollingUnitsApi.getPollingUnitById,
    getPollingUnitsByWard: pollingUnitsApi.getPollingUnitsByWard,
    getPollingUnitsByZone: pollingUnitsApi.getPollingUnitsByZone,
    getPollingUnitStats: pollingUnitsApi.getPollingUnitStats,
    createPollingUnit: pollingUnitsApi.createPollingUnit,
    updatePollingUnit: pollingUnitsApi.updatePollingUnit,
    deletePollingUnit: pollingUnitsApi.deletePollingUnit,
    assignAgent: pollingUnitsApi.assignAgent,
    getPollingUnitsPaginated: pollingUnitsApi.getPollingUnitsPaginated,
  };
};