// components/platform/PlatformHeader.tsx
"use client";

// Its own header rather than the shared AdminHeader, for one reason: AdminHeader
// reads `useAuth()`, the tenant auth context. A Platform Admin is not in that
// context - they have no tenant and their token lives in lib/platform/session.ts -
// so the shared header would render as signed out over a working session.

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getPlatformUser, clearPlatformSession } from '@/lib/platform/session';

interface PlatformHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PlatformHeader({ title, subtitle, actions }: PlatformHeaderProps) {
  const router = useRouter();
  const user = getPlatformUser();

  const initials = (user?.name || user?.email || 'PA')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
    clearPlatformSession();
    // Full navigation rather than a client push: the page behind this one reads
    // the session on mount, and a back/forward cache entry could otherwise
    // re-render it with a token that is already gone.
    window.location.href = '/platform/login';
  };

  return (
    <header className="border-b bg-white">
      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{title}</h1>
              {/* Makes the scope unambiguous. An operator looking at a screen of
                  tenant names should never wonder whether this is the platform or
                  one tenant's admin area. */}
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" aria-hidden />
                Platform
              </Badge>
            </div>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actions}
          <div className="flex items-center gap-2 border-l pl-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-sm leading-tight sm:block">
              <div className="font-medium">{user?.name || user?.email}</div>
              <div className="text-xs text-muted-foreground">Platform Admin</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}