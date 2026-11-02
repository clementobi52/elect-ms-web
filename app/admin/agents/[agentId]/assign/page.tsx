"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { agentsApi, Agent } from '@/lib/api/agents';
import { pollingUnitsApi, PollingUnit } from '@/lib/api/pollingUnits';
import { ArrowLeft, Loader2, MapPin, AlertTriangle } from 'lucide-react';

export default function AssignAgentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentsByPu, setAgentsByPu] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await agentsApi.getAgentById(agentId);
      setAgent(result.agent);
      setSelectedId(result.agent.pollingUnitId || '');

      const units = await pollingUnitsApi.getPollingUnits(
        undefined,
        result.agent.wardId || undefined,
        result.agent.zoneId || undefined
      );
      setPollingUnits(units.pollingUnits || []);

      try {
        const all = await agentsApi.getAllAgents();
        const map: Record<string, number> = {};
        (all.agents || []).forEach((a: any) => {
          if (a.pollingUnitId) {
            map[a.pollingUnitId] = (map[a.pollingUnitId] || 0) + 1;
          }
        });
        setAgentsByPu(map);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async () => {
    if (!selectedId) {
      toast({
        title: 'Select a polling unit',
        description: 'Choose the polling unit to assign this agent to.',
        variant: 'destructive',
      });
      return;
    }

    const count = agentsByPu[selectedId] || 0;
    const currentPu = agent?.pollingUnitId;
    if (count > 0 && selectedId !== currentPu) {
      const ok = window.confirm('This polling unit already has agents assigned. Do you want to assign another agent to it?');
      if (!ok) return;
    }

    setSaving(true);
    try {
      await agentsApi.assignPollingUnit(agentId, selectedId, reason || undefined);
      toast({ title: 'Agent assigned', description: 'The polling unit was updated.' });
      router.push(`/admin/agents/${agentId}`);
    } catch (err) {
      toast({
        title: 'Assignment failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader
        title="Assign Agent"
        subtitle={agent ? agent.name : 'Loading agent…'}
      />
      <div className="flex-1 p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Polling Unit</CardTitle>
            <CardDescription>
              {agent?.wardName
                ? `Polling units in ${agent.wardName}`
                : 'Choose the polling unit this agent should report from.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <>
                {agent?.pollingUnitName && (
                  <p className="text-sm text-muted-foreground">
                    Currently assigned to <span className="font-medium">{agent.pollingUnitName}</span>
                  </p>
                )}
                <Select value={selectedId} onValueChange={setSelectedId} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a polling unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {pollingUnits.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No polling units available
                      </div>
                    ) : (
                      pollingUnits.map((unit) => {
                        const c = agentsByPu[unit.id] || 0;
                        const isCurrent = agent?.pollingUnitId === unit.id;
                        return (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                            {unit.code ? ` (${unit.code})` : ''}
                            {c > 0 && !isCurrent ? ` • ${c} agent${c === 1 ? '' : 's'}` : ''}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>

                {selectedId && agentsByPu[selectedId] > 0 && agent?.pollingUnitId !== selectedId ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>This polling unit already has {agentsByPu[selectedId]} agent(s) assigned.</span>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Input
                    id="reason"
                    placeholder="e.g. Illness, coverage, shortage"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <Button onClick={handleAssign} disabled={saving || !selectedId}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  Assign
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
