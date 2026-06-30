// lib/api/results.ts
import { apiClient } from './client';

export interface Result {
  id: string;
  pollingUnitId?: string;
  pollingUnitName: string;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  agentId?: string;
  agentName: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  votes: Vote[];
  submittedAt: string;
  resultFileUrl?: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export interface Vote {
  partyId: string;
  partyName: string;
  partyLogo?: string;
  votes: number;
}

export interface ResultsResponse {
  success: boolean;
  results: Result[];
  error?: string;
  message?: string;
}

export interface ResultStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  totalVotes: number;
  parties: {
    partyId: string;
    partyName: string;
    votes: number;
    percentage: number;
  }[];
}

export const resultsApi = {
  /**
   * Get results based on user role
   */
  getResults: async (role?: string, wardId?: string, zoneId?: string): Promise<ResultsResponse> => {
    try {
      let url = '/admin/results';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/results`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/results`;
      }
      
      console.log('📡 Fetching results from:', url);
      const response = await apiClient.get<any>(url);
      console.log('📡 Raw response:', response);
      
      let resultsData: Result[] = [];
      
      if (Array.isArray(response)) {
        resultsData = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        resultsData = response.results;
      } else if (response && response.data && response.data.results && Array.isArray(response.data.results)) {
        resultsData = response.data.results;
      } else if (response && response.data && Array.isArray(response.data)) {
        resultsData = response.data;
      }
      
      return {
        success: true,
        results: resultsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching results:', error);
      throw error;
    }
  },

  /**
   * Get all results (for system admin and situation room)
   */
  getAllResults: async (): Promise<ResultsResponse> => {
    try {
      const response = await apiClient.get<any>('/admin/results');
      
      let resultsData: Result[] = [];
      
      if (Array.isArray(response)) {
        resultsData = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        resultsData = response.results;
      } else if (response && response.data && response.data.results && Array.isArray(response.data.results)) {
        resultsData = response.data.results;
      } else if (response && response.data && Array.isArray(response.data)) {
        resultsData = response.data;
      }
      
      return {
        success: true,
        results: resultsData,
        message: response?.message
      };
    } catch (error) {
      console.error('❌ Error fetching all results:', error);
      throw error;
    }
  },

  /**
   * Get a single result by ID
   */
  getResultById: async (resultId: string): Promise<{ success: boolean; result: Result }> => {
    try {
      const response = await apiClient.get<any>(`/admin/results/${resultId}`);
      
      let result = null;
      if (response && response.result) {
        result = response.result;
      } else if (response && response.data && response.data.result) {
        result = response.data.result;
      } else if (response && response.data) {
        result = response.data;
      } else {
        result = response;
      }
      
      return {
        success: true,
        result: result
      };
    } catch (error) {
      console.error('❌ Error fetching result:', error);
      throw error;
    }
  },

  /**
   * Get pending results for a ward
   */
  getPendingResults: async (wardId: string): Promise<ResultsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/ward/${wardId}/pending-results`);
      
      let resultsData: Result[] = [];
      if (Array.isArray(response)) {
        resultsData = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        resultsData = response.results;
      } else if (response && response.data && Array.isArray(response.data)) {
        resultsData = response.data;
      }
      
      return {
        success: true,
        results: resultsData
      };
    } catch (error) {
      console.error('❌ Error fetching pending results:', error);
      throw error;
    }
  },

  /**
   * Get results by ward
   */
  getResultsByWard: async (wardId: string): Promise<ResultsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/ward/${wardId}/results`);
      
      let resultsData: Result[] = [];
      if (Array.isArray(response)) {
        resultsData = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        resultsData = response.results;
      } else if (response && response.data && Array.isArray(response.data)) {
        resultsData = response.data;
      }
      
      return {
        success: true,
        results: resultsData
      };
    } catch (error) {
      console.error('❌ Error fetching ward results:', error);
      throw error;
    }
  },

  /**
   * Get results by zone
   */
  getResultsByZone: async (zoneId: string): Promise<ResultsResponse> => {
    try {
      const response = await apiClient.get<any>(`/admin/zone/${zoneId}/results`);
      
      let resultsData: Result[] = [];
      if (Array.isArray(response)) {
        resultsData = response;
      } else if (response && response.results && Array.isArray(response.results)) {
        resultsData = response.results;
      } else if (response && response.data && Array.isArray(response.data)) {
        resultsData = response.data;
      }
      
      return {
        success: true,
        results: resultsData
      };
    } catch (error) {
      console.error('❌ Error fetching zone results:', error);
      throw error;
    }
  },

  /**
   * Get result statistics
   */
  getResultStats: async (wardId?: string, zoneId?: string): Promise<{ success: boolean; stats: ResultStats }> => {
    try {
      let url = '/admin/results/stats';
      
      if (wardId) {
        url = `/admin/ward/${wardId}/results/stats`;
      } else if (zoneId) {
        url = `/admin/zone/${zoneId}/results/stats`;
      }
      
      const response = await apiClient.get<any>(url);
      
      let stats: ResultStats = response?.stats || response?.data || response;
      
      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error fetching result stats:', error);
      throw error;
    }
  },

  /**
   * Approve a result
   */
  approveResult: async (
    resultId: string,
    comment: string
  ): Promise<{ success: boolean; message: string; result: Result }> => {
    try {
      const response = await apiClient.post<any>(`/admin/results/${resultId}/approve`, {
        comment
      });
      
      let result = null;
      if (response && response.result) {
        result = response.result;
      } else if (response && response.data && response.data.result) {
        result = response.data.result;
      } else if (response && response.data) {
        result = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Result approved successfully',
        result: result
      };
    } catch (error) {
      console.error('❌ Error approving result:', error);
      throw error;
    }
  },

  /**
   * Reject a result
   */
  rejectResult: async (
    resultId: string,
    comment: string
  ): Promise<{ success: boolean; message: string; result: Result }> => {
    try {
      const response = await apiClient.post<any>(`/admin/results/${resultId}/reject`, {
        comment
      });
      
      let result = null;
      if (response && response.result) {
        result = response.result;
      } else if (response && response.data && response.data.result) {
        result = response.data.result;
      } else if (response && response.data) {
        result = response.data;
      }
      
      return {
        success: true,
        message: response?.message || 'Result rejected successfully',
        result: result
      };
    } catch (error) {
      console.error('❌ Error rejecting result:', error);
      throw error;
    }
  },

  /**
   * Get vote summary for a zone
   */
  getVoteSummary: async (zoneId: string): Promise<{
    success: boolean;
    summary: Array<{
      party: string;
      partyId: string;
      partyLogo?: string;
      votes: number;
      percentage: number;
      color: string;
    }>;
    totalVotes: number;
    timestamp: string;
  }> => {
    try {
      const response = await apiClient.get<any>(`/admin/zone/${zoneId}/vote-summary`);
      
      return {
        success: true,
        summary: response?.summary || response?.data?.summary || [],
        totalVotes: response?.totalVotes || response?.data?.totalVotes || 0,
        timestamp: response?.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching vote summary:', error);
      throw error;
    }
  }
};

// Export a hook for easy use
export const useResultsApi = () => {
  return {
    getResults: resultsApi.getResults,
    getAllResults: resultsApi.getAllResults,
    getResultById: resultsApi.getResultById,
    getPendingResults: resultsApi.getPendingResults,
    getResultsByWard: resultsApi.getResultsByWard,
    getResultsByZone: resultsApi.getResultsByZone,
    getResultStats: resultsApi.getResultStats,
    approveResult: resultsApi.approveResult,
    rejectResult: resultsApi.rejectResult,
    getVoteSummary: resultsApi.getVoteSummary,
  };
};