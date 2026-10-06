// components/platform/PlatformStatsCards.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Building2, Loader2, Shield, UserCheck, Users, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPlatformStats, PlatformApiError, type PlatformStats } from '@/lib/platform/api';
import { getPlatformToken } from '@/lib/platform/session';

// Kept separate from the table so the two can load independently: a slow stats
// endpoint should not delay the list, and a stats failure should not blank the
// table an operator came to read.
export default function PlatformStatsCards() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const token = getPlatformToken();
      if (!token) return;
      try {
        const res = await fetchPlatformStats(token);
        if (!cancelled) setStats(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof PlatformApiError ? err.message : 'Failed to load platform stats'
          );
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const cards = [
    { title: 'Tenants', value: stats?.totalTenants, icon: Building2, hint: 'all tenants' },
    {
      title: 'Active',
      value: stats?.activeTenants,
      icon: UserCheck,
      hint: 'can sign in',
    },
    {
      title: 'Suspended',
      value: stats?.suspendedTenants,
      icon: Ban,
      hint: 'refused at sign-in',
    },
    {
      title: 'Tenant users',
      value: stats?.totalTenantUsers,
      icon: Users,
      hint: 'across all tenants',
    },
    {
      title: 'Platform admins',
      value: stats?.platformAdmins,
      icon: Shield,
      hint: 'tenant-less accounts',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ title, value, icon: Icon, hint }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {value === undefined ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}