// app/platform/login/page.tsx
"use client";

// Its own sign-in page, not the tenant one in app/login.
//
// The tenant login resolves a tenant, sends X-Tenant-Slug, and stores its token in
// the auth context. A Platform Admin has no tenant and their token belongs in
// lib/platform/session.ts. Sharing the form would mean either sending a tenant
// header that makes the server treat them as the wrong kind of request, or
// storing a platform token where tenant pages would read it.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { platformLogin, PlatformApiError } from '@/lib/platform/api';
import {
  clearPlatformSession,
  getPlatformToken,
  isPlatformTokenExpired,
  savePlatformSession,
} from '@/lib/platform/session';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already signed in? Skip the form. The expiry check matters here: a stale token
  // would render the form anyway and then fail every request behind it.
  React.useEffect(() => {
    const token = getPlatformToken();
    if (token && !isPlatformTokenExpired(token)) {
      router.replace('/platform');
    } else if (token) {
      clearPlatformSession();
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await platformLogin(email, password);
      savePlatformSession(res.token, res.user);
      // Full navigation: /platform reads the session on mount, and a client-side
      // push can render it before the store is readable in some hydration orders.
      window.location.href = '/platform';
    } catch (err) {
      // One message for a wrong password and a non-existent account, because the
      // server sends one - showing "no such platform admin" would let someone
      // enumerate which addresses hold the role.
      setError(err instanceof PlatformApiError ? err.message : 'Sign-in failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Shield className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle>Platform Administration</CardTitle>
          <CardDescription>
            Sign in with a Platform Admin account to manage tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-email">Email</Label>
              <Input
                id="platform-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform-password">Password</Label>
              <Input
                id="platform-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}