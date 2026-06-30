// lib/api/agents.ts
import { apiClient } from './client';

export interface Agent {
  id: string;
  name: string;
  email: string;
  pollingUnitId?: string;
  pollingUnitName: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  status: 'Online' | 'Offline';
  lastActive?: string;
  createdAt?: string;
  updatedAt?: string;
  resultsSubmitted?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AgentsResponse {
  success: boolean;
  agents: Agent[];
  error?: string;
  message?: string;
}

export interface AgentStats {
  total: number;
  online: number;
  offline: number;
  withResults: number;
  withoutResults: number;
}

export const agentsApi = {
  /**
   * Get agents based on user role
   * - System Admin: All agents
   * - Situation Room: All agents (or filtered by zone if assigned)
   * - Zone Admin: Agents in their zone
   * - Ward Admin: Agents in their ward
   */
  getAgents: async (role?: string, wardId?: string, zoneId?: string): Promise<AgentsResponse> => {
    try {
      let url = '/admin/agents';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/agents`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/agents`;
      }
      
      console.log('📡 Fetching agents from:', url);
      const response = await apiClient.get<any>(url);
      console.log('📡 Raw response:', response);
      
      let agentsData: Agent[] = [];
      
      if (Array.isArray(response)) {
        agentsData = response;
      } else if (response && response.agents && Array.isArray(response.agents)) {
        agentsData = response.agents;
      } else if (response && response.data && response.data.agents && Array.isArray(response.data.agents)) {
        agentsData = response.data.agents;
      } else if (response && response.data && Array.isArray(response.data)) {
        agentsData = response.data;
      } else if (response && response.results && Array.isArray(response.results)) {
        agentsData = response.results;
      }
      
      return {
        success: true,
        agents: agentsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching agents:', error);
      throw error;
    }
  },

  /**
   * Get all agents (for system admin and situation room)
   */
  getAllAgents: async (): Promise<AgentsResponse> => {
    try {
      const response = await apiClient.get<any>('/admin/agents');
      
      let agentsData: Agent[] = [];
      
      if (Array.isArray(response)) {
        agentsData = response;
      } else if (response && response.agents && Array.isArray(response.agents)) {
        agentsData = response.agents;
      } else if (response && response.data && response.data.agents && Array.isArray(response.data.agents)) {
        agentsData = response.data.agents;
      } else if (response && response.data && Array.isArray(response.data)) {
        agentsData = response.data;
      }
      
      return {
        success: true,
        agents: agentsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching all agents:', error);
      throw error;
    }
  },

  /**
   * Get a single agent by ID
   */
  getAgentById: async (agentId: string): Promise<{ success: boolean; agent: Agent }> => {
    try {
      const response = await apiClient.get<any>(`/admin/agents/${agentId}`);
      
      let agent = null;
      if (response && response.agent) {
        agent = response.agent;
      } else if (response && response.data && response.data.agent) {
        agent = response.data.agent;
      } else if (response && response.data) {
        agent = response.data;
      } else {
        agent = response;
      }
      
      return {
        success: true,
        agent: agent
      };
    } catch (error) {
      console.error('❌ Error fetching agent:', error);
      throw error;
    }
  },

  /**
   * Get agents by ward (for ward admin)
   */
  getAgentsByWard: async (wardId: string): Promise<AgentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/ward/${wardId}/agents`);
      
      let agentsData: Agent[] = [];
      if (Array.isArray(response)) {
        agentsData = response;
      } else if (response && response.agents && Array.isArray(response.agents)) {
        agentsData = response.agents;
      } else if (response && response.data && Array.isArray(response.data)) {
        agentsData = response.data;
      }
      
      return {
        success: true,
        agents: agentsData
      };
    } catch (error) {
      console.error('❌ Error fetching ward agents:', error);
      throw error;
    }
  },

  /**
   * Get agents by zone (for zone admin)
   */
  getAgentsByZone: async (zoneId: string): Promise<AgentsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/zone/${zoneId}/agents`);
      
      let agentsData: Agent[] = [];
      if (Array.isArray(response)) {
        agentsData = response;
      } else if (response && response.agents && Array.isArray(response.agents)) {
        agentsData = response.agents;
      } else if (response && response.data && Array.isArray(response.data)) {
        agentsData = response.data;
      }
      
      return {
        success: true,
        agents: agentsData
      };
    } catch (error) {
      console.error('❌ Error fetching zone agents:', error);
      throw error;
    }
  },

  /**
   * Get agent statistics
   */
  getAgentStats: async (wardId?: string, zoneId?: string): Promise<{ success: boolean; stats: AgentStats }> => {
    try {
      let url = '/admin/agents/stats';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/agents/stats`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/agents/stats`;
      }
      
      const response = await apiClient.get<any>(url);
      
      let stats: AgentStats = response?.stats || response?.data || response;
      
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error fetching agent stats:', error);
      throw error;
    }
  },

  /**
   * Update agent status (online/offline)
   */
  updateAgentStatus: async (
    agentId: string,
    status: 'Online' | 'Offline'
  ): Promise<{ success: boolean; message: string; agent: Agent }> => {
    try {
      const response = await apiClient.patch<any>(`/admin/agents/${agentId}/status`, { status });
      
      let agent = null;
      if (response && response.agent) {
        agent = response.agent;
      } else if (response && response.data && response.data.agent) {
        agent = response.data.agent;
      } else if (response && response.data) {
        agent = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Agent status updated',
        agent: agent
      };
    } catch (error) {
      console.error('❌ Error updating agent status:', error);
      throw error;
    }
  },

  /**
   * Assign agent to polling unit
   */
  assignPollingUnit: async (
    agentId: string,
    pollingUnitId: string
  ): Promise<{ success: boolean; message: string; agent: Agent }> => {
    try {
      const response = await apiClient.patch<any>(`/admin/agents/${agentId}/assign`, { pollingUnitId });
      
      let agent = null;
      if (response && response.agent) {
        agent = response.agent;
      } else if (response && response.data && response.data.agent) {
        agent = response.data.agent;
      } else if (response && response.data) {
        agent = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Agent assigned successfully',
        agent: agent
      };
    } catch (error) {
      console.error('❌ Error assigning agent:', error);
      throw error;
    }
  },

  /**
   * Reconcile agent location with polling unit
   */
  reconcileLocation: async (agentId: string): Promise<{ 
    success: boolean; 
    message: string; 
    pollingUnit: any;
    agent: Agent;
  }> => {
    try {
      const response = await apiClient.post<any>(`/admin/agents/${agentId}/reconcile-location`, {});
      
      return {
        success: true,
        message: response?.message || 'Location reconciled successfully',
        pollingUnit: response?.pollingUnit || null,
        agent: response?.agent || null
      };
    } catch (error) {
      console.error('❌ Error reconciling location:', error);
      throw error;
    }
  }
};

// Export a hook for easy use
export const useAgentsApi = () => {
  return {
    getAgents: agentsApi.getAgents,
    getAllAgents: agentsApi.getAllAgents,
    getAgentById: agentsApi.getAgentById,
    getAgentsByWard: agentsApi.getAgentsByWard,
    getAgentsByZone: agentsApi.getAgentsByZone,
    getAgentStats: agentsApi.getAgentStats,
    updateAgentStatus: agentsApi.updateAgentStatus,
    assignPollingUnit: agentsApi.assignPollingUnit,
    reconcileLocation: agentsApi.reconcileLocation,
  };
};