// components/admin/shared/ResultsTable.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  RefreshCw, 
  Download, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Shield,
  MapPin,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

interface ElectionResult {
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

interface ResultsTableProps {
  results: ElectionResult[];
  loading?: boolean;
  onRefresh?: () => void;
  onApprove?: (resultId: string, comment?: string) => Promise<boolean>;
  onReject?: (resultId: string, comment?: string) => Promise<boolean>;
  showWard?: boolean;
  showZone?: boolean;
  role: 'ward' | 'zone' | 'situation' | 'system';
  title?: string;
  description?: string;
}

// Party color mapping for visual differentiation
const getPartyColor = (party: string) => {
  const partyColors: Record<string, { bg: string; text: string; border: string }> = {
    'APC': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'PDP': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'LP': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'NNPP': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'ACCORD': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'SDP': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    'APGA': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    'YPP': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  };
  
  return partyColors[party] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
};

// Common Nigerian political parties for demo data
const PARTY_ABBREVIATIONS: Record<string, string> = {
  'APC': 'All Progressives Congress',
  'PDP': 'Peoples Democratic Party',
  'LP': 'Labour Party',
  'NNPP': 'New Nigeria Peoples Party',
  'ACCORD': 'Accord Party',
  'SDP': 'Social Democratic Party',
  'APGA': 'All Progressives Grand Alliance',
  'YPP': 'Young Progressives Party',
};

export function ResultsTable({ 
  results, 
  loading = false, 
  onRefresh, 
  onApprove,
  onReject,
  showWard = false, 
  showZone = false,
  role,
  title = "Election Results",
  description
}: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<ElectionResult | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion for vote details
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Safe filtering with null checks
  const filteredResults = results.filter(result => {
    if (!result) return false;
    
    const searchLower = searchTerm.toLowerCase();
    
    const pollingUnitMatch = result.pollingUnit 
      ? result.pollingUnit.toLowerCase().includes(searchLower) 
      : false;
    
    const agentMatch = result.agent 
      ? result.agent.toLowerCase().includes(searchLower) 
      : false;
    
    const wardMatch = result.wardName 
      ? result.wardName.toLowerCase().includes(searchLower) 
      : false;
    
    return pollingUnitMatch || agentMatch || wardMatch;
  });

  const pendingResults = filteredResults.filter(r => r?.status === 'Pending');
  const verifiedResults = filteredResults.filter(r => r?.status === 'Verified');
  const rejectedResults = filteredResults.filter(r => r?.status === 'Rejected');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'Verified':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getRoleBadge = () => {
    switch(role) {
      case 'system': return { bg: 'bg-purple-50', text: 'text-purple-700', icon: Shield };
      case 'situation': return { bg: 'bg-orange-50', text: 'text-orange-700', icon: Users };
      case 'zone': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: MapPin };
      default: return { bg: 'bg-green-50', text: 'text-green-700', icon: FileText };
    }
  };

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  const handleApprove = async () => {
    if (!selectedResult || !onApprove) return;
    
    setIsSubmitting(true);
    try {
      const success = await onApprove(selectedResult.id, reviewComment);
      if (success) {
        setIsReviewDialogOpen(false);
        setSelectedResult(null);
        setReviewComment('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedResult || !onReject) return;
    
    setIsSubmitting(true);
    try {
      const success = await onReject(selectedResult.id, reviewComment);
      if (success) {
        setIsReviewDialogOpen(false);
        setSelectedResult(null);
        setReviewComment('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getPartyLogo = (partyName: string) => {
    // This would be replaced with actual party logo lookup
    return null;
  };

  const getPartyFullName = (abbr: string) => {
    return PARTY_ABBREVIATIONS[abbr] || abbr;
  };

  // Calculate total votes for a result
  const getTotalVotes = (votes: Array<{ votes: number }>) => {
    return votes.reduce((sum, v) => sum + (v.votes || 0), 0);
  };

  // Check if using demo data
  const isUsingDemoData = results.length > 0 && results[0]?.id?.length < 5; // Simple heuristic

  return (
    <div className="space-y-6">
      {/* Demo data warning */}
      {isUsingDemoData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-600">Using demo data - Backend connection not available</p>
        </div>
      )}

      {/* Role-specific header */}
      <div className={`${roleBadge.bg} border rounded-lg p-4 flex items-center gap-3`}>
        <RoleIcon className={`h-5 w-5 ${roleBadge.text}`} />
        <div>
          <p className={`font-medium ${roleBadge.text}`}>
            {role === 'system' && 'System Admin View'}
            {role === 'situation' && 'Situation Room View'}
            {role === 'zone' && 'Zone Admin View'}
            {role === 'ward' && 'Ward Admin View'}
          </p>
          <p className="text-sm opacity-90">
            {description || `Viewing election results ${role === 'ward' ? 'in your ward' : 
              role === 'zone' ? 'in your zone' : 
              role === 'situation' ? 'across all zones' : 
              'across all wards and zones'}`}
          </p>
        </div>
      </div>

      {/* Header with search and stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="px-3 py-1">
              <FileText className="h-3 w-3 mr-1" /> Total: {filteredResults.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-yellow-50">
              <Clock className="h-3 w-3 mr-1" /> Pending: {pendingResults.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" /> Verified: {verifiedResults.length}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-red-50">
              <XCircle className="h-3 w-3 mr-1" /> Rejected: {rejectedResults.length}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {results.length === 0 ? 'No results found' : `Showing ${filteredResults.length} of ${results.length} results`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No results found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Polling Unit</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Submitted</TableHead>
                    {showWard && <TableHead>Ward</TableHead>}
                    {showZone && <TableHead>Zone</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Total Votes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => {
                    const isExpanded = expandedRows.has(result.id);
                    const totalVotes = getTotalVotes(result.votes || []);
                    const partyColors = result.votes?.map(v => getPartyColor(v.party)) || [];
                    
                    return (
                      <React.Fragment key={result.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleRowExpansion(result.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{result.pollingUnit || 'Unknown'}</TableCell>
                          <TableCell>{result.agent || 'Unknown'}</TableCell>
                          <TableCell>{formatDate(result.submittedAt)}</TableCell>
                          {showWard && <TableCell>{result.wardName || result.wardId || 'Unknown'}</TableCell>}
                          {showZone && <TableCell>{result.zoneName || result.zoneId || 'Unknown'}</TableCell>}
                          <TableCell>{getStatusBadge(result.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {totalVotes.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResult(result);
                                if (result.status === 'Pending') {
                                  setIsReviewDialogOpen(true);
                                } else {
                                  setIsViewDialogOpen(true);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {result.status === 'Pending' ? 'Review' : 'View'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded row with vote details */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={showWard && showZone ? 9 : showWard || showZone ? 8 : 7}>
                              <div className="p-4">
                                <h4 className="text-sm font-medium mb-3">Vote Breakdown by Party</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                  {(result.votes || []).map((vote, idx) => {
                                    const colors = getPartyColor(vote.party);
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`${colors.bg} ${colors.border} border rounded-lg p-3 text-center`}
                                      >
                                        <p className={`text-xs font-medium ${colors.text} mb-1`}>
                                          {vote.party}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate" title={getPartyFullName(vote.party)}>
                                          {getPartyFullName(vote.party).substring(0, 20)}
                                          {getPartyFullName(vote.party).length > 20 ? '...' : ''}
                                        </p>
                                        <p className="text-xl font-bold mt-1">{vote.votes?.toLocaleString() || 0}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-3 text-xs text-muted-foreground">
                                  Total: <span className="font-medium">{totalVotes.toLocaleString()}</span> votes from {(result.votes || []).length} parties
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog for Pending Results */}
      <Dialog open={isReviewDialogOpen && selectedResult !== null} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Review Election Result</DialogTitle>
            <DialogDescription>
              {selectedResult?.pollingUnit || 'Unknown'} - Submitted by {selectedResult?.agent || 'Unknown'} on {selectedResult && formatDate(selectedResult.submittedAt)}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 -mr-4 h-full overflow-y-auto">
            <div className="grid gap-6 py-4">
              {/* Result Image */}
              {selectedResult?.resultFileUrl ? (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                  <img 
                    src={selectedResult.resultFileUrl} 
                    alt="Result" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = 
                        '<div class="flex items-center justify-center h-full"><FileText class="h-16 w-16 text-muted-foreground" /></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Vote Counts */}
              <div className="space-y-3">
                <h4 className="font-medium">Vote Counts by Party</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(selectedResult?.votes || []).length > 0 ? (
                    (selectedResult?.votes || []).map((vote, idx) => {
                      const colors = getPartyColor(vote.party);
                      
                      return (
                        <div key={idx} className={`${colors.bg} ${colors.border} border rounded-lg p-4 text-center`}>
                          <p className={`text-sm font-semibold ${colors.text} mb-1`}>
                            {vote.party || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2 truncate" title={getPartyFullName(vote.party)}>
                            {getPartyFullName(vote.party)}
                          </p>
                          <p className="text-3xl font-bold">{vote.votes?.toLocaleString() || 0}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-4 text-muted-foreground">
                      No vote data available
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{selectedResult && getTotalVotes(selectedResult.votes || []).toLocaleString()}</span> votes
                </div>
              </div>

              {/* Review Comment Input */}
              <div className="space-y-2">
                <Label htmlFor="comment">Review Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Add your comments about this result..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 flex-shrink-0 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject Result
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog for Non-Pending Results */}
      <Dialog open={isViewDialogOpen && selectedResult !== null} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Election Result Details</DialogTitle>
            <DialogDescription>
              {selectedResult?.pollingUnit || 'Unknown'} - Submitted by {selectedResult?.agent || 'Unknown'} on {selectedResult && formatDate(selectedResult.submittedAt)}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 -mr-4 h-full overflow-y-auto">
            <div className="grid gap-6 py-4">
              {/* Result Image */}
              {selectedResult?.resultFileUrl ? (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                  <img 
                    src={selectedResult.resultFileUrl} 
                    alt="Result" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = 
                        '<div class="flex items-center justify-center h-full"><FileText class="h-16 w-16 text-muted-foreground" /></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Vote Counts */}
              <div className="space-y-3">
                <h4 className="font-medium">Vote Counts by Party</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(selectedResult?.votes || []).length > 0 ? (
                    (selectedResult?.votes || []).map((vote, idx) => {
                      const colors = getPartyColor(vote.party);
                      
                      return (
                        <div key={idx} className={`${colors.bg} ${colors.border} border rounded-lg p-4 text-center`}>
                          <p className={`text-sm font-semibold ${colors.text} mb-1`}>
                            {vote.party || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2 truncate" title={getPartyFullName(vote.party)}>
                            {getPartyFullName(vote.party)}
                          </p>
                          <p className="text-3xl font-bold">{vote.votes?.toLocaleString() || 0}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-4 text-muted-foreground">
                      No vote data available
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{selectedResult && getTotalVotes(selectedResult.votes || []).toLocaleString()}</span> votes
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div>{selectedResult && getStatusBadge(selectedResult.status)}</div>
              </div>

              {/* Review Comment (if any) */}
              {selectedResult?.reviewComment && (
                <div className="space-y-2">
                  <Label>Review Comment</Label>
                  <div className="p-4 bg-muted rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">{selectedResult.reviewComment}</p>
                    {selectedResult.reviewedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed on {formatDate(selectedResult.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 flex-shrink-0 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}