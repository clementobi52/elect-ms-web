"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLES, getRoleKey } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    switch (getRoleKey(user.role)) {
      case ROLES.WARD_ADMIN:
        router.replace('/admin/ward');
        break;
      case ROLES.ZONE_ADMIN:
        router.replace('/admin/zone');
        break;
      case ROLES.LGA_ADMIN:
        router.replace('/admin/lga');
        break;
      case ROLES.STATE_ADMIN:
        router.replace('/admin/state');
        break;
      case ROLES.SITUATION_ROOM:
        router.replace('/admin/situation-room');
        break;
      case ROLES.SYSTEM_ADMIN:
        router.replace('/admin/system');
        break;
      case ROLES.PLATFORM_ADMIN:
        router.replace('/platform');
        break;
      default:
        router.replace('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
