"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Search, CheckCircle, XCircle, Clock, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface ElectionResult {
  id: string;
  pollingUnit: string;
  agent: string;
  submittedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  resultFileUrl?: string;
  votes: Array<{ party: string; votes: number }>;
}

export default function ResultsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<ElectionResult | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchResults();
  }, [user]);

  const fetchResults = async () => {
    if (!user?.wardId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/ward/${user.wardId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        // If endpoint doesn't exist yet, use demo data
        const demoResults: ElectionResult[] = [
          {
            id: '1',
            pollingUnit: 'Polling Unit 1',
            agent: 'Agent John',
            submittedAt: new Date().toISOString(),
            status: 'Pending',
            resultFileUrl: 'https://example.com/result1.jpg',
            votes: [
              { party: 'APC', votes: 150 },
              { party: 'PDP', votes: 120 },
              { party: 'LP', votes: 80 }
            ]
          },
          {
            id: '2',
            pollingUnit: 'Polling Unit 2',
            agent: 'Agent Jane',
            submittedAt: new Date().toISOString(),
            status: 'Verified',
            resultFileUrl: 'https://example.com/result2.jpg',
            votes: [
              { party: 'APC', votes: 180 },
              { party: 'PDP', votes: 90 },
              { party: 'LP', votes: 110 }
            ]
          },
          {
            id: '3',
            pollingUnit: 'Polling Unit 3',
            agent: 'Agent Mike',
            submittedAt: new Date().toISOString(),
            status: 'Rejected',
            resultFileUrl: 'https://example.com/result3.jpg',
            votes: [
              { party: 'APC', votes: 120 },
              { party: 'PDP', votes: 150 },
              { party: 'LP', votes: 60 }
            ]
          }
        ];
        setResults(demoResults);
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
    }
  };

  const handleApprove = async (resultId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/approve`, {
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

      // Update local state
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, status: 'Verified' } : r
      ));
      
      setIsReviewDialogOpen(false);
      setReviewComment('');
      setSelectedResult(null);
    } catch (error) {
      console.error('Error approving result:', error);
      toast({
        title: "Error",
        description: "Failed to approve result",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (resultId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/admin/results/${resultId}/reject`, {
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
        description: "Result rejected",
      });

      // Update local state
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, status: 'Rejected' } : r
      ));
      
      setIsReviewDialogOpen(false);
      setReviewComment('');
      setSelectedResult(null);
    } catch (error) {
      console.error('Error rejecting result:', error);
      toast({
        title: "Error",
        description: "Failed to reject result",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPartyLogo = (partyName: string) => {
    // This would be replaced with actual party logo lookup
    return null;
  };

  const filteredResults = results.filter(result => 
    result.pollingUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.agent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingResults = filteredResults.filter(r => r.status === 'Pending');
  const verifiedResults = filteredResults.filter(r => r.status === 'Verified');
  const rejectedResults = filteredResults.filter(r => r.status === 'Rejected');

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminHeader title="Election Results" subtitle="Loading results..." />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        title="Election Results" 
        subtitle={`View all election results in your ward`}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Header with search and stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
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

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Results ({filteredResults.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingResults.length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedResults.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedResults.length})</TabsTrigger>
          </TabsList>

          {/* All Results Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Election Results</CardTitle>
                    <CardDescription>Complete list of all results in your ward</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.pollingUnit}</TableCell>
                        <TableCell>{result.agent}</TableCell>
                        <TableCell>{format(new Date(result.submittedAt), 'MMM d, h:mm a')}</TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.votes.length} parties</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={isViewDialogOpen && selectedResult?.id === result.id} onOpenChange={(open) => {
                            setIsViewDialogOpen(open);
                            if (open) setSelectedResult(result);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                              <DialogHeader className="flex-shrink-0">
                                <DialogTitle>Review Election Result</DialogTitle>
                                <DialogDescription>
                                  {result.pollingUnit} - Submitted by {result.agent}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <ScrollArea className="flex-1 pr-4 -mr-4 h-full overflow-y-auto">
                                <div className="grid gap-4 py-4">
                                  {result.resultFileUrl ? (
                                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                      <img 
                                        src={result.resultFileUrl} 
                                        alt="Result" 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                      <FileText className="h-16 w-16 text-muted-foreground" />
                                    </div>
                                  )}
                                  
                                  <div className="space-y-2">
                                    <h4 className="font-medium">Vote Counts</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                      {result.votes.map((vote, idx) => {
                                        const partyLogo = getPartyLogo(vote.party);
                                        
                                        return (
                                          <div key={idx} className="p-3 bg-muted rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                              {partyLogo && (
                                                <img src={partyLogo} alt="" className="w-5 h-5 rounded-full" />
                                              )}
                                              <p className="text-sm font-medium text-muted-foreground">
                                                {vote.party}
                                              </p>
                                            </div>
                                            <p className="text-2xl font-bold">{vote.votes}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {result.status === 'Pending' && (
                                    <div className="space-y-2">
                                      <Label htmlFor="comment">Review Comment</Label>
                                      <Textarea
                                        id="comment"
                                        placeholder="Add a comment (optional)"
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        rows={3}
                                      />
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>

                              <DialogFooter className="gap-2 flex-shrink-0 pt-4 border-t mt-4">
                                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                  Close
                                </Button>
                                {result.status === 'Pending' && (
                                  <>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => {
                                        setIsViewDialogOpen(false);
                                        setIsReviewDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                    <Button 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        handleApprove(result.id);
                                        setIsViewDialogOpen(false);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                  </>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Results Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Results</CardTitle>
                <CardDescription>Results awaiting your review</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.pollingUnit}</TableCell>
                        <TableCell>{result.agent}</TableCell>
                        <TableCell>{format(new Date(result.submittedAt), 'MMM d, h:mm a')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.votes.length} parties</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedResult(result);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verified Results Tab */}
          <TabsContent value="verified">
            <Card>
              <CardHeader>
                <CardTitle>Verified Results</CardTitle>
                <CardDescription>Results that have been approved</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifiedResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.pollingUnit}</TableCell>
                        <TableCell>{result.agent}</TableCell>
                        <TableCell>{format(new Date(result.submittedAt), 'MMM d, h:mm a')}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejected Results Tab */}
          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Results</CardTitle>
                <CardDescription>Results that have been rejected</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Polling Unit</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Rejected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.pollingUnit}</TableCell>
                        <TableCell>{result.agent}</TableCell>
                        <TableCell>{format(new Date(result.submittedAt), 'MMM d, h:mm a')}</TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Dialog for Pending Results */}
        <Dialog open={isReviewDialogOpen && selectedResult !== null} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Review Election Result</DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnit} - Submitted by {selectedResult?.agent}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 pr-4 -mr-4 h-full overflow-y-auto">
              <div className="grid gap-4 py-4">
                {selectedResult?.resultFileUrl ? (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={selectedResult.resultFileUrl} 
                      alt="Result" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium">Vote Counts</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedResult?.votes.map((vote, idx) => {
                      const partyLogo = getPartyLogo(vote.party);
                      
                      return (
                        <div key={idx} className="p-3 bg-muted rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {partyLogo && (
                              <img src={partyLogo} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <p className="text-sm font-medium text-muted-foreground">
                              {vote.party}
                            </p>
                          </div>
                          <p className="text-2xl font-bold">{vote.votes}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Review Comment</Label>
                  <Textarea
                    id="comment"
                    placeholder="Add a comment (optional)"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 flex-shrink-0 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedResult && handleReject(selectedResult.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => selectedResult && handleApprove(selectedResult.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog for Non-Pending Results */}
        <Dialog open={isViewDialogOpen && selectedResult !== null && selectedResult.status !== 'Pending'} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Election Result Details</DialogTitle>
              <DialogDescription>
                {selectedResult?.pollingUnit} - Submitted by {selectedResult?.agent}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 pr-4 -mr-4 h-full overflow-y-auto">
              <div className="grid gap-4 py-4">
                {selectedResult?.resultFileUrl ? (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={selectedResult.resultFileUrl} 
                      alt="Result" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium">Vote Counts</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedResult?.votes.map((vote, idx) => {
                      const partyLogo = getPartyLogo(vote.party);
                      
                      return (
                        <div key={idx} className="p-3 bg-muted rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {partyLogo && (
                              <img src={partyLogo} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <p className="text-sm font-medium text-muted-foreground">
                              {vote.party}
                            </p>
                          </div>
                          <p className="text-2xl font-bold">{vote.votes}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>{selectedResult && getStatusBadge(selectedResult.status)}</div>
                </div>
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
    </div>
  );
}