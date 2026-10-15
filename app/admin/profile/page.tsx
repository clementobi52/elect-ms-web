"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AdminHeader from '@/components/admin/AdminHeader';
import { useToast } from '@/components/ui/use-toast';
import { withTenantHeaders } from '@/lib/tenant';
import { API_BASE_URL } from '@/lib/config';
import { Loader2, User as UserIcon, Mail, AtSign, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form once the provider has hydrated the user. Keyed on the id so a
  // background refresh of the same user does not clobber what is being typed.
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
    }
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: withTenantHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ name: name.trim(), username: username.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // The provider reads the user from localStorage on mount, so write the
      // server's copy back rather than merging client-side guesses.
      const stored = localStorage.getItem('user');
      const merged = { ...(stored ? JSON.parse(stored) : {}), ...data.user };
      localStorage.setItem('user', JSON.stringify(merged));

      toast({
        title: 'Profile updated',
        description: 'Your profile changes have been saved.',
      });
      // Reload so the header and sidebar pick up the new name immediately.
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      toast({
        title: 'Error',
        description: err.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <AdminHeader title="My Profile" subtitle="Manage your personal details" />

      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500">
                    Update your display name and username
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="profileName" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5" />
                  Full Name
                </label>
                <input
                  id="profileName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="profileUsername" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <AtSign className="h-3.5 w-3.5" />
                  Username
                </label>
                <input
                  id="profileUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="optional, e.g., john.doe"
                  autoComplete="off"
                  className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400">
                  Lowercase letters, numbers, dot, underscore or hyphen (3-30). You can sign in with your username instead of your email. Clear it to remove it.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span>{user?.role}</span>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end bg-gray-50 rounded-b-lg">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center h-10 px-5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
