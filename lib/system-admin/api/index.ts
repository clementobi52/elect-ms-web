// lib/system-admin/system/api/index.ts
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

// ==================== POLLING UNITS ====================

export const fetchPollingUnits = async (API_BASE_URL: string, page: number, filters?: any) => {
  const token = localStorage.getItem('authToken');
  let url = `${API_BASE_URL}/admin/system/polling-units?page=${page}&limit=10`;
  
  if (filters?.wardId) url += `&wardId=${filters.wardId}`;
  if (filters?.zoneId) url += `&zoneId=${filters.zoneId}`;
  if (filters?.search) url += `&search=${filters.search}`;
  if (filters?.hasAgent !== undefined) url += `&hasAgent=${filters.hasAgent}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    return await response.json();
  }
  return { data: [], pagination: { page, limit: 10, total: 0, totalPages: 0 } };
};

export const fetchUnassignedPollingUnits = async (API_BASE_URL: string, page: number) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/admin/system/polling-units/unassigned?page=${page}&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    return await response.json();
  }
  return { data: [], pagination: { page, limit: 10, total: 0, totalPages: 0 } };
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

// party

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