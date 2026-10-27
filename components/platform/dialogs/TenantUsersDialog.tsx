// components/platform/dialogs/TenantUsersDialog.tsx
"use client";

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
import { useToast } from '@/components/ui/use-toast';
import {
  createTenantUser,
  type PlatformTenant,
  type ProvisionedUser,
  PlatformApiError,
} from '@/lib/platform/api';
import { getPlatformToken } from '@/lib/platform/session';
import { Loader2, UserPlus } from 'lucide-react';

interface TenantUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: PlatformTenant | null;
}

const ROLES = [
  { value: 'System Admin', label: 'System Admin' },
  { value: 'Situation Room Admin', label: 'Situation Room Admin' },
  { value: 'State Admin', label: 'State Admin' },
  { value: 'LGA Admin', label: 'LGA Admin' },
  { value: 'Zone Admin', label: 'Zone Admin' },
  { value: 'Ward Admin', label: 'Ward Admin' },
  { value: 'Polling Agent', label: 'Polling Agent' },
] as const;

export const TenantUsersDialog: React.FC<TenantUsersDialogProps> = ({
  open,
  onOpenChange,
  tenant,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('System Admin');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPassword('');
      setRole('System Admin');
      setError('');
    }
  }, [open]);

  const handleCreate = async () => {
    if (!tenant) return;
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email and password are required.');
      return;
    }

    setLoading(true);
    const token = getPlatformToken();
    if (!token) {
      setError('Your session has expired. Sign in again.');
      setLoading(false);
      return;
    }

    try {
      const res = await createTenantUser(token, tenant.id, {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role: role as any,
      });
      toast({
        title: 'User created',
        description: `${res.data.email} added to ${tenant.name}.`,
      });
      setName('');
      setEmail('');
      setPassword('');
    } catch (e) {
      setError(e instanceof PlatformApiError ? e.message : 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Users — {tenant?.name}</DialogTitle>
          <DialogDescription>
            Create a login user for this tenant. They can sign in on the tenant&apos;s login page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-name">Full Name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prince"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prince@gmail.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">Password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="12345678"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Close
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
