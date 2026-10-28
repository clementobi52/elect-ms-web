"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformHeader from '@/components/platform/PlatformHeader';
import PartiesManagement from '@/components/platform/parties/PartiesManagement';
import { getPlatformToken, isPlatformTokenExpired } from '@/lib/platform/session';

export default function PlatformPartiesPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

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
        title="Party Management"
        subtitle="Manage political parties globally"
      />
      <div className="p-4 md:p-6">
        <PartiesManagement />
      </div>
    </>
  );
}
