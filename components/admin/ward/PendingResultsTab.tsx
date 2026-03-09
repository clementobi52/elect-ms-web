"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { FileText, Eye, XCircle, CheckCircle, Filter } from 'lucide-react';
import { PendingResult, Party } from '@/lib/types/ward-admin';

interface PendingResultsTabProps {
  results: PendingResult[];
  parties: Record<string, Party>;
  onApprove: (resultId: string, comment: string) => Promise<void>;
  onReject: (resultId: string, comment: string) => Promise<void>;
  formatDate: (date: string) => string;
  getInitials: (name: string) => string;
}

export function PendingResultsTab({ 
  results, 
  parties, 
  onApprove, 
  onReject, 
  formatDate,
  getInitials 
}: PendingResultsTabProps) {
  const [selectedResult, setSelectedResult] = useState<PendingResult | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const handleApprove = async () => {
    if (selectedResult) {
      await onApprove(selectedResult.id, reviewComment);
      setIsReviewDialogOpen(false);
      setReviewComment('');
      setSelectedResult(null);
    }
  };

  const handleReject = async () => {
    if (selectedResult) {
      await onReject(selectedResult.id, reviewComment);
      setIsReviewDialogOpen(false);
      setReviewComment('');
      setSelectedResult(null);
    }
  };

  const getPartyLogo = (partyName: string) => {
    return Object.values(parties).find(p => p.name === partyName)?.logoUrl;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pending Results for Review</CardTitle>
            <CardDescription>Review and approve election results from your polling units</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending results found
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => (
              <Card key={result.id} className="overflow-hidden">
                {/* Thumbnail Image */}
                <div className="aspect-video bg-muted relative">
                  {result.resultFileUrl ? (
                    <img 
                      src={result.resultFileUrl} 
                      alt={`Result for ${result.pollingUnit}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(result.resultFileUrl, '_blank')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
                      <FileText className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-yellow-500">
                    Pending
                  </Badge>
                </div>
                
                <CardContent className="p-4">
                  <h4 className="font-semibold">{result.pollingUnit}</h4>
                  <p className="text-sm text-muted-foreground">Submitted by {result.agent}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(result.submittedAt)}</p>
                  
                  <div className="mt-3 space-y-1">
                    {result.votes.map((vote, idx) => {
                      const partyLogo = getPartyLogo(vote.party);
                      
                      return (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            {partyLogo && (
                              <img src={partyLogo} alt="" className="w-4 h-4 rounded-full" />
                            )}
                            {vote.party}
                          </span>
                          <span className="font-medium">{vote.votes}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Dialog open={isReviewDialogOpen && selectedResult?.id === result.id} onOpenChange={(open) => {
                      setIsReviewDialogOpen(open);
                      if (open) setSelectedResult(result);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" />
                          Review
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
                          <Button variant="destructive" onClick={handleReject}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}