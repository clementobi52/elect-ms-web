"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ROLES, getRoleKey } from '@/lib/types';
import AdminSidebar from '@/components/admin/AdminSidebar';

// Role to default dashboard mapping
const ROLE_DASHBOARD: Record<string, string> = {
  [ROLES.WARD_ADMIN]: '/admin/ward',
  [ROLES.ZONE_ADMIN]: '/admin/zone',
  [ROLES.LGA_ADMIN]: '/admin/lga',
  [ROLES.STATE_ADMIN]: '/admin/state',
  [ROLES.SITUATION_ROOM]: '/admin/situation',
  [ROLES.SYSTEM_ADMIN]: '/admin/system',
};

// System Admin can access ALL admin routes
const SYSTEM_ADMIN_PATHS = [
  '/admin/ward',
  '/admin/zone',
  '/admin/lga',
  '/admin/state',
  '/admin/situation',
  '/admin/system',
  '/admin/wards',
  '/admin/zones',
  '/admin/live',
  '/admin/analytics',
  '/admin/reports',
  '/admin/users',
  '/admin/settings',
  '/admin/polling-units',
  '/admin/agents',
  '/admin/results',
  '/admin/incidents',
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Polling agents should not access admin panel
if (user && getRoleKey(user.role) === ROLES.POLLING_AGENT) {
          router.push('/unauthorized');
          return;
        }

        // A Platform Admin belongs to no tenant, so every page under /admin is
        // the wrong page for them - they have no zones, wards or polling units.
        // Sending them to their own area is clearer than an unauthorized page,
        // and their token is refused by the /api routes anyway.
        if (user && getRoleKey(user.role) === ROLES.PLATFORM_ADMIN) {
          router.push('/platform');
          return;
        }

      // Handle role-based routing
      if (user) {
        const role = getRoleKey(user.role);

        // SYSTEM ADMIN: Allow access to ALL admin routes
        if (role === ROLES.SYSTEM_ADMIN) {
          // System Admin can access everything, no restrictions
          return;
        }

        // For other roles, check if they have access to the current path
        const isWardPath = pathname.startsWith('/admin/ward');
        const isZonePath = pathname.startsWith('/admin/zone');
        const isLgaPath = pathname.startsWith('/admin/lga');
        const isStatePath = pathname.startsWith('/admin/state');
        const isSituationPath = pathname.startsWith('/admin/situation');
        const isSystemPath = pathname.startsWith('/admin/system');
        const isWardsPath = pathname.startsWith('/admin/wards');
        const isZonesPath = pathname.startsWith('/admin/zones');
        const isLivePath = pathname.startsWith('/admin/live');
        const isAnalyticsPath = pathname.startsWith('/admin/analytics');
        const isReportsPath = pathname.startsWith('/admin/reports');

        // Shared (geographically scoped) sub-pages served by the zone route tree
        const sharedScopedPages =
          pathname === '/admin/polling-units' ||
          pathname === '/admin/agents' ||
          pathname === '/admin/results' ||
          pathname === '/admin/incidents';

        // Role-based access control
        if (role === ROLES.WARD_ADMIN) {
          // Ward Admin can only access /admin/ward/* and shared routes
          const allowed = isWardPath || sharedScopedPages;

          if (!allowed) {
            router.push('/admin/ward');
          }
        }
        else if (role === ROLES.ZONE_ADMIN) {
          // Zone Admin can access zone, ward, and shared routes
          const allowed = isZonePath || isWardPath || isWardsPath ||
                         isAnalyticsPath || isReportsPath || sharedScopedPages;

          if (!allowed) {
            router.push('/admin/zone');
          }
        }
        else if (role === ROLES.LGA_ADMIN) {
          // LGA Admin can access lga, zone, ward, and shared routes
          const allowed = isLgaPath || isZonePath || isWardPath || isWardsPath ||
                         isAnalyticsPath || isReportsPath || sharedScopedPages;

          if (!allowed) {
            router.push('/admin/lga');
          }
        }
        else if (role === ROLES.STATE_ADMIN) {
          // State Admin can access state, lga, zone, ward, and shared routes
          const allowed = isStatePath || isLgaPath || isZonePath || isWardPath ||
                         isWardsPath || isAnalyticsPath || isReportsPath ||
                         sharedScopedPages;

          if (!allowed) {
            router.push('/admin/state');
          }
        }
        else if (role === ROLES.SITUATION_ROOM) {
          // Situation Room can access most routes except system admin
          const allowed = isSituationPath || isStatePath || isLgaPath || isZonePath ||
                         isWardPath || isWardsPath || isZonesPath || isLivePath ||
                         isAnalyticsPath || isReportsPath || sharedScopedPages;

          if (!allowed) {
            router.push('/admin/situation-room');
          }
        }

        // Redirect from base admin path to role-specific dashboard
        if (pathname === '/admin') {
          const dashboard = ROLE_DASHBOARD[user.role] || '/admin/ward';
          router.push(dashboard);
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

// PLATFORM_ADMIN is here for the same reason POLLING_AGENT is: the effect above
    // is asynchronous, and without this the admin shell renders for a frame
    // before the redirect fires.
    if (
      !isAuthenticated ||
      !user ||
      getRoleKey(user.role) === ROLES.POLLING_AGENT ||
      getRoleKey(user.role) === ROLES.PLATFORM_ADMIN
    ) {
      return null;
    }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
}