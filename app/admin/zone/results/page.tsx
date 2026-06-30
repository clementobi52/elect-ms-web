// app/admin/zone/results/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Building2,
  MapPin,
  Globe,
  Users,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Mail,
  CheckCircle,
  Clock,
  Shield,
  FileText,
  BarChart3,
  Award,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  MapPin as MapPinIcon,
  Calendar,
  FileCheck,
  FileX,
  Download,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/AdminHeader';
import { resultsApi, Result, ResultStats } from '@/lib/api/results';

export default function ZoneResultsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWard, setFilterWard] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<ResultStats>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalVotes: 0,
    parties: [],
  });
  const [zoneName, setZoneName] = useState<string>('');

  // Fetch results and stats
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // Get results for this zone
      const resultsResponse = await resultsApi.getResultsByZone(user?.zoneId || '');
      
      console.log('📡 Results Response:', resultsResponse);
      
      if (resultsResponse.success && resultsResponse.results) {
        setResults(resultsResponse.results);
        
        // Calculate stats from the results data
        const resultList = resultsResponse.results;
        const newStats: ResultStats = {
          total: resultList.length,
          pending: resultList.filter(r => r.status?.toLowerCase() === 'pending').length,
          verified: resultList.filter(r => r.status?.toLowerCase() === 'verified').length,
          rejected: resultList.filter(r => r.status?.toLowerCase() === 'rejected').length,
          totalVotes: resultList.reduce((sum, r) => 
            sum + (r.votes?.reduce((vSum, v) => vSum + v.votes, 0) || 0), 0
          ),
          parties: [],
        };
        setStats(newStats);
      }

      // Set zone name from user
      if (user?.zoneName) {
        setZoneName(user.zoneName);
      } else {
        setZoneName('your zone');
      }
    } catch (error) {
      console.error('Error fetching zone results:', error);
      toast({
        title: "Error",
        description: "Failed to load results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData(false);
  };

  // Handle approve result
  const handleApprove = async () => {
    if (!selectedResult) return;
    
    setIsSubmitting(true);
    try {
      const response = await resultsApi.approveResult(selectedResult.id, reviewComment);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Result approved successfully",
        });
        setIsApproveDialogOpen(false);
        setReviewComment('');
        await fetchData(false);
      }
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
      const response = await resultsApi.rejectResult(selectedResult.id, reviewComment);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Result rejected successfully",
        });
        setIsRejectDialogOpen(false);
        setReviewComment('');
        await fetchData(false);
      }
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

  // Get unique wards for filter
  const uniqueWards = Array.from(new Set(results.map(r => r.wardName))).filter(Boolean);

  // Filter results
  const filteredResults = results.filter(result => {
    const matchesSearch =
      result.pollingUnitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.wardName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || result.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesWard = filterWard === 'all' || result.wardName === filterWard;

    return matchesSearch && matchesStatus && matchesWard;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case 'verified':
        return <Badge className="bg-green-500 text-white">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterWard('all');
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

  // Get status color for stats
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'text-yellow-600';
      case 'verified': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader 
          title="Zone Results"
          subtitle="Manage election results across all wards in your zone"
        />
        <div className="flex-1 container p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
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
        title="Zone Results"
        subtitle={`Manage election results across all wards in ${zoneName || 'your zone'}`}
      />

      <div className="flex-1 container p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Results</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.verified || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <FileX className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                  <p className="text-2xl font-bold">{stats.totalVotes || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search results by polling unit, agent, or ward..."
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
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {(filterStatus !== 'all' || filterWard !== 'all' || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>

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
              <div>
                <Label className="text-xs text-muted-foreground">Ward</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-md text-sm"
                  value={filterWard}
                  onChange={(e) => setFilterWard(e.target.value)}
                >
                  <option value="all">All Wards</option>
                  {uniqueWards.map((ward) => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Election Results</CardTitle>
              <CardDescription>
                {results.length === 0 ? 'No results found' :
                  `Showing ${filteredResults.length} of ${results.length} results`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No results found in your zone</p>
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
                      <TableHead>Ward</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => {
                      const totalVotes = result.votes?.reduce((sum, v) => sum + v.votes, 0) || 0;
                      
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-3 w-3 text-muted-foreground" />
                              {result.pollingUnitName}
                            </div>
                          </TableCell>
                          <TableCell>{result.wardName || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-3 w-3" />
                              {result.agentName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.status)}
                              {getStatusBadge(result.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {totalVotes} votes
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(result.submittedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedResult(result);
                                    setIsViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {result.status?.toLowerCase() === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedResult(result);
                                        setReviewComment('');
                                        setIsApproveDialogOpen(true);
                                      }}
                                      className="text-green-600"
                                    >
                                      <ThumbsUp className="h-4 w-4 mr-2" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedResult(result);
                                        setReviewComment('');
                                        setIsRejectDialogOpen(true);
                                      }}
                                      className="text-red-600"
                                    >
                                      <ThumbsDown className="h-4 w-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {result.resultFileUrl && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(result.resultFileUrl, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download File
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* View Result Dialog */}
        <Dialog open={isViewDialogOpen && selectedResult !== null} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Result Details
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnitName} - {selectedResult?.wardName}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {selectedResult && (
                <div className="space-y-4 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Polling Unit</Label>
                      <p className="font-medium">{selectedResult.pollingUnitName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ward</Label>
                      <p className="font-medium">{selectedResult.wardName || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Agent</Label>
                      <p className="font-medium">{selectedResult.agentName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedResult.status)}
                        {getStatusBadge(selectedResult.status)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Submitted</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedResult.submittedAt)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Votes</Label>
                      <p className="font-medium">
                        {selectedResult.votes?.reduce((sum, v) => sum + v.votes, 0) || 0}
                      </p>
                    </div>
                  </div>

                  {/* Vote Breakdown */}
                  <div>
                    <Label className="text-muted-foreground">Vote Breakdown</Label>
                    <div className="mt-2 space-y-2">
                      {selectedResult.votes && selectedResult.votes.length > 0 ? (
                        selectedResult.votes.map((vote, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              {vote.partyLogo && (
                                <img 
                                  src={vote.partyLogo} 
                                  alt={vote.partyName} 
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              )}
                              <span className="font-medium">{vote.partyName}</span>
                            </div>
                            <Badge variant="outline">{vote.votes} votes</Badge>
                          </div>
                        ))
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
              {selectedResult?.status?.toLowerCase() === 'pending' && (
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
                    <ThumbsUp className="h-4 w-4 mr-2" />
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
                    <ThumbsDown className="h-4 w-4 mr-2" />
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
                <ThumbsUp className="h-5 w-5 text-green-600" />
                Approve Result
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnitName} - {selectedResult?.wardName}
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
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ThumbsUp className="h-4 w-4 mr-2" />
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
                <ThumbsDown className="h-5 w-5 text-red-600" />
                Reject Result
              </DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnitName} - {selectedResult?.wardName}
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
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ThumbsDown className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Rejecting...' : 'Reject Result'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}