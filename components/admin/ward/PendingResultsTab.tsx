"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { FileText, Eye, XCircle, CheckCircle, Filter, User, Clock } from 'lucide-react';
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
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Pending Results for Review
              {results.length > 0 && (
                <Badge variant="secondary">{results.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Review and approve election results from your polling unit</CardDescription>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => {
              const sortedVotes = [...(result.votes || [])].sort((a, b) => b.votes - a.votes);
              const topVotes = sortedVotes.slice(0, 3);
              const remaining = sortedVotes.length - topVotes.length;
              const totalVotes = sortedVotes.reduce((sum, vote) => sum + vote.votes, 0);

              return (
                <Card key={result.id} className="group flex flex-col overflow-hidden">
                  <div className="relative h-32 w-full bg-muted">
                    {result.resultFileUrl ? (
                      <img
                        src={result.resultFileUrl}
                        alt={`Result for ${result.pollingUnit}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                        onClick={() => window.open(result.resultFileUrl, '_blank')}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <FileText className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                    <Badge className="absolute left-2 top-2 bg-yellow-500 text-white">
                      Pending
                    </Badge>
                    <Badge variant="secondary" className="absolute right-2 top-2 bg-background/90 text-xs">
                      {totalVotes} votes
                    </Badge>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-3">
                    <div className="space-y-1">
                      <h4 className="truncate text-sm font-semibold" title={result.pollingUnit}>
                        {result.pollingUnit}
                      </h4>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{result.agent}</span>
                        <span className="mx-0.5">•</span>
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatDate(result.submittedAt)}</span>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {topVotes.map((vote, idx) => {
                        const partyLogo = getPartyLogo(vote.party);

                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-1.5">
                              {partyLogo ? (
                                <img src={partyLogo} alt="" className="h-4 w-4 shrink-0 rounded-full" />
                              ) : (
                                <span className="h-4 w-4 shrink-0 rounded-full bg-muted" />
                              )}
                              <span className="truncate">{vote.party}</span>
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">{vote.votes}</span>
                          </div>
                        );
                      })}
                      {remaining > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          +{remaining} more {remaining === 1 ? 'party' : 'parties'}
                        </p>
                      )}
                    </div>

                    <Dialog open={isReviewDialogOpen && selectedResult?.id === result.id} onOpenChange={(open) => {
                      setIsReviewDialogOpen(open);
                      if (open) setSelectedResult(result);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="mt-auto w-full">
                          <Eye className="h-4 w-4 mr-1.5" />
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
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
