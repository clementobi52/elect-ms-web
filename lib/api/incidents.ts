// lib/api/incidents.ts

import { apiClient } from './client';

export interface Incident {
  ward: string | undefined;
  zone: string | undefined;
  id: string;
  type: string;
  description?: string;
  pollingUnitId?: string;
  pollingUnitName?: string;
  pollingUnit?: {
    id?: string;
    name?: string;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    wardId?: string;
  };
  polling_unit?: string | {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
  };
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  reporterId?: string;
  reporterName?: string;
  reporter?: {
    id?: string;
    name?: string;
    email?: string;
  };
  reported_by?: string;
  severity: string;
  status: string;
  time?: string;
  images?: string[];
  mediaUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewComment?: string;
  latitude?: number;
  longitude?: number;
  // Nested coordinate structures
  location?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
  };
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
}

export interface IncidentsResponse {
  success: boolean;
  incidents: Incident[];
  error?: string;
  message?: string;
  total?: number;
  withCoordinates?: number;
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

export interface MapIncidentsResponse {
  success: boolean;
  incidents: Incident[];
  total: number;
  withCoordinates: number;
  message?: string;
}

/**
 * Enhanced coordinate extraction with better type safety
 * This handles your data structure where latitude/longitude are directly on the incident
 */
export const extractCoordinates = (incident: any): { lat: number | null; lng: number | null } => {
  if (!incident) return { lat: null, lng: null };

  // 1. Check for direct latitude/longitude on the incident (YOUR DATA STRUCTURE)
  if (typeof incident.latitude === 'number' && typeof incident.longitude === 'number') {
    if (!isNaN(incident.latitude) && !isNaN(incident.longitude)) {
      return { lat: incident.latitude, lng: incident.longitude };
    }
  }

  // 2. Check for pollingUnit object (camelCase)
  if (incident.pollingUnit && typeof incident.pollingUnit === 'object') {
    const pu = incident.pollingUnit;
    
    if (typeof pu.latitude === 'number' && typeof pu.longitude === 'number') {
      if (!isNaN(pu.latitude) && !isNaN(pu.longitude)) {
        return { lat: pu.latitude, lng: pu.longitude };
      }
    }
    if (typeof pu.lat === 'number' && typeof pu.lng === 'number') {
      if (!isNaN(pu.lat) && !isNaN(pu.lng)) {
        return { lat: pu.lat, lng: pu.lng };
      }
    }
  }

  // 3. Check for polling_unit (snake_case)
  if (incident.polling_unit && typeof incident.polling_unit === 'object') {
    const pu = incident.polling_unit;
    
    if (typeof pu.latitude === 'number' && typeof pu.longitude === 'number') {
      if (!isNaN(pu.latitude) && !isNaN(pu.longitude)) {
        return { lat: pu.latitude, lng: pu.longitude };
      }
    }
    if (typeof pu.lat === 'number' && typeof pu.lng === 'number') {
      if (!isNaN(pu.lat) && !isNaN(pu.lng)) {
        return { lat: pu.lat, lng: pu.lng };
      }
    }
  }

  // 4. Check for location object
  if (incident.location && typeof incident.location === 'object') {
    const loc = incident.location;
    
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      if (!isNaN(loc.latitude) && !isNaN(loc.longitude)) {
        return { lat: loc.latitude, lng: loc.longitude };
      }
    }
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      if (!isNaN(loc.lat) && !isNaN(loc.lng)) {
        return { lat: loc.lat, lng: loc.lng };
      }
    }
  }

  // 5. Check for coordinates object
  if (incident.coordinates && typeof incident.coordinates === 'object') {
    const coords = incident.coordinates;
    
    if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      if (!isNaN(coords.latitude) && !isNaN(coords.longitude)) {
        return { lat: coords.latitude, lng: coords.longitude };
      }
    }
    if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      if (!isNaN(coords.lat) && !isNaN(coords.lng)) {
        return { lat: coords.lat, lng: coords.lng };
      }
    }
  }

  // 6. Check for geoJSON format
  if (incident.geometry && typeof incident.geometry === 'object') {
    const geom = incident.geometry;
    if (geom.type === 'Point' && geom.coordinates && Array.isArray(geom.coordinates)) {
      const [lng, lat] = geom.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  // 7. Try to parse string coordinates
  if (typeof incident.latitude === 'string' && typeof incident.longitude === 'string') {
    const lat = parseFloat(incident.latitude);
    const lng = parseFloat(incident.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  return { lat: null, lng: null };
};

/**
 * Check if an incident has valid coordinates
 */
export const hasValidCoordinates = (incident: Incident): boolean => {
  const { lat, lng } = extractCoordinates(incident);
  return lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
};

/**
 * Filter incidents to only those with valid coordinates
 */
export const filterIncidentsWithCoordinates = (incidents: Incident[]): Incident[] => {
  return incidents.filter(hasValidCoordinates);
};

/**
 * Enhanced incident response handler
 * This handles your specific data structure from Supabase
 */
const handleIncidentsResponse = (response: any): IncidentsResponse => {
  console.log('📡 Processing incidents response:', {
    hasData: !!response,
    type: typeof response,
    isArray: Array.isArray(response),
    keys: response ? Object.keys(response) : 'null'
  });

  let incidentsData: Incident[] = [];
  let total = 0;
  let withCoordinates = 0;

  // Case 1: Response has incidents array with success flag
  if (response && response.success && response.incidents && Array.isArray(response.incidents)) {
    incidentsData = response.incidents;
    total = response.total || response.incidents.length;
    withCoordinates = response.withCoordinates || 0;
  }
  // Case 2: Response is directly an array
  else if (Array.isArray(response)) {
    incidentsData = response;
    total = response.length;
  }
  // Case 3: Response has incidents array but no success flag
  else if (response && response.incidents && Array.isArray(response.incidents)) {
    incidentsData = response.incidents;
    total = response.total || response.incidents.length;
    withCoordinates = response.withCoordinates || 0;
  }
  // Case 4: Response has data property with incidents
  else if (response && response.data && response.data.incidents && Array.isArray(response.data.incidents)) {
    incidentsData = response.data.incidents;
    total = response.data.total || response.data.incidents.length;
    withCoordinates = response.data.withCoordinates || 0;
  }
  // Case 5: Response has data as array
  else if (response && response.data && Array.isArray(response.data)) {
    incidentsData = response.data;
    total = response.data.length;
  }
  // Case 6: Response has results array
  else if (response && response.results && Array.isArray(response.results)) {
    incidentsData = response.results;
    total = response.results.length;
  }
  // Case 7: Response has items array
  else if (response && response.items && Array.isArray(response.items)) {
    incidentsData = response.items;
    total = response.items.length;
  }

  // Log the structure of the first incident for debugging
  if (incidentsData.length > 0) {
    console.log('📊 First incident keys:', Object.keys(incidentsData[0]));
    console.log('📊 First incident sample:', {
      id: incidentsData[0].id,
      type: incidentsData[0].type,
      latitude: incidentsData[0].latitude,
      longitude: incidentsData[0].longitude,
      pollingUnitId: incidentsData[0].pollingUnitId
    });
  }

  // Extract coordinates for each incident if needed
  const processedIncidents = incidentsData.map(inc => {
    // If latitude/longitude already exist, use them
    if (typeof inc.latitude === 'number' && typeof inc.longitude === 'number') {
      return inc;
    }
    
    // Try to extract from pollingUnit
    const { lat, lng } = extractCoordinates(inc);
    if (lat !== null && lng !== null) {
      return { ...inc, latitude: lat, longitude: lng };
    }
    return inc;
  });

  // Count incidents with coordinates
  const withCoordsCount = processedIncidents.filter(hasValidCoordinates).length;
  console.log(`📍 Incidents with coordinates: ${withCoordsCount}/${processedIncidents.length}`);

  return {
    success: true,
    incidents: processedIncidents,
    total: total || processedIncidents.length,
    withCoordinates: withCoordinates || withCoordsCount,
    message: response?.message
  };
};

export const incidentsApi = {
  /**
   * Get incidents based on user role
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
      
      return handleIncidentsResponse(response);
    } catch (error: any) {
      console.error('❌ Error fetching incidents:', error);
      
      if (error?.response?.status === 401) {
        return {
          success: false,
          incidents: [],
          error: 'Authentication required. Please log in.',
          message: 'Unauthorized'
        };
      } else if (error?.response?.status === 403) {
        return {
          success: false,
          incidents: [],
          error: 'Access denied. You do not have permission to view incidents.',
          message: 'Forbidden'
        };
      }
      
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
      return handleIncidentsResponse(response);
    } catch (error: any) {
      console.error('❌ Error fetching all incidents:', error);
      
      if (error?.response?.status === 401) {
        return {
          success: false,
          incidents: [],
          error: 'Authentication required. Please log in.',
          message: 'Unauthorized'
        };
      } else if (error?.response?.status === 403) {
        return {
          success: false,
          incidents: [],
          error: 'Access denied. You do not have permission to view incidents.',
          message: 'Forbidden'
        };
      }
      
      throw error;
    }
  },

  /**
   * Get incidents with coordinates for the map
   * Uses the situation room endpoint which returns incidents with coordinates
   * Route: /api/situation-room/incidents/map
   */
  getIncidentsForMap: async (): Promise<IncidentsResponse> => {
    try {
      console.log('📍 Calling /situation-room/incidents/map...');
      const response = await apiClient.get<any>('/situation-room/incidents/map');
      console.log('📡 Map incidents response received');
      console.log('📡 Response structure:', {
        success: response?.success,
        hasIncidents: !!response?.incidents,
        incidentCount: response?.incidents?.length || 0,
        total: response?.total,
        withCoordinates: response?.withCoordinates
      });
      
      // Log first incident if available
      if (response?.incidents?.length > 0) {
        console.log('📊 First incident:', {
          id: response.incidents[0].id,
          type: response.incidents[0].type,
          latitude: response.incidents[0].latitude,
          longitude: response.incidents[0].longitude
        });
      }
      
      const result = handleIncidentsResponse(response);
      
      // Log coordinate statistics
      const withCoords = result.incidents.filter(hasValidCoordinates).length;
      console.log(`📍 ${withCoords}/${result.incidents.length} incidents have valid coordinates`);
      
      if (withCoords === 0 && result.incidents.length > 0) {
        console.warn('⚠️ No incidents have valid coordinates. Check the data structure.');
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Error fetching map incidents:', error);
      
      if (error?.response?.status === 401) {
        return {
          success: false,
          incidents: [],
          error: 'Authentication required. Please log in.',
          message: 'Unauthorized'
        };
      } else if (error?.response?.status === 403) {
        return {
          success: false,
          incidents: [],
          error: 'Access denied. You do not have permission to view incidents.',
          message: 'Forbidden'
        };
      } else if (error?.response?.status === 404) {
        return {
          success: false,
          incidents: [],
          error: 'Endpoint not found. Please check your API configuration.',
          message: 'Not Found'
        };
      }
      
      throw error;
    }
  },

  /**
   * Get incidents for a specific ward with coordinates
   * Route: /api/situation-room/wards/:wardId/incidents
   */
  getWardIncidents: async (wardId: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/situation-room/wards/${wardId}/incidents`);
      console.log(`📡 Ward incidents for ${wardId}:`, response);
      return handleIncidentsResponse(response);
    } catch (error: any) {
      console.error('❌ Error fetching ward incidents:', error);
      
      if (error?.response?.status === 401) {
        return {
          success: false,
          incidents: [],
          error: 'Authentication required. Please log in.',
          message: 'Unauthorized'
        };
      } else if (error?.response?.status === 403) {
        return {
          success: false,
          incidents: [],
          error: 'Access denied. You do not have permission to view incidents.',
          message: 'Forbidden'
        };
      }
      
      throw error;
    }
  },

  /**
   * Get incidents for a specific zone with coordinates
   * Route: /api/situation-room/zones/:zoneId/incidents
   */
  getZoneIncidents: async (zoneId: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/situation-room/zones/${zoneId}/incidents`);
      console.log(`📡 Zone incidents for ${zoneId}:`, response);
      return handleIncidentsResponse(response);
    } catch (error: any) {
      console.error('❌ Error fetching zone incidents:', error);
      
      if (error?.response?.status === 401) {
        return {
          success: false,
          incidents: [],
          error: 'Authentication required. Please log in.',
          message: 'Unauthorized'
        };
      } else if (error?.response?.status === 403) {
        return {
          success: false,
          incidents: [],
          error: 'Access denied. You do not have permission to view incidents.',
          message: 'Forbidden'
        };
      }
      
      throw error;
    }
  },

  /**
   * Get a single incident by ID
   */
  getIncidentById: async (incidentId: string): Promise<{ success: boolean; incident: Incident }> => {
    try {
      const response = await apiClient.get<any>(`/admin/incidents/${incidentId}`);
      
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
      
      // Ensure coordinates are extracted
      if (incident) {
        const { lat, lng } = extractCoordinates(incident);
        if (lat !== null && lng !== null) {
          incident.latitude = lat;
          incident.longitude = lng;
        }
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
   * Get incidents by ward (legacy endpoint)
   */
  getIncidentsByWard: async (wardId: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/ward/${wardId}/incidents`);
      return handleIncidentsResponse(response);
    } catch (error) {
      console.error('❌ Error fetching ward incidents:', error);
      throw error;
    }
  },

  /**
   * Get incidents by zone (legacy endpoint)
   */
  getIncidentsByZone: async (zoneId: string): Promise<IncidentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/zone/${zoneId}/incidents`);
      return handleIncidentsResponse(response);
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
      return handleIncidentsResponse(response);
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
      return handleIncidentsResponse(response);
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
    getIncidentsForMap: incidentsApi.getIncidentsForMap,
    getWardIncidents: incidentsApi.getWardIncidents,
    getZoneIncidents: incidentsApi.getZoneIncidents,
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
    extractCoordinates: extractCoordinates,
    hasValidCoordinates: hasValidCoordinates,
    filterIncidentsWithCoordinates: filterIncidentsWithCoordinates,
  };
};