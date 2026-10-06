// components/platform/dialogs/GeoScopeDialog.tsx
"use client";

// The per-tenant geographic scope editor.
//
// A tenant's scope is a list of anchors - states, LGAs, wards or polling units -
// that the server expands into a subtree. Everything the tenant can see has to
// be inside that subtree; a tenant with no anchors sees everything (fail-open,
// the pre-scope behaviour). The platform reads the current anchors, edits the
// list, and saves it in full: the PUT replaces the whole scope, so removing a
// row here widens the tenant's view and adding one narrows it.
//
// The picker walks the reference geography a level at a time (states →
// LGAs → wards → polling units), loading each level's children from the
// platform catalog endpoints. Only the level being added is revealed, so the
// form never offers a ward before its LGA has been chosen.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchTenantGeoScope,
  fetchGeoStates,
  fetchGeoLgas,
  fetchGeoWards,
  fetchGeoPollingUnits,
  saveTenantGeoScope,
  clearTenantGeoScope,
  PlatformApiError,
  type PlatformTenant,
  type GeoScopeLevel,
  type GeoScopeRow,
  type GeoOption,
} from '@/lib/platform/api';
import { getPlatformToken } from '@/lib/platform/session';
import { ConfirmDialog } from './ConfirmDialog';
import { Loader2, MapPin, Plus, RotateCcw, Trash2 } from 'lucide-react';

interface GeoScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: PlatformTenant | null;
  onSaved?: () => void;
}

const LEVELS: Array<{ value: GeoScopeLevel; label: string }> = [
  { value: 'state', label: 'State' },
  { value: 'lga', label: 'LGA' },
  { value: 'ward', label: 'Ward' },
  { value: 'polling_unit', label: 'Polling unit' },
];

const LEVEL_LABEL: Record<GeoScopeLevel, string> = {
  state: 'State',
  lga: 'LGA',
  ward: 'Ward',
  polling_unit: 'Polling unit',
};

/** "Mbanasa · Abuja Municipal · FCT" — the place, then its ancestors. */
function rowSummary(row: GeoScopeRow): string {
  const parts = [row.label];
  if (row.ward?.name) parts.push(row.ward.name);
  if (row.lga?.name) parts.push(row.lga.name);
  if (row.state?.name) parts.push(row.state.name);
  return parts.filter(Boolean).join(' · ');
}

/** A row whose label could not be resolved still shows its id, never a blank. */
function rowLabel(row: GeoScopeRow): string {
  return row.label && row.label.trim() ? row.label.trim() : row.geoId;
}

export const GeoScopeDialog: React.FC<GeoScopeDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onSaved,
}) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [scope, setScope] = useState<GeoScopeRow[]>([]);
  const [error, setError] = useState('');

  // Picker state.
  const [level, setLevel] = useState<GeoScopeLevel>('state');
  const [parentState, setParentState] = useState('');
  const [parentLga, setParentLga] = useState('');
  const [parentWard, setParentWard] = useState('');
  const [anchorId, setAnchorId] = useState('');

  const [states, setStates] = useState<GeoOption[]>([]);
  const [lgas, setLgas] = useState<GeoOption[]>([]);
  const [wards, setWards] = useState<GeoOption[]>([]);
  const [units, setUnits] = useState<GeoOption[]>([]);
  const [catalogError, setCatalogError] = useState('');

  const existingKeys = useMemo(
    () => new Set(scope.map((r) => `${r.level}:${r.geoId}`)),
    [scope]
  );

  useEffect(() => {
    if (!open || !tenant) return;
    const token = getPlatformToken();
    if (!token) {
      setError('Your session has expired. Sign in again.');
      return;
    }

    setLoading(true);
    setError('');
    setScope([]);
    setStates([]);
    setLgas([]);
    setWards([]);
    setUnits([]);
    setLevel('state');
    setParentState('');
    setParentLga('');
    setParentWard('');
    setAnchorId('');
    setCatalogError('');

    // The states list tops every cascade, so it is loaded with the scope.
    Promise.all([fetchTenantGeoScope(token, tenant.id), fetchGeoStates(token)])
      .then(([scopeRes, statesRes]) => {
        setScope(scopeRes.data.scope);
        setStates(statesRes.data);
      })
      .catch((err) => {
        setError(
          err instanceof PlatformApiError
            ? err.message
            : 'Failed to load the tenant’s scope.'
        );
      })
      .finally(() => setLoading(false));
  }, [open, tenant]);

  // Splitting the cascade: every parent list loads once its parent is chosen,
  // so opening a level never ships the whole country at once.
  useEffect(() => {
    if (!parentState) {
      setLgas([]);
      return;
    }
    const token = getPlatformToken();
    if (!token) return;
    let cancelled = false;
    fetchGeoLgas(token, parentState)
      .then((res) => {
        if (!cancelled) setLgas(res.data);
      })
      .catch(() => {
        if (!cancelled) setCatalogError('Failed to load LGAs.');
      });
    return () => {
      cancelled = true;
    };
  }, [parentState]);

  useEffect(() => {
    if (!parentLga) {
      setWards([]);
      return;
    }
    const token = getPlatformToken();
    if (!token) return;
    let cancelled = false;
    fetchGeoWards(token, parentLga)
      .then((res) => {
        if (!cancelled) setWards(res.data);
      })
      .catch(() => {
        if (!cancelled) setCatalogError('Failed to load wards.');
      });
    return () => {
      cancelled = true;
    };
  }, [parentLga]);

  useEffect(() => {
    if (!parentWard) {
      setUnits([]);
      return;
    }
    const token = getPlatformToken();
    if (!token) return;
    let cancelled = false;
    fetchGeoPollingUnits(token, parentWard)
      .then((res) => {
        if (!cancelled) setUnits(res.data);
      })
      .catch(() => {
        if (!cancelled) setCatalogError('Failed to load polling units.');
      });
    return () => {
      cancelled = true;
    };
  }, [parentWard]);

  const resetHigher = (when: GeoScopeLevel) => {
    setParentState('');
    setParentLga('');
    setParentWard('');
    setAnchorId('');
    setCatalogError('');
  };

  const handleLevelChange = (next: GeoScopeLevel) => {
    setLevel(next);
    resetHigher(next);
  };

  const candidateOptions: GeoOption[] =
    level === 'state'
      ? states
      : level === 'lga'
        ? lgas
        : level === 'ward'
          ? wards
          : units;

  const addNeedsState = level !== 'state';
  const addNeedsLga = level === 'ward' || level === 'polling_unit';
  const addNeedsWard = level === 'polling_unit';

  const addDisabled =
    !candidateOptions.length || !anchorId || (addNeedsWard && !parentWard);

  const handleAdd = () => {
    if (!addDisabled) {
      const key = `${level}:${anchorId}`;
      if (existingKeys.has(key)) {
        toast({ title: 'Already in scope', description: 'That place is already an anchor.' });
        return;
      }
      const label = candidateOptions.find((o) => o.id === anchorId)?.name ?? null;
      setScope(
        (prev) => [...prev, { level, geoId: anchorId, label }].sort(
          (a, b) => LEVELS.findIndex((l) => l.value === a.level) - LEVELS.findIndex((l) => l.value === b.level)
        )
      );
      setAnchorId('');
    }
  };

  const handleRemove = (geoId: string) => {
    setScope((prev) => prev.filter((r) => r.geoId !== geoId));
  };

  const handleReset = async () => {
    if (!tenant) return;
    setResetOpen(false);
    setSaving(true);
    setError('');
    const token = getPlatformToken();
    if (!token) {
      setError('Your session has expired. Sign in again.');
      setSaving(false);
      return;
    }

    try {
      const res = await clearTenantGeoScope(token, tenant.id);
      setScope(res.data.scope);
      toast({
        title: 'Scope reset',
        description: 'This tenant now sees every state again.',
      });
    } catch (e) {
      setError(e instanceof PlatformApiError ? e.message : 'Failed to reset the scope.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!tenant || scope.length === 0) return;
    setSaving(true);
    setError('');
    const token = getPlatformToken();
    if (!token) {
      setError('Your session has expired. Sign in again.');
      setSaving(false);
      return;
    }

    try {
      await saveTenantGeoScope(
        token,
        tenant.id,
        scope.map((r) => ({ level: r.level, geoId: r.geoId }))
      );
      toast({
        title: 'Scope saved',
        description: `${tenant.name} is now limited to ${scope.length} anchor${
          scope.length === 1 ? '' : 's'
        }.`,
      });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Failed to save the geographic scope.'
      );
    } finally {
      setSaving(false);
    }
  };

  const parentStateLabel = states.find((s) => s.id === parentState)?.name ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Geographic scope — {tenant?.name}</DialogTitle>
          <DialogDescription>
            The places this tenant can see. Anything outside the scope is hidden
            from its users; removing every anchor makes it see all of Nigeria.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : (
          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {/* ---- Current anchors ---- */}
            {scope.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No anchors yet. The tenant currently sees every state. Add at
                least one anchor to restrict it.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Anchors ({scope.length})</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || saving}
                    onClick={() => setResetOpen(true)}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Reset
                  </Button>
                </div>
                <ScrollArea className="max-h-52">
                  <div className="space-y-1.5 pr-3">
                    {scope.map((row) => {
                      const key = `${row.level}:${row.geoId}`;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-2 rounded-md border bg-card p-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Badge variant="secondary" className="shrink-0">
                              {LEVEL_LABEL[row.level]}
                            </Badge>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {rowLabel(row)}
                              </div>
                              {rowSummary(row) !== rowLabel(row) ? (
                                <div className="truncate text-xs text-muted-foreground">
                                  {rowSummary(row)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            title={`Remove ${rowLabel(row)}`}
                            onClick={() => handleRemove(row.geoId)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  Saving replaces the whole list. To widen the tenant’s view,
                  remove anchors — an anchor covers every place under it.
                </p>
              </div>
            )}

            {/* ---- Add an anchor ---- */}
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">Add an anchor</p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Level
                  </label>
                  <Select value={level} onValueChange={handleLevelChange}>
                    <SelectTrigger className="w-44" aria-label="Anchor level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {addNeedsState ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      State
                    </label>
                    <Select
                      value={parentState}
                      onValueChange={(v) => {
                        setParentState(v);
                        setParentLga('');
                        setParentWard('');
                        setAnchorId('');
                      }}
                    >
                      <SelectTrigger className="w-48" aria-label="Parent state">
                        <SelectValue placeholder="Choose a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {addNeedsLga ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      LGA
                    </label>
                    <Select
                      value={parentLga}
                      onValueChange={(v) => {
                        setParentLga(v);
                        setParentWard('');
                        setAnchorId('');
                      }}
                      disabled={!parentState}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue
                          placeholder={parentState ? 'Choose an LGA' : 'Choose a state first'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {lgas.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {addNeedsWard ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Ward
                    </label>
                    <Select
                      value={parentWard}
                      onValueChange={(v) => {
                        setParentWard(v);
                        setAnchorId('');
                      }}
                      disabled={!parentLga}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue
                          placeholder={parentLga ? 'Choose a ward' : 'Choose an LGA first'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="min-w-48 flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {LEVEL_LABEL[level]}
                  </label>
                  <Select value={anchorId} onValueChange={setAnchorId} disabled={!candidateOptions.length}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          !candidateOptions.length
                            ? 'Choose the parent first'
                            : `Choose the ${LEVEL_LABEL[level].toLowerCase()} to anchor`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {candidateOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAdd} disabled={addDisabled}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Add
                </Button>
              </div>

              {parentStateLabel && addNeedsState ? (
                <p className="text-xs text-muted-foreground">
                  Anchoring in {parentStateLabel}.
                </p>
              ) : null}

              {catalogError ? (
                <Alert variant="destructive">
                  <AlertDescription>{catalogError}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            {scope.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Saving is disabled while the list is empty — an empty scope is
                  the ‘see everything’ state and is only the result of someone
                  removing every row. Add an anchor first.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving || scope.length === 0}>
            {saving ? 'Saving...' : 'Save scope'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset this tenant's geographic scope?"
        description={
          <p>
            Removing every anchor returns <strong>{tenant?.name ?? 'this tenant'}</strong>{' '}
            to seeing <strong>every state</strong> in the country. Use this only when the
            tenant should no longer be restricted.
          </p>
        }
        confirmLabel="Reset to everything"
        onConfirm={handleReset}
      />
    </Dialog>
  );
};