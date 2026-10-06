// components/platform/TenantsTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { TenantFormDialog } from './dialogs/TenantFormDialog';
import { GeoScopeDialog } from './dialogs/GeoScopeDialog';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import {
  deleteTenant,
  fetchTenants,
  PlatformApiError,
  setTenantStatus,
  type PlatformTenant,
  type Pagination,
} from '@/lib/platform/api';
import { getPlatformToken, clearPlatformSession } from '@/lib/platform/session';

type StatusFilter = 'all' | 'Active' | 'Suspended';
type PendingAction =
  | { kind: 'suspend'; tenant: PlatformTenant }
  | { kind: 'activate'; tenant: PlatformTenant }
  | { kind: 'delete'; tenant: PlatformTenant }
  | null;

const EMPTY_PAGINATION: Pagination = { page: 1, limit: 50, total: 0, totalPages: 1 };

export default function TenantsTable() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformTenant | null>(null);
  const [scopeTenant, setScopeTenant] = useState<PlatformTenant | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    setLoading(true);
    const token = getPlatformToken();
    if (!token) {
      // An expired token would otherwise show as a list of failed requests. Send
      // them to sign in instead of pretending the platform has no tenants.
      clearPlatformSession();
      window.location.href = '/platform/login';
      return;
    }

    try {
      const res = await fetchTenants(token, {
        page,
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setTenants(res.data);
      setPagination(res.pagination);
    } catch (err) {
      if (err instanceof PlatformApiError && err.status === 401) {
        clearPlatformSession();
        window.location.href = '/platform/login';
        return;
      }
      toast({
        title: 'Error',
        description: err instanceof PlatformApiError ? err.message : 'Failed to load tenants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // Debounced so typing does not fire a request per keystroke. 300ms is enough to
  // collapse a word without the list feeling stuck.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAction = async () => {
    if (!pending) return;
    setActionError('');
    const token = getPlatformToken();
    if (!token) {
      setActionError('Your session has expired. Sign in again.');
      return;
    }

    try {
      if (pending.kind === 'delete') {
        await deleteTenant(token, pending.tenant.id);
        toast({
          title: 'Tenant deleted',
          description: `${pending.tenant.name} and its data have been removed.`,
        });
      } else {
        const next = pending.kind === 'suspend' ? 'Suspended' : 'Active';
        await setTenantStatus(token, pending.tenant.id, next);
        toast({
          title: next === 'Suspended' ? 'Tenant suspended' : 'Tenant reactivated',
          description:
            next === 'Suspended'
              ? `${pending.tenant.name} users can no longer sign in.`
              : `${pending.tenant.name} can sign in again.`,
        });
      }
      setPending(null);
      load();
    } catch (err) {
      // Kept in the dialog rather than a toast: the delete refusal explains the
      // remedy ("suspend it instead") and that needs to stay on screen next to
      // the button that triggers it.
      setActionError(err instanceof PlatformApiError ? err.message : 'The action failed.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (tenant: PlatformTenant) => {
    setEditing(tenant);
    setFormOpen(true);
  };

  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  const confirmCopy = useMemo(() => {
    if (!pending) return null;
    if (pending.kind === 'delete') {
      const hasUsers = (pending.tenant.userCount ?? 0) > 0;
      return {
        title: `Delete ${pending.tenant.name}?`,
        description: hasUsers ? (
          <>
            This tenant still has{' '}
            <strong>{pending.tenant.userCount} user(s)</strong>. Deleting it would
            fail, because those accounts belong to it. Remove or reassign them
            first, or{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => setPending({ kind: 'suspend', tenant: pending.tenant })}
            >
              suspend the tenant instead
            </button>
            , which cuts off access without destroying anything.
          </>
        ) : (
          <>
            This permanently removes <strong>{pending.tenant.name}</strong> and
            everything in it: users, zones, wards, polling units, results and
            incidents. It cannot be undone.
          </>
        ),
        confirmLabel: hasUsers ? 'Delete anyway' : 'Delete permanently',
        destructive: true,
      };
    }
    if (pending.kind === 'suspend') {
      return {
        title: `Suspend ${pending.tenant.name}?`,
        description: (
          <>
            Its {pending.tenant.userCount ?? 0} user(s) will be refused at sign-in
            and every request from this tenant returns 403. No data is removed,
            and you can reactivate it at any time.
          </>
        ),
        confirmLabel: 'Suspend tenant',
        destructive: false,
      };
    }
    return {
      title: `Reactivate ${pending.tenant.name}?`,
      description: <>Its users will be able to sign in again immediately.</>,
      confirmLabel: 'Reactivate',
      destructive: false,
    };
  }, [pending]);

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or slug"
                className="pl-8"
                aria-label="Search tenants"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New tenant
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      ) : (
                        <Building2 className="h-6 w-6" aria-hidden />
                      )}
                      <p className="text-sm font-medium">
                        {search || statusFilter !== 'all'
                          ? 'No tenants match this filter'
                          : 'No tenants yet'}
                      </p>
                      {!search && statusFilter === 'all' ? (
                        <p className="text-xs">Create the first one to get started.</p>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tenant.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.domain || <span className="italic">subdomain</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        {tenant.userCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'Active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Geographic scope"
                          onClick={() => setScopeTenant(tenant)}
                        >
                          <MapPin className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEdit(tenant)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={tenant.status === 'Active' ? 'Suspend' : 'Reactivate'}
                          onClick={() =>
                            setPending({
                              kind: tenant.status === 'Active' ? 'suspend' : 'activate',
                              tenant,
                            })
                          }
                        >
                          <Power className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPending({ kind: 'delete', tenant })}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.total > 0 ? (
          <div className="mt-4 flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Showing {startItem}-{endItem} of {pagination.total} tenant
              {pagination.total === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={pagination.page === 1}
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination.page === pagination.totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenant={editing}
        onSuccess={load}
      />

      <GeoScopeDialog
        open={scopeTenant !== null}
        onOpenChange={(open) => {
          if (!open) setScopeTenant(null);
        }}
        tenant={scopeTenant}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setActionError('');
          }
        }}
        title={confirmCopy?.title ?? ''}
        description={
          <>
            {confirmCopy?.description}
            {actionError ? (
              <p className="mt-3 rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {actionError}
              </p>
            ) : null}
          </>
        }
        confirmLabel={confirmCopy?.confirmLabel ?? 'Confirm'}
        destructive={confirmCopy?.destructive ?? true}
        onConfirm={handleAction}
      />
    </Card>
  );
}