// hooks/useVoteSummary.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';

export interface VoteSummary {
  party: string;
  partyId?: string;
  partyLogo?: string | null;
  votes: number;
  percentage: number;
  color: string;
}

export interface VoteSummaryData {
  summaries: VoteSummary[];
  totalVotes: number;
  lastUpdated: string | null;
}

// Party color mapping (fallback if backend doesn't provide colors)
const PARTY_COLORS: Record<string, string> = {
  'APC': 'bg-blue-500',
  'PDP': 'bg-green-500',
  'LP': 'bg-red-500',
  'NNPP': 'bg-purple-500',
  'ACCORD': 'bg-orange-500',
  'SDP': 'bg-yellow-500',
  'APGA': 'bg-indigo-500',
  'YPP': 'bg-pink-500',
};

export function useVoteSummary(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<VoteSummary[]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVoteSummary = useCallback(async (showToastMessage = false) => {
    if (!user || !user.zoneId) {
      console.log('No zone ID found for user');
      setSummaries([]);
      setTotalVotes(0);
      setLoading(false);
      return;
    }

    try {
      if (showToastMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Use the dedicated vote summary endpoint
      const url = `${API_BASE_URL}/admin/zone/${user.zoneId}/vote-summary`;
      console.log('🔍 Fetching vote summary from:', url);

      const response = await fetch(url, {
        headers: withTenantHeaders({ 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Vote summary response:', data);

        if (data.success && Array.isArray(data.summary)) {
          // Process the summaries to ensure they have all required fields
          const processedSummaries = data.summary.map((item: any) => ({
            party: item.party || 'Unknown Party',
            partyId: item.partyId,
            partyLogo: item.partyLogo,
            votes: item.votes || 0,
            percentage: item.percentage || 0,
            color: item.color || PARTY_COLORS[item.party] || 'bg-gray-500'
          }));

          setSummaries(processedSummaries);
          setTotalVotes(data.totalVotes || 0);
          setLastUpdated(data.timestamp || new Date().toISOString());

          if (showToastMessage) {
            toast({
              title: "Success",
              description: `Vote summary updated with ${processedSummaries.length} parties (${(data.totalVotes || 0).toLocaleString()} votes)`,
            });
          }
        } else {
          console.log('⚠️ No vote data found:', data.message);
          setSummaries([]);
          setTotalVotes(0);
          setLastUpdated(data.timestamp || new Date().toISOString());
          
          if (showToastMessage) {
            toast({
              title: "No Data",
              description: data.message || "No verified results found in your zone",
            });
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Response not OK:', response.status, errorText);
        
        // Try to parse error as JSON
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Failed to fetch vote summary: ${response.status}`);
        } catch {
          throw new Error(`Failed to fetch vote summary: ${response.status}`);
        }
      }

    } catch (error) {
      console.error('❌ Error fetching vote summary:', error);
      const offline = isNetworkError(error);
      const message = offline ? SERVER_OFFLINE_MESSAGE : 'Failed to load vote summary';
      setSummaries([]);
      setTotalVotes(0);
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

  // Manual refresh function
  const refreshVoteSummary = useCallback((showToast = false) => {
    return fetchVoteSummary(showToast);
  }, [fetchVoteSummary]);

  // Calculate total votes from summaries (useful for fallback)
  const calculateTotalVotes = useCallback(() => {
    return summaries.reduce((sum, item) => sum + (item.votes || 0), 0);
  }, [summaries]);

  useEffect(() => {
    fetchVoteSummary();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchVoteSummary(false);
      }, options.refreshInterval || 60000); // Refresh every minute by default
      
      return () => clearInterval(interval);
    }
  }, [fetchVoteSummary, options?.autoRefresh, options?.refreshInterval]);

  return {
    summaries,
    totalVotes: totalVotes || calculateTotalVotes(),
    lastUpdated,
    loading,
    refreshing,
    error,
    refreshVoteSummary,
  };
}