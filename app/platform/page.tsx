// app/platform/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformHeader from '@/components/platform/PlatformHeader';
import PlatformStatsCards from '@/components/platform/PlatformStatsCards';
import TenantsTable from '@/components/platform/TenantsTable';
import { getPlatformToken, isPlatformTokenExpired } from '@/lib/platform/session';

export default function PlatformDashboard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // One client-side bounce to sign-in for an absent or expired token. Nothing is
  // fetched until it passes; otherwise the page would race two 401s against the
  // sign-in screen.
  useEffect(() => {
    const token = getPlatformToken();
    if (!token || isPlatformTokenExpired(token)) {
      window.location.href = '/platform/login';
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <PlatformHeader
        title="Platform Administration"
        subtitle="Manage the tenants running on this deployment"
      />
      <div className="space-y-6 p-4 md:p-6">
        <PlatformStatsCards />
        <TenantsTable />
      </div>
    </>
  );
}