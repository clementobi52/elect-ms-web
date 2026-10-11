// hooks/useAdminScope.ts
"use client";

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { resolveAdminScope, scopeApiBase, type AdminScope } from '@/lib/scope';

/**
 * The admin's own scope plus the `/admin/{kind}/{id}` API prefix derived from it.
 * `scope` is null for roles with no geographic scope (System / Situation Room).
 */
export function useAdminScope() {
  const { user } = useAuth();
  const scope: AdminScope | null = useMemo(() => resolveAdminScope(user), [user]);
  const apiBase: string | null = useMemo(() => scopeApiBase(scope), [scope]);
  return { scope, apiBase, scopeId: scope?.id ?? null, kind: scope?.kind ?? null };
}
