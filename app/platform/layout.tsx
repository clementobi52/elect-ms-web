// app/platform/layout.tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Flag, LayoutDashboard, LogOut, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPlatformToken, getPlatformUser, isPlatformTokenExpired, clearPlatformSession } from '@/lib/platform/session';

const navItems = [
  { name: 'Dashboard', href: '/platform', icon: LayoutDashboard },
  { name: 'Tenants', href: '/platform', icon: Building2 },
  { name: 'Parties', href: '/platform/parties', icon: Flag },
  { name: 'Geography', href: '/platform/geography', icon: MapPin },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const user = getPlatformUser();

  useEffect(() => {
    if (pathname === '/platform/login') {
      setChecked(true);
      return;
    }
    const token = getPlatformToken();
    if (!token || isPlatformTokenExpired(token)) {
      window.location.href = '/platform/login';
      return;
    }
    setChecked(true);
  }, [pathname]);

  const handleSignOut = () => {
    clearPlatformSession();
    window.location.href = '/platform/login';
  };

  const initials = (user?.name || user?.email || 'PA')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (pathname === '/platform/login') {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r bg-white overflow-y-auto">
          <div className="flex items-center h-16 px-6 border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Shield className="h-4 w-4" aria-hidden />
              </div>
              <span className="text-lg font-semibold">Elect-MS</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">Platform Admin</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
