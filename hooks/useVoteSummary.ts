// hooks/useVoteSummary.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

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

// Demo data for fallback when backend is unavailable
const DEMO_VOTE_SUMMARIES: VoteSummary[] = [
  { party: 'APC', votes: 45230, percentage: 42, color: 'bg-blue-500' },
  { party: 'PDP', votes: 38450, percentage: 36, color: 'bg-green-500' },
  { party: 'LP', votes: 15890, percentage: 15, color: 'bg-red-500' },
  { party: 'NNPP', votes: 7520, percentage: 7, color: 'bg-purple-500' },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  const [summaries, setSummaries] = useState<VoteSummary[]>(DEMO_VOTE_SUMMARIES);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const fetchVoteSummary = useCallback(async (showToastMessage = false) => {
    if (!user || !user.zoneId) {
      console.log('No zone ID found for user');
      setUsingDemoData(true);
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
      setUsingDemoData(false);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Use the dedicated vote summary endpoint
      const url = `${API_BASE_URL}/admin/zone/${user.zoneId}/vote-summary`;
      console.log('🔍 Fetching vote summary from:', url);

      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Vote summary response:', data);

        if (data.success && data.summary && data.summary.length > 0) {
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
          setUsingDemoData(false);

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
      setSummaries(DEMO_VOTE_SUMMARIES);
      setTotalVotes(DEMO_VOTE_SUMMARIES.reduce((sum, item) => sum + item.votes, 0));
      setUsingDemoData(true);
      setError('Failed to load vote summary');
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample vote summary",
          variant: "default",
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
    usingDemoData,
    refreshVoteSummary,
  };
}