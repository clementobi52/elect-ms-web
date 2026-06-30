// app/admin/ward/[wardId]/results/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  XCircle as AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

interface Result {
  id: string;
  pollingUnitId?: string;
  pollingUnit: string;
  wardId?: string;
  agentId?: string;
  agent: string;
  submittedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  votes: Vote[];
  resultFileUrl?: string;
  reviewComment?: string;
}

interface Vote {
  partyId: string;
  party: string;
  partyLogo?: string;
  votes: number;
}

export default function WardResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const wardId = params.wardId as string;

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wardName, setWardName] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalVotes: 0,
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Fetch results
  const fetchResults = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch all results for this ward
      const response = await fetch(`${API_BASE_URL}/admin/ward/${wardId}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setResults(data);

      // Calculate stats
      const totalVotes = data.reduce((sum: number, r: Result) => 
        sum + r.votes.reduce((vSum: number, v: Vote) => vSum + v.votes, 0), 0
      );

      setStats({
        total: data.length,
        pending: data.filter((r: Result) => r.status === 'Pending').length,
        verified: data.filter((r: Result) => r.status === 'Verified').length,
        rejected: data.filter((r: Result) => r.status === 'Rejected').length,
        totalVotes,
      });

      // Also fetch ward name
      const wardResponse = await fetch(`${API_BASE_URL}/admin/wards/${wardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (wardResponse.ok) {
        const wardData = await wardResponse.json();
        setWardName(wardData.name);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to load results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wardId, toast]);

  // Initial load
  useEffect(() => {
    if (wardId) {
      fetchResults(true);
    }
  }, [wardId, fetchResults]);

  // Handle refresh
  const handleRefresh = () => {
    fetchResults(false);
  };

  // Handle approve result
  const handleApprove = async () => {
    if (!selectedResult) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${selectedResult.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: reviewComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve result');
      }

      toast({
        title: "Success",
        description: "Result approved successfully",
      });

      setIsApproveDialogOpen(false);
      setReviewComment('');
      await fetchResults(false);
    } catch (error) {
      console.error('Error approving result:', error);
      toast({
        title: "Error",
        description: "Failed to approve result",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reject result
  const handleReject = async () => {
    if (!selectedResult) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${selectedResult.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: reviewComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject result');
      }

      toast({
        title: "Success",
        description: "Result rejected successfully",
      });

      setIsRejectDialogOpen(false);
      setReviewComment('');
      await fetchResults(false);
    } catch (error) {
      console.error('Error rejecting result:', error);
      toast({
        title: "Error",
        description: "Failed to reject result",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-green-500 text-white">Verified</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (date: string) => {
    if (!date) return 'Unknown';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  // Filter results
  const filteredResults = results.filter(result => {
    const matchesSearch =
      result.pollingUnit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.agent?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || result.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Ward Results" 
          subtitle="Loading election results..."
        />
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Ward Results" 
        subtitle={`Viewing election results for ${wardName || 'Ward'}`}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Link href={`/admin/ward/${wardId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ward
            </Button>
          </Link>
          <div className="flex-1" />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Results</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search results by polling unit or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {(filterStatus !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <select
                className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Election Results</CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {filteredResults.length} of {results.length} results
                {stats.totalVotes > 0 && (
                  <span className="ml-2">• Total Votes: {stats.totalVotes.toLocaleString()}</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No results found</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No results match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Votes</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => {
                      const totalVotes = result.votes.reduce((sum, v) => sum + v.votes, 0);
                      
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.pollingUnit}</TableCell>
                          <TableCell>{result.agent}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.status)}
                              {getStatusBadge(result.status)}
                            </div>
                          </TableCell>
                          <TableCell>{totalVotes.toLocaleString()}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(result.submittedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedResult(result);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {result.status === 'Pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => {
                                      setSelectedResult(result);
                                      setReviewComment('');
                                      setIsApproveDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedResult(result);
                                      setReviewComment('');
                                      setIsRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Result Dialog */}
      <Dialog open={isViewDialogOpen && selectedResult !== null} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Result Details
            </DialogTitle>
            <DialogDescription>
              {selectedResult?.pollingUnit} - {selectedResult?.agent}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedResult && (
              <div className="space-y-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Polling Unit</Label>
                    <p className="font-medium">{selectedResult.pollingUnit}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Agent</Label>
                    <p className="font-medium">{selectedResult.agent}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedResult.status)}
                      {getStatusBadge(selectedResult.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Submitted</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedResult.submittedAt)}
                    </p>
                  </div>
                </div>

                {/* Vote Breakdown */}
                <div>
                  <Label className="text-muted-foreground">Vote Breakdown</Label>
                  <div className="mt-2 space-y-3">
                    {selectedResult.votes && selectedResult.votes.length > 0 ? (
                      selectedResult.votes.map((vote, index) => {
                        const totalVotes = selectedResult.votes.reduce((sum, v) => sum + v.votes, 0);
                        const percentage = totalVotes > 0 ? Math.round((vote.votes / totalVotes) * 100) : 0;
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {vote.partyLogo && (
                                  <img 
                                    src={vote.partyLogo} 
                                    alt={vote.party} 
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                )}
                                <span className="font-medium">{vote.party}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{vote.votes.toLocaleString()}</span>
                                <span className="text-sm text-muted-foreground">({percentage}%)</span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No votes recorded</p>
                    )}
                  </div>
                </div>

                {/* Review Comment */}
                {selectedResult.reviewComment && (
                  <div>
                    <Label className="text-muted-foreground">Review Comment</Label>
                    <p className="text-sm mt-1 p-3 bg-blue-50 rounded-lg whitespace-pre-wrap">
                      {selectedResult.reviewComment}
                    </p>
                  </div>
                )}

                {/* Result File */}
                {selectedResult.resultFileUrl && (
                  <div>
                    <Label className="text-muted-foreground">Result File</Label>
                    <Button
                      variant="outline"
                      className="mt-1"
                      onClick={() => window.open(selectedResult.resultFileUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            {selectedResult?.status === 'Pending' && (
              <>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    setReviewComment('');
                    setIsApproveDialogOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    setReviewComment('');
                    setIsRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen && selectedResult !== null} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Result
            </DialogTitle>
            <DialogDescription>
              {selectedResult?.pollingUnit} - {selectedResult?.agent}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-comment">Review Comment (Optional)</Label>
              <Textarea
                id="approve-comment"
                placeholder="Add any notes about this approval..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                This will mark the result as verified and finalize it.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Approving...' : 'Approve Result'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen && selectedResult !== null} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Result
            </DialogTitle>
            <DialogDescription>
              {selectedResult?.pollingUnit} - {selectedResult?.agent}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Reason for Rejection</Label>
              <Textarea
                id="reject-comment"
                placeholder="Please provide a reason for rejecting this result..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                A comment is required to reject a result.
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                This action cannot be undone. The agent will need to resubmit.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !reviewComment.trim()}
              variant="destructive"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Rejecting...' : 'Reject Result'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}