"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AdminIndexPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect based on user role
      switch (user.role) {
        case ROLES.WARD_ADMIN:
          router.replace('/admin/ward');
          break;
        case ROLES.ZONE_ADMIN:
          router.replace('/admin/zone');
          break;
        case ROLES.SITUATION_ROOM:
          router.replace('/admin/situation-room');
          break;
        case ROLES.SYSTEM_ADMIN:
          router.replace('/admin/system');
          break;
        default:
          router.replace('/login');
      }
    } else if (!isLoading && !isAuthenticated) {
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
