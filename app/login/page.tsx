"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// These match your backend roles EXACTLY
const ADMIN_ROLES = [
  'Ward Admin',
  'Zone Admin', 
  'Situation Room Admin',
  'System Admin',
] as const;

type AdminRole = typeof ADMIN_ROLES[number];

function LoginForm() {
  const router = useRouter();
  const { signIn, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Check if user has admin role
      if (ADMIN_ROLES.includes(user.role as any)) {
        // Redirect based on role
        switch (user.role) {
          case 'Ward Admin':
            router.push('/admin/ward');
            break;
          case 'Zone Admin':
            router.push('/admin/zone');
            break;
          case 'Situation Room Admin':
            router.push('/admin/situation-room');
            break;
          case 'System Admin':
            router.push('/admin/system');
            break;
          default:
            router.push('/admin/dashboard');
        }
      } else {
        // User is not an admin - sign them out
        console.log('Non-admin user detected:', user.role);
        // You might want to call signOut here if needed
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      // Redirect is handled by the useEffect above
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login for testing - updated to match backend roles
  const handleDemoLogin = async (role: AdminRole) => {
    setError('');
    setIsLoading(true);

    // Map demo roles to actual credentials
    const demoCredentials: Record<AdminRole, { email: string; password: string }> = {
      'Ward Admin': { email: 'wardadmin@example.com', password: 'Admin123!' },
      'Zone Admin': { email: 'zoneadmin1@example.com', password: 'Admin123!' },
      'Situation Room Admin': { email: 'situation@example.com', password: 'Admin123!' },
      'System Admin': { email: 'admin@example.com', password: 'Admin123!' },
    };

    const creds = demoCredentials[role];
    if (creds) {
      try {
        await signIn(creds.email, creds.password);
      } catch (err: any) {
        setError(err.message);
      }
    }
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Election Monitor</h1>
          <p className="text-muted-foreground">Admin Portal</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Admin Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo Login Buttons - Using actual backend roles */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Demo Access (using actual database users)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin('Ward Admin')}
                  disabled={isLoading}
                >
                  Ward Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin('Zone Admin')}
                  disabled={isLoading}
                >
                  Zone Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin('Situation Room Admin')}
                  disabled={isLoading}
                >
                  Situation Room
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin('System Admin')}
                  disabled={isLoading}
                >
                  System Admin
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Password for all demo accounts: <span className="font-mono">Admin123!</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure access for election monitoring administrators
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}