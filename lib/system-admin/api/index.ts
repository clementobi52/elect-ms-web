// lib/system-admin/api.ts

import { Ward, Pagination } from '@/components/admin/system-admin/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper to handle responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }
  return response.json();
};

// ==================== MAIN DATA FETCHING ====================

export const fetchAllData = async (API_BASE_URL: string) => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  // Fetch all data in parallel
  const [zonesRes, usersRes, statsRes, pollingUnitsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/admin/system/zones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${API_BASE_URL}/admin/system/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${API_BASE_URL}/admin/system/system/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${API_BASE_URL}/admin/system/polling-units?limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);

  let zones = [];
  let wards = [];
  let pollingUnits = [];
  let users = [];
  let stats = {};
  let pollingUnitPagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

  if (zonesRes.ok) {
    const zonesData = await zonesRes.json();
    zones = zonesData.zones || zonesData.data || [];
    
    // Extract wards from zones
    const allWards: any[] = [];
    for (const zone of zones) {
      if (zone.wards) {
        allWards.push(...zone.wards);
      }
    }
    wards = allWards;
  }

  if (pollingUnitsRes.ok) {
    const puData = await pollingUnitsRes.json();
    pollingUnits = puData.data || [];
    pollingUnitPagination = puData.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  }

  if (usersRes.ok) {
    const usersData = await usersRes.json();
    users = usersData.users || usersData.data || [];
  }

  if (statsRes.ok) {
    const statsData = await statsRes.json();
    stats = statsData.stats || statsData;
  }

  return { zones, wards, pollingUnits, users, stats, pollingUnitPagination };
};

// ==================== ZONES ====================

export const fetchZonesPaginated = async (API_BASE_URL: string, page: number) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/zones/paginated?page=${page - 1}&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    return await response.json();
  }
  return { data: [], pagination: { page, limit: 10, total: 0, totalPages: 0 } };
};

export const createZone = async (API_BASE_URL: string, name: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/zones`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  return handleResponse(response);
};

export const updateZone = async (API_BASE_URL: string, id: string, name: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/zones/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  return handleResponse(response);
};

export const deleteZone = async (API_BASE_URL: string, id: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/zones/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return handleResponse(response);
};

// ==================== WARDS ====================



// ✅ FIXED: Fetch wards with pagination
export const fetchWardsPaginated = async (
  API_BASE_URL: string,
  page: number = 1,
  filters?: any
): Promise<{ data: Ward[]; pagination: Pagination }> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found');
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const params = new URLSearchParams({
      page: page.toString(),
      limit: (filters?.limit || 10).toString(),
    });

    if (filters?.search) params.append('search', filters.search);
    if (filters?.zoneId) params.append('zoneId', filters.zoneId);
    if (filters?.stateId) params.append('stateId', filters.stateId);
    if (filters?.lgaId) params.append('lgaId', filters.lgaId);

    const url = `${API_BASE_URL}/admin/system/wards?${params.toString()}`;
    console.log('📡 Fetching wards from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Failed to fetch wards: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.error('Could not parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('📊 Wards API response:', {
      success: result.success,
      dataCount: result.data?.length || 0,
      total: result.pagination?.total || 0,
      page: result.pagination?.page || 1
    });

    // Handle different response structures
    let data = [];
    let pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };

    if (result.success && result.data) {
      data = result.data;
      pagination = result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
    } else if (result.wards) {
      data = result.wards;
      pagination = { page: 1, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) };
    } else if (Array.isArray(result)) {
      data = result;
      pagination = { page: 1, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) };
    }

    return {
      data: data,
      pagination: pagination
    };
  } catch (error) {
    console.error('Error fetching wards:', error);
    // Return empty data instead of throwing to prevent UI crashes
    return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
};




export const updateWard = async (API_BASE_URL: string, id: string, name: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/wards/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  return handleResponse(response);
};

export const deleteWard = async (API_BASE_URL: string, id: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/wards/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return handleResponse(response);
};

export const fetchWardsInZone = async (API_BASE_URL: string, zoneId: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/zones/${zoneId}/wards`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    return await response.json();
  }
  return { wards: [] };
};

export const createWard = async (API_BASE_URL: string, data: { name: string; zoneId: string }) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/wards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};





// ==================== POLLING UNITS ====================
// lib/system-admin/api/index.ts


/**
 * Fetch polling units with pagination and filters
 */


export const fetchPollingUnits = async (
  baseUrl: string,
  page: number = 1,
  filters: any = {}
): Promise<any> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const params = new URLSearchParams();
    
    params.append('page', page.toString());
    params.append('limit', (filters.limit || 50).toString());
    
    if (filters.zoneId && filters.zoneId !== 'undefined' && filters.zoneId !== 'null' && filters.zoneId !== 'all') {
      params.append('zoneId', filters.zoneId);
    }
    
    if (filters.wardId && filters.wardId !== 'undefined' && filters.wardId !== 'null' && filters.wardId !== 'all') {
      params.append('wardId', filters.wardId);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.unassigned) {
      params.append('unassigned', 'true');
    }

    const url = `${baseUrl}/admin/polling-units?${params.toString()}`;
    console.log('📤 API Request URL:', url);

    // ✅ Add timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Failed to fetch polling units: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('📥 API Response:', {
      success: data.success,
      pollingUnitsCount: data.pollingUnits?.length || 0,
      total: data.pagination?.total || 0,
    });

    return {
      data: data.pollingUnits || [],
      pagination: data.pagination || { 
        page: page, 
        limit: filters.limit || 50, 
        total: 0, 
        totalPages: 0 
      },
      filters: data.filters || {},
      success: data.success
    };
  } catch (error) {
    console.error('❌ API Error in fetchPollingUnits:', error);
    
    // ✅ Better error message for timeout/connection issues
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Fetch unassigned polling units
 */
export const fetchUnassignedPollingUnits = async (
  baseUrl: string,
  page: number = 1
): Promise<any> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '50');
    params.append('unassigned', 'true');

    const url = `${baseUrl}/admin/polling-units?${params.toString()}`;
    console.log('📤 API Request URL (unassigned):', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch unassigned polling units: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 API Response (unassigned):', {
      success: data.success,
      pollingUnitsCount: data.pollingUnits?.length || 0,
      total: data.pagination?.total || 0,
    });

    return {
      data: data.pollingUnits || [],
      pagination: data.pagination || { 
        page: page, 
        limit: 50, 
        total: 0, 
        totalPages: 0 
      },
      filters: data.filters || {},
      success: data.success
    };
  } catch (error) {
    console.error('❌ API Error in fetchUnassignedPollingUnits:', error);
    throw error;
  }
};

export const createPollingUnit = async (API_BASE_URL: string, data: any) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/polling-units`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const updatePollingUnit = async (API_BASE_URL: string, id: string, data: any) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/polling-units/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const deletePollingUnit = async (API_BASE_URL: string, id: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/polling-units/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return handleResponse(response);
};

export const bulkImportPollingUnits = async (API_BASE_URL: string, pollingUnits: any[]) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/polling-units/bulk-import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pollingUnits })
  });
  return handleResponse(response);
};

// ==================== USERS ====================

export const createUser = async (API_BASE_URL: string, userData: any) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/create-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  return handleResponse(response);
};

export const updateUser = async (API_BASE_URL: string, id: string, userData: any) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/users/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  return handleResponse(response);
};

export const deleteUser = async (API_BASE_URL: string, id: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/users/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return handleResponse(response);
};

// ==================== PARTIES ====================

export interface PartyData {
  name: string;
  logoUrl?: string;
  slogan?: string;
  registrationNumber?: string;
}

export const fetchParties = async (API_BASE_URL: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/parties`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.parties || [];
  }
  return [];
};

export const createParty = async (API_BASE_URL: string, data: PartyData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/parties/add`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create party');
  }
  return response.json();
};

export const updateParty = async (API_BASE_URL: string, id: string, data: PartyData) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/parties/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update party');
  }
  return response.json();
};

export const deleteParty = async (API_BASE_URL: string, id: string) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/parties/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete party');
  }
  return response.json();
};

// ==================== SYSTEM LOGS ====================

export const fetchSystemLogs = async (API_BASE_URL: string, page: number, filters: any) => {
  const token = localStorage.getItem('authToken');
  let url = `${API_BASE_URL}/admin/system/logs?page=${page}&limit=20`;
  
  if (filters.action && filters.action !== 'all') {
    url += `&action=${filters.action}`;
  }
  if (filters.status && filters.status !== 'all') {
    url += `&status=${filters.status}`;
  }
  if (filters.startDate) {
    url += `&startDate=${filters.startDate}`;
  }
  if (filters.endDate) {
    url += `&endDate=${filters.endDate}`;
  }
  if (filters.search) {
    url += `&search=${filters.search}`;
  }
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    return await response.json();
  }
  return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, filters: { actions: [] } };
};

export const exportLogs = (logs: any[]) => {
  if (logs.length === 0) return;

  const headers = ['Action', 'User', 'Email', 'Target Type', 'Target Name', 'Details', 'Timestamp', 'Status'];
  const csvData = logs.map(log => [
    log.action,
    log.user?.name || log.userEmail || 'System',
    log.user?.email || log.userEmail || '',
    log.targetType || '',
    log.targetName || '',
    JSON.stringify(log.details || {}),
    new Date(log.createdAt).toLocaleString(),
    log.status
  ]);

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};