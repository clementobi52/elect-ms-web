"use client"; 

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { SERVER_OFFLINE_MESSAGE, isNetworkError } from '@/lib/messages';

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

// Enhanced transformResult function

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

  const fetchResults = useCallback(async (showToastMessage = false) => {
    if (!user) return;

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

      let url = '';
      let response;

      // Determine which endpoint to use based on user role
      if (user.role === 'System Admin') {
        url = `${API_BASE_URL}/admin/results`;
        console.log('System Admin fetching all results from:', url);
        
        response = await fetch(url, {
          headers: withTenantHeaders({ Authorization: `Bearer ${token}` })
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

          if (Array.isArray(resultsData)) {
            const transformedResults = resultsData.map(transformResult);
            setResults(transformedResults);
            
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
          headers: withTenantHeaders({ Authorization: `Bearer ${token}` })
        });

        if (response.ok) {
          const data = await response.json();
          let resultsData = data.results || data.data || (Array.isArray(data) ? data : []);
          
          if (Array.isArray(resultsData)) {
            const transformedResults = resultsData.map(transformResult);
            setResults(transformedResults);
            
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
          headers: withTenantHeaders({ Authorization: `Bearer ${token}` })
        });

        if (response.ok) {
          const data = await response.json();
          let resultsData = data.results || data.data || (Array.isArray(data) ? data : []);
          
          if (Array.isArray(resultsData)) {
            const transformedResults = resultsData.map(transformResult);
            setResults(transformedResults);
            
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
          headers: withTenantHeaders({ Authorization: `Bearer ${token}` })
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
          
          if (Array.isArray(resultsData)) {
            const transformedResults = resultsData.map(transformResult);
            
            setResults(transformedResults);
            
            if (showToastMessage) {
              toast({
                title: "Success",
                description: `Loaded ${transformedResults.length} results`,
              });
            }
            return;
          }
        } else {
          console.log('Response not OK:', response.status, response.statusText);
        }
      }

      // No endpoint matched the user's role, or the request was not OK.
      setResults([]);
      setError('Failed to load results');

    } catch (error) {
      console.error('Error fetching results:', error);
      const offline = isNetworkError(error);
      const message = offline ? SERVER_OFFLINE_MESSAGE : 'Failed to load results';
      setResults([]);
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

  const approveResult = useCallback(async (resultId: string, comment?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/approve`, {
        method: 'POST',
        headers: withTenantHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }),
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
        headers: withTenantHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }),
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
    refreshResults: (showToast = false) => fetchResults(showToast),
    approveResult,
    rejectResult
  };
}