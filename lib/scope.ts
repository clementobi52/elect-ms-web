// lib/scope.ts
//
// Resolves the geographic scope an admin manages from their own assignment.
// The zone pages predate LGA and State Admin and read `user.zoneId` inline; they
// now read this instead so the same page tree serves all three scoped roles.
// The backend mirrors this with middlewares/scope.js: /admin/state/:id/... and
// /admin/lga/:id/... are the same generic handlers as /admin/zone/:zoneId/*.

import { ROLES, getRoleKey } from './types';

export type ScopeKind = 'state' | 'lga' | 'ward' | 'zone';

export interface AdminScope {
  kind: 'state' | 'lga' | 'ward' | 'zone';
  id: string;
  // e.g. '/admin/state'
  basePath: string;
  label: string;
}

export function resolveAdminScope(user: any): AdminScope | null {
  if (!user) return null;

  // Role arrives as either the display string ("State Admin") or the key
  // ("state_admin") depending on the source, so normalise before switching.
  switch (getRoleKey(user.role)) {
    case ROLES.STATE_ADMIN:
      return user.stateId
        ? { kind: 'state', id: user.stateId, basePath: '/admin/state', label: user.stateName || 'State' }
        : null;
    case ROLES.LGA_ADMIN:
      return user.lgaId
        ? { kind: 'lga', id: user.lgaId, basePath: '/admin/lga', label: user.lgaName || 'LGA' }
        : null;
    case ROLES.WARD_ADMIN:
      return user.wardId
        ? { kind: 'ward', id: user.wardId, basePath: '/admin/ward', label: user.wardName || 'Ward' }
        : null;
    case ROLES.ZONE_ADMIN:
      return user.zoneId
        ? { kind: 'zone', id: user.zoneId, basePath: '/admin/zone', label: user.zoneName || 'Zone' }
        : null;
    default:
      return null;
  }
}

/** The `/admin/{kind}/{id}` API prefix for a scope, or null when there is none. */
export function scopeApiBase(scope: AdminScope | null): string | null {
  return scope ? `/admin/${scope.kind}/${scope.id}` : null;
}
