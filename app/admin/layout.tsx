"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/types';
import AdminSidebar from '@/components/admin/AdminSidebar';

// Role to default dashboard mapping
const ROLE_DASHBOARD: Record<string, string> = {
  'Ward Admin': '/admin/ward',
  'Zone Admin': '/admin/zone', // You'll need to create this
  'Situation Room Admin': '/admin/situation', // You'll need to create this
  'System Admin': '/admin/system', // You'll need to create this
};

// System Admin can access ALL admin routes
const SYSTEM_ADMIN_PATHS = [
  '/admin/ward',
  '/admin/zone',
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
      if (user && user.role === ROLES.POLLING_AGENT) {
        router.push('/unauthorized');
        return;
      }

      // Handle role-based routing
      if (user) {
        // SYSTEM ADMIN: Allow access to ALL admin routes
        if (user.role === 'System Admin') {
          // System Admin can access everything, no restrictions
          return;
        }

        // For other roles, check if they have access to the current path
        const isWardPath = pathname.startsWith('/admin/ward');
        const isZonePath = pathname.startsWith('/admin/zone');
        const isSituationPath = pathname.startsWith('/admin/situation');
        const isSystemPath = pathname.startsWith('/admin/system');
        const isWardsPath = pathname.startsWith('/admin/wards');
        const isZonesPath = pathname.startsWith('/admin/zones');
        const isLivePath = pathname.startsWith('/admin/live');
        const isAnalyticsPath = pathname.startsWith('/admin/analytics');
        const isReportsPath = pathname.startsWith('/admin/reports');

        // Role-based access control
        if (user.role === 'Ward Admin') {
          // Ward Admin can only access /admin/ward/* and shared routes
          const allowed = isWardPath || 
                         pathname === '/admin/polling-units' ||
                         pathname === '/admin/agents' ||
                         pathname === '/admin/results' ||
                         pathname === '/admin/incidents';
          
          if (!allowed) {
            router.push('/admin/ward');
          }
        }
        else if (user.role === 'Zone Admin') {
          // Zone Admin can access zone, ward, and shared routes
          const allowed = isZonePath || isWardPath || isWardsPath || 
                         isAnalyticsPath || isReportsPath ||
                         pathname === '/admin/polling-units' ||
                         pathname === '/admin/agents' ||
                         pathname === '/admin/results' ||
                         pathname === '/admin/incidents';
          
          if (!allowed) {
            router.push('/admin/zone');
          }
        }
        else if (user.role === 'Situation Room Admin') {
          // Situation Room can access most routes except system admin
          const allowed = isSituationPath || isZonePath || isWardPath || 
                         isWardsPath || isZonesPath || isLivePath || 
                         isAnalyticsPath || isReportsPath ||
                         pathname === '/admin/polling-units' ||
                         pathname === '/admin/agents' ||
                         pathname === '/admin/results' ||
                         pathname === '/admin/incidents';
          
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

  if (!isAuthenticated || !user || user.role === ROLES.POLLING_AGENT) {
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