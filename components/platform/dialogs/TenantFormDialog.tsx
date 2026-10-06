// components/platform/dialogs/TenantFormDialog.tsx
"use client";

// Create and edit share one dialog because the fields are nearly identical and the
// difference is one immutable field. Merging them keeps the two forms from drifting
// (the classic result being two validators that disagree about what a slug is).

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  createTenant,
  createTenantUser,
  updateTenant,
  PlatformApiError,
  type PlatformTenant,
} from '@/lib/platform/api';
import { getPlatformToken } from '@/lib/platform/session';

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null for create, the tenant to edit otherwise. */
  tenant: PlatformTenant | null;
  onSuccess: () => void;
}

export const TenantFormDialog: React.FC<TenantFormDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}) => {
  const { toast } = useToast();
  const isEdit = Boolean(tenant);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('Active');
  const [error, setError] = useState('');

  const [createAdmin, setCreateAdmin] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(tenant?.name ?? '');
    setSlug(tenant?.slug ?? '');
    setDomain(tenant?.domain ?? '');
    setStatus(tenant?.status ?? 'Active');
    setError('');
    // Create defaults to provisioning the first admin (a new tenant is stranded
    // without one). Edit defaults to off so a routine rename never asks for
    // credentials or hits the password gate.
    setCreateAdmin(!isEdit);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
  }, [open, tenant]);

  const adminReady =
    !createAdmin ||
    (adminName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim()) && adminPassword.length >= 6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = getPlatformToken();
    if (!token) {
      setError('Your session has expired. Sign in again.');
      setLoading(false);
      return;
    }

    try {
      let tenantId = tenant?.id;
      let tenantSlug = tenant?.slug ?? null;
      let tenantName = name.trim();

      if (tenant) {
        const updated = await updateTenant(token, tenant.id, {
          name: name.trim(),
          domain: domain.trim() || null,
        });
        tenantName = updated.data.name;
      } else {
        const created = await createTenant(token, {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          domain: domain.trim() || undefined,
          status,
        });
        tenantId = created.data.id;
        tenantSlug = created.data.slug;
      }

      if (createAdmin && tenantId) {
        try {
          await createTenantUser(token, tenantId, {
            name: adminName.trim(),
            email: adminEmail.trim().toLowerCase(),
            password: adminPassword,
            role: 'System Admin',
          });
          toast({
            title: isEdit ? 'Tenant updated' : 'Tenant created',
            description: `${adminName.trim()} (${adminEmail.trim().toLowerCase()}) is now a System Admin for ${
              tenantSlug ?? tenantName
            }.`,
          });
        } catch (adminErr) {
          // The tenant change itself is saved. Do not keep the form open with
          // its error - resubmitting would collide on the slug (create) or
          // redo the rename (edit). Surface a direct tell and refresh so the
          // row appears and provisioning can be retried.
          console.error('Failed to provision the System Admin:', adminErr);
          toast({
            title: isEdit
              ? 'Tenant updated, but the System Admin was not'
              : 'Tenant created, but its System Admin was not',
            description:
              adminErr instanceof PlatformApiError
                ? adminErr.message
                : 'Failed to create the System Admin.',
            variant: 'destructive',
          });
          onOpenChange(false);
          onSuccess();
          return;
        }
      } else {
        toast({
          title: isEdit ? 'Success' : 'Tenant created',
          description: isEdit
            ? `${tenantName} updated.`
            : `${tenantName} is ready. Add a System Admin later from the tenant form.`,
        });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Failed to save the tenant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tenant' : 'Create tenant'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the display name and custom domain.'
              : 'A tenant is one client deployment. Its slug is the key every request resolves it by, and cannot be changed later.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Name</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Election Commission"
              required
              maxLength={255}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-slug">Slug</Label>
            <Input
              id="tenant-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="acme"
              required={!isEdit}
              disabled={isEdit}
              pattern="[a-z0-9][a-z0-9-]*"
              maxLength={63}
              className={isEdit ? 'opacity-60' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? 'Immutable. It resolves as acme.your-domain.com and as the X-Tenant-Slug header value, so changing it would strand every client.'
                : 'Lowercase letters, digits and hyphens. Becomes the subdomain, so it cannot be changed after creation.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-domain">Custom domain (optional)</Label>
            <Input
              id="tenant-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="elections.acme.gov"
            />
            <p className="text-xs text-muted-foreground">
              Used when the client brings their own hostname.
            </p>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="tenant-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="tenant-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A suspended tenant cannot sign in. Users in it get a 403 at the tenant
                middleware before any query runs.
              </p>
            </div>
          )}

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tenant-create-admin"
                  checked={createAdmin}
                  onCheckedChange={(v) => setCreateAdmin(Boolean(v))}
                />
                <Label htmlFor="tenant-create-admin" className="text-sm font-medium">
                  {isEdit ? 'Add a System Admin for this tenant' : 'Create the initial System Admin now'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Create an operator for an existing tenant from here. Useful for a first '
                    + 'login, or to restore access after every other account in the tenant is gone.'
                  : 'A tenant has no login until someone with the System Admin role exists, and nobody '
                    + 'inside the tenant can create that first one. Set the credentials here so the '
                    + 'client can sign in immediately.'}
              </p>

              {createAdmin && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Admin name</Label>
                    <Input
                      id="admin-name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Acme Admin"
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@acme.gov"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The password is shown to no one after save. Keep a note of where it was
                    sent, because it cannot be recovered - only reset.
                  </p>
                </div>
              )}
            </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || (!isEdit && !slug.trim()) || !adminReady}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};