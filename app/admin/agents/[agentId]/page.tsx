"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { agentsApi, Agent } from '@/lib/api/agents';
import {
  ArrowLeft,
  AtSign,
  Mail,
  MapPin,
  Building2,
  Map,
  Wifi,
  WifiOff,
  Clock,
  FileText,
  AlertTriangle,
  RefreshCw,
  Landmark,
} from 'lucide-react';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function timeAgo(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '—';
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    if (!agentId) return;
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await agentsApi.getAgentById(agentId);
      setAgent(result.agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const online = agent?.status === 'Online';

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader
        title="Agent Details"
        subtitle={agent ? agent.name : 'Loading agent…'}
      />
      <div className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={() => load()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : agent ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" /> Email
                    </span>
                    <span className="font-medium">{agent.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <AtSign className="h-4 w-4" /> Username
                    </span>
                    <span className="font-medium">{agent.username || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={online ? 'default' : 'secondary'} className="gap-1">
                      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {agent.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" /> Zone
                    </span>
                    <span className="font-medium">{agent.zoneName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Landmark className="h-4 w-4" /> Ward
                    </span>
                    <span className="font-medium">{agent.wardName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> Polling Unit
                    </span>
                    <span className="font-medium text-right">
                      {agent.pollingUnitName || 'Unassigned'}
                    </span>
                  </div>
                  {agent.pollingUnitCode && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">PU Code</span>
                      <span className="font-medium">{agent.pollingUnitCode}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" /> Last active
                    </span>
                    <span className="font-medium">{timeAgo(agent.lastActive)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" /> Results submitted
                    </span>
                    <span className="font-medium">{agent.resultsSubmitted ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" /> Incidents reported
                    </span>
                    <span className="font-medium">{agent.incidentsReported ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Joined</span>
                    <span className="font-medium">{formatDate(agent.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Last known location</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {agent.location ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Map className="h-4 w-4" /> Coordinates
                        </span>
                        <span className="font-medium">
                          {agent.location.latitude.toFixed(5)}, {agent.location.longitude.toFixed(5)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps?q=${agent.location!.latitude},${agent.location!.longitude}`,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                      >
                        <Map className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No location reported yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
