"use client"; 

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

export interface ElectionResult {
  id: string;
  pollingUnitId?: string;
  pollingUnit: string;
  agentId?: string;
  agent: string;
  submittedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  resultFileUrl?: string;
  votes: Array<{ party: string; partyId?: string; votes: number; partyLogo?: string }>;
  wardId?: string;
  wardName?: string;
  zoneId?: string;
  zoneName?: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Demo data with proper party names
const DEMO_RESULTS: ElectionResult[] = [
  {
    id: '1',
    pollingUnit: 'Polling Unit 1 - Central Primary School',
    pollingUnitId: 'pu1',
    agent: 'John Doe',
    agentId: 'agent1',
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'Pending',
    resultFileUrl: 'https://example.com/result1.jpg',
    wardName: 'Ward 1',
    zoneName: 'Zone A',
    votes: [
      { party: 'APC', votes: 150, partyId: 'party1' },
      { party: 'PDP', votes: 120, partyId: 'party2' },
      { party: 'LP', votes: 80, partyId: 'party3' }
    ]
  },
  {
    id: '2',
    pollingUnit: 'Polling Unit 2 - Community Hall',
    pollingUnitId: 'pu2',
    agent: 'Jane Smith',
    agentId: 'agent2',
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'Verified',
    resultFileUrl: 'https://example.com/result2.jpg',
    wardName: 'Ward 1',
    zoneName: 'Zone A',
    votes: [
      { party: 'APC', votes: 180, partyId: 'party1' },
      { party: 'PDP', votes: 90, partyId: 'party2' },
      { party: 'LP', votes: 110, partyId: 'party3' }
    ]
  },
  {
    id: '3',
    pollingUnit: 'Polling Unit 3 - Market Square',
    pollingUnitId: 'pu3',
    agent: 'Mike Johnson',
    agentId: 'agent3',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Rejected',
    resultFileUrl: 'https://example.com/result3.jpg',
    wardName: 'Ward 2',
    zoneName: 'Zone A',
    votes: [
      { party: 'APC', votes: 120, partyId: 'party1' },
      { party: 'PDP', votes: 150, partyId: 'party2' },
      { party: 'LP', votes: 60, partyId: 'party3' }
    ],
    reviewComment: 'Results inconsistent with voter turnout'
  },
  {
    id: '4',
    pollingUnit: 'Polling Unit 4 - Health Center',
    pollingUnitId: 'pu4',
    agent: 'Sarah Brown',
    agentId: 'agent4',
    submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'Pending',
    wardName: 'Ward 2',
    zoneName: 'Zone B',
    votes: [
      { party: 'APC', votes: 200, partyId: 'party1' },
      { party: 'PDP', votes: 180, partyId: 'party2' },
      { party: 'LP', votes: 95, partyId: 'party3' }
    ]
  },
  {
    id: '5',
    pollingUnit: 'Polling Unit 5 - Town Hall',
    pollingUnitId: 'pu5',
    agent: 'David Wilson',
    agentId: 'agent5',
    submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'Verified',
    wardName: 'Ward 3',
    zoneName: 'Zone B',
    votes: [
      { party: 'APC', votes: 145, partyId: 'party1' },
      { party: 'PDP', votes: 130, partyId: 'party2' },
      { party: 'LP', votes: 115, partyId: 'party3' },
      { party: 'NNPP', votes: 45, partyId: 'party4' }
    ]
  }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Enhanced helper function to extract image URL from various possible fields
const extractImageUrl = (item: any): string | null | undefined => {
  // Log all possible fields that might contain the image URL
  console.log('Extracting image from item fields:', {
    resultFileUrl: item.resultFileUrl,
    resultImageUrl: item.resultImageUrl,
    imageUrl: item.imageUrl,
    photoUrl: item.photoUrl,
    fileUrl: item.fileUrl,
    resultImage: item.resultImage,
    mediaUrl: item.mediaUrl,
    result_file_url: item.result_file_url,
    result_image_url: item.result_image_url,
    result_photo: item.result_photo,
    electionResult: item.electionResult,
    result: item.result,
    attachment: item.attachment,
    attachments: item.attachments
  });

  // Check for nested result object
  if (item.result) {
    const nestedResult = item.result;
    const nestedUrl = nestedResult.fileUrl || 
                     nestedResult.imageUrl || 
                     nestedResult.url || 
                     nestedResult.photo;
    if (nestedUrl) return nestedUrl;
  }

  // Check for electionResult object
  if (item.electionResult) {
    const electionResult = item.electionResult;
    const electionUrl = electionResult.fileUrl || 
                       electionResult.imageUrl || 
                       electionResult.photo;
    if (electionUrl) return electionUrl;
  }

  // Check for attachments array
  if (item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0) {
    const attachment = item.attachments[0];
    const attachmentUrl = attachment.url || attachment.fileUrl || attachment.path;
    if (attachmentUrl) return attachmentUrl;
  }

  // Check for single attachment
  if (item.attachment) {
    const attachmentUrl = item.attachment.url || item.attachment.fileUrl || item.attachment.path;
    if (attachmentUrl) return attachmentUrl;
  }

  // Check all possible field names (case insensitive)
  const possibleFields = [
    'resultFileUrl', 'resultImageUrl', 'imageUrl', 'photoUrl', 'fileUrl',
    'resultImage', 'mediaUrl', 'result_file_url', 'result_image_url',
    'result_photo', 'resultUrl', 'result_url', 'image', 'photo', 'file',
    'resultFile', 'resultImage', 'resultPhoto', 'result_attachment',
    'resultAttachment', 'attachmentUrl', 'attachment_url'
  ];

  for (const field of possibleFields) {
    if (item[field]) {
      console.log(`Found image URL in field: ${field} = ${item[field]}`);
      return item[field];
    }
  }

  // Check if the item itself is a string (might be the URL)
  if (typeof item === 'string' && (item.startsWith('http') || item.startsWith('/uploads'))) {
    console.log('Item itself is a URL string:', item);
    return item;
  }

  console.log('No image URL found in item');
  return null;
};

// Enhanced transformResult function
const transformResult = (item: any): ElectionResult => {
  // Log the raw item to see what fields are available
  console.log('Transforming item:', JSON.stringify(item, null, 2));
  
  // Extract image URL using enhanced helper
  const imageUrl = extractImageUrl(item);
  
  // Extract votes with better handling
  let votes = [];
  if (item.votes && Array.isArray(item.votes)) {
    votes = item.votes;
  } else if (item.results && Array.isArray(item.results)) {
    votes = item.results;
  } else if (item.voteCounts && Array.isArray(item.voteCounts)) {
    votes = item.voteCounts;
  } else if (item.partyResults && Array.isArray(item.partyResults)) {
    votes = item.partyResults;
  }

  return {
    id: item.id,
    pollingUnitId: item.pollingUnitId || item.polling_unit_id,
    pollingUnit: item.pollingUnit?.name || 
                 item.pollingUnitName || 
                 item.polling_unit_name || 
                 item.polling_unit?.name || 
                 item.pollingUnit || 
                 'Unknown',
    agentId: item.agentId || item.agent_id || item.uploadedBy,
    agent: item.agent?.name || 
           item.agentName || 
           item.agent_name || 
           item.uploader?.name || 
           item.uploaderName || 
           'Unknown',
    submittedAt: item.submittedAt || 
                 item.submitted_at || 
                 item.createdAt || 
                 item.created_at || 
                 new Date().toISOString(),
    status: item.status || 'Pending',
    resultFileUrl: imageUrl,
    votes: votes.map((vote: any) => ({
      party: vote.party?.name || 
             vote.partyName || 
             vote.party_name || 
             vote.party || 
             'Unknown',
      partyId: vote.partyId || vote.party_id,
      votes: vote.votes || vote.voteCount || vote.count || vote.vote_count || 0,
      partyLogo: vote.party?.logoUrl || vote.partyLogo || vote.party_logo
    })),
    wardId: item.wardId || item.ward_id || item.pollingUnit?.wardId,
    wardName: item.wardName || 
              item.ward_name || 
              item.pollingUnit?.ward?.name || 
              item.ward?.name,
    zoneId: item.zoneId || item.zone_id || item.pollingUnit?.ward?.zoneId,
    zoneName: item.zoneName || 
              item.zone_name || 
              item.pollingUnit?.ward?.zone?.name || 
              item.zone?.name,
    reviewComment: item.reviewComment || item.review_comment,
    reviewedBy: item.reviewedBy || item.reviewed_by,
    reviewedAt: item.reviewedAt || item.reviewed_at
  };
};

export function useResults(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const fetchResults = useCallback(async (showToastMessage = false) => {
    if (!user) return;

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

      let url = '';
      let response;

      // Determine which endpoint to use based on user role
      if (user.role === 'System Admin') {
        url = `${API_BASE_URL}/admin/results`;
        console.log('System Admin fetching all results from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('System Admin response:', data);
          
          let resultsData = [];
          if (data.data && Array.isArray(data.data)) {
            resultsData = data.data;
          } else if (data.results && Array.isArray(data.results)) {
            resultsData = data.results;
          } else if (Array.isArray(data)) {
            resultsData = data;
          }

          if (resultsData.length > 0) {
            const transformedResults = resultsData.map(transformResult);
            console.log('Transformed results:', transformedResults);
            setResults(transformedResults);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedResults.length} results`,
              });
            }
            return;
          }
        }
      } 
      else if (user.role === 'Situation Room Admin') {
        if (user.zoneId) {
          url = `${API_BASE_URL}/admin/zone/${user.zoneId}/results`;
        } else {
          url = `${API_BASE_URL}/admin/results`;
        }
        
        console.log('Situation Room fetching results from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          let resultsData = data.results || data.data || (Array.isArray(data) ? data : []);
          
          if (resultsData.length > 0) {
            const transformedResults = resultsData.map(transformResult);
            setResults(transformedResults);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedResults.length} results`,
              });
            }
            return;
          }
        }
      }
      else if (user.role === 'Zone Admin' && user.zoneId) {
        url = `${API_BASE_URL}/admin/zone/${user.zoneId}/results`;
        
        console.log('Zone Admin fetching results from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          let resultsData = data.results || data.data || (Array.isArray(data) ? data : []);
          
          if (resultsData.length > 0) {
            const transformedResults = resultsData.map(transformResult);
            setResults(transformedResults);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedResults.length} results`,
              });
            }
            return;
          }
        }
      }
      else if (user.role === 'Ward Admin' && user.wardId) {
        url = `${API_BASE_URL}/admin/ward/${user.wardId}/results`;
        
        console.log('Ward Admin fetching results from:', url);
        
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Ward Admin raw response:', JSON.stringify(data, null, 2));
          
          // Handle different response structures
          let resultsData = [];
          if (Array.isArray(data)) {
            resultsData = data;
          } else if (data.data && Array.isArray(data.data)) {
            resultsData = data.data;
          } else if (data.results && Array.isArray(data.results)) {
            resultsData = data.results;
          } else if (data.electionResults && Array.isArray(data.electionResults)) {
            resultsData = data.electionResults;
          }
          
          console.log('Ward Admin resultsData:', resultsData);
          
          if (resultsData.length > 0) {
            // Log first result to check structure
            console.log('First result sample:', JSON.stringify(resultsData[0], null, 2));
            
            const transformedResults = resultsData.map(transformResult);
            console.log('Transformed results:', transformedResults);
            
            setResults(transformedResults);
            setUsingDemoData(false);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedResults.length} results`,
              });
            }
            return;
          } else {
            console.log('No results data found in response');
          }
        } else {
          console.log('Response not OK:', response.status, response.statusText);
        }
      }

      // If we get here, no valid data was received
      console.log('No data received, using demo data');
      setResults(DEMO_RESULTS);
      setUsingDemoData(true);
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample results",
        });
      }

    } catch (error) {
      console.error('Error fetching results:', error);
      setResults(DEMO_RESULTS);
      setUsingDemoData(true);
      setError('Failed to load results');
      
      if (showToastMessage) {
        toast({
          title: "Demo Mode",
          description: "Showing sample results",
          variant: "default",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  const approveResult = useCallback(async (resultId: string, comment?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve result');
      }

      setResults(prev => prev.map(r => 
        r.id === resultId ? { 
          ...r, 
          status: 'Verified',
          reviewComment: comment,
          reviewedAt: new Date().toISOString()
        } : r
      ));

      toast({
        title: "Success",
        description: "Result approved successfully",
      });

      return true;
    } catch (error) {
      console.error('Error approving result:', error);
      toast({
        title: "Error",
        description: "Failed to approve result",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const rejectResult = useCallback(async (resultId: string, comment?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject result');
      }

      setResults(prev => prev.map(r => 
        r.id === resultId ? { 
          ...r, 
          status: 'Rejected',
          reviewComment: comment,
          reviewedAt: new Date().toISOString()
        } : r
      ));

      toast({
        title: "Success",
        description: "Result rejected",
      });

      return true;
    } catch (error) {
      console.error('Error rejecting result:', error);
      toast({
        title: "Error",
        description: "Failed to reject result",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchResults();

    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchResults(false);
      }, options.refreshInterval || 30000);
      
      return () => clearInterval(interval);
    }
  }, [fetchResults, options?.autoRefresh, options?.refreshInterval]);

  return {
    results,
    loading,
    refreshing,
    error,
    usingDemoData,
    refreshResults: (showToast = false) => fetchResults(showToast),
    approveResult,
    rejectResult
  };
}