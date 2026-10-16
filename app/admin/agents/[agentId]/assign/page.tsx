"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';

export default function AssignAgentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [pollingUnits, setPollingUnits] = useState<PollingUnit[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setPollingUnits(units.pollingUnits);
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
    setSaving(true);
    try {
      await agentsApi.assignPollingUnit(agentId, selectedId);
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
                      pollingUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                          {unit.code ? ` (${unit.code})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
