// lib/platform/api.ts
//
// HTTP client for the platform (super-admin) area.
//
// Separate from lib/api/client.ts on purpose, not for tidiness. A Platform Admin
// has no tenant: their user row has no tenantId and their token carries no
// tenant claim, so:
//
//   - The tenant header must NOT be sent. The server rejects a tenant-bound token
//     at a platform endpoint (401), and a Platform Admin signing in has no slug to
//     name. Sending whatever slug happens to be in localStorage would be worse
//     than sending nothing - it would look like a tenant attempt.
//   - They must never share the interceptor in lib/api/client.ts, which attaches
//     the stored tenant slug to every /api/ request.
//
// So this module builds its own headers and never calls withTenantHeaders. If you
// find yourself wanting the shared client here, that is the signal something is
// wrong, not that this file should be refactored.

import { API_BASE_URL } from '@/lib/config';

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalTenantUsers: number;
  platformAdmins: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PlatformApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = status;
    this.payload = payload;
  }
}

/** No tenant header here. See the file header. */
function headers(token: string | null, extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Call the platform API.
 *
 * Surfaces the server's message rather than a generic failure: the handlers
 * return actionable text ("the slug is already in use by X", "this tenant still
 * has 12 users, suspend it instead") and replacing that with "Request failed" is
 * what turns a fixable problem into a support ticket.
 */
async function request<T>(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/platform${path}`, {
    method: options.method || 'GET',
    headers: headers(token),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // A non-JSON body (a proxy error page, an empty 502) still has a status worth
    // reporting; the parse failure is not worth surfacing on its own.
  }

  if (!res.ok) {
    throw new PlatformApiError(
      payload?.message || `Request failed with status ${res.status}`,
      res.status,
      payload
    );
  }

  return payload as T;
}

/** Platform Admin sign-in. No tenant header, so this bypasses the shared client. */
export function platformLogin(
  email: string,
  password: string
): Promise<{ user: any; token: string }> {
  return request('/auth/login', null, { method: 'POST', body: { email, password } });
}

export function fetchPlatformStats(token: string): Promise<{ data: PlatformStats }> {
  return request('/stats', token);
}

export function fetchTenants(
  token: string,
  params: { page?: number; search?: string; status?: string } = {}
): Promise<{ data: PlatformTenant[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);

  const qs = query.toString();
  return request(`/tenants${qs ? `?${qs}` : ''}`, token);
}

export function createTenant(
  token: string,
  body: { name: string; slug: string; domain?: string; status?: string }
): Promise<{ data: PlatformTenant }> {
  return request('/tenants', token, { method: 'POST', body });
}

export function updateTenant(
  token: string,
  tenantId: string,
  body: { name?: string; domain?: string | null; status?: string }
): Promise<{ data: PlatformTenant }> {
  return request(`/tenants/${tenantId}`, token, { method: 'PATCH', body });
}

export function setTenantStatus(
  token: string,
  tenantId: string,
  status: 'Active' | 'Suspended'
): Promise<{ data: PlatformTenant }> {
  return request(`/tenants/${tenantId}/status`, token, { method: 'PUT', body: { status } });
}

export function deleteTenant(token: string, tenantId: string): Promise<{ data: { id: string; slug: string } }> {
  return request(`/tenants/${tenantId}`, token, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Tenant users (provisioning)
// ---------------------------------------------------------------------------

export interface ProvisionedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Provision a user inside a tenant. Used to create a brand-new tenant's first
 * System Admin so the client has a working login before any of its own users
 * exist. Platform Admin only, and the server refuses a role with
 * geo requirements unless the matching id is supplied.
 */
export function createTenantUser(
  token: string,
  tenantId: string,
  body: {
    name: string;
    email: string;
    password: string;
    role?: 'System Admin' | 'Situation Room Admin' | 'Zone Admin' | 'Ward Admin' | 'Polling Agent';
    wardId?: string;
    zoneId?: string;
    pollingUnitId?: string;
  }
): Promise<{ success: true; data: ProvisionedUser; message: string }> {
  return request(`/tenants/${tenantId}/users`, token, { method: 'POST', body });
}

// ---------------------------------------------------------------------------
// Geographic scope
// ---------------------------------------------------------------------------

/** One anchor of a tenant's geographic scope, as stored. */
export interface GeoScopeRow {
  level: 'state' | 'lga' | 'ward' | 'polling_unit';
  geoId: string;
  /** Human place name, decorated by the server (null when the row is orphaned). */
  label: string | null;
  state?: { id: string; name: string | null } | null;
  lga?: { id: string; name: string | null } | null;
  ward?: { id: string; name: string | null } | null;
}

export interface TenantGeoScope {
  levels: Array<'state' | 'lga' | 'ward' | 'polling_unit'>;
  scope: GeoScopeRow[];
}

export type GeoScopeLevel = 'state' | 'lga' | 'ward' | 'polling_unit';

export function fetchTenantGeoScope(
  token: string,
  tenantId: string
): Promise<{ success: true; data: TenantGeoScope }> {
  return request(`/tenants/${tenantId}/geo-scope`, token);
}

export function saveTenantGeoScope(
  token: string,
  tenantId: string,
  scope: Array<{ level: GeoScopeLevel; geoId: string }>
): Promise<{ success: true; data: TenantGeoScope }> {
  return request(`/tenants/${tenantId}/geo-scope`, token, {
    method: 'PUT',
    body: { scope },
  });
}

/** Remove every anchor: the tenant goes back to seeing all of Nigeria. */
export function clearTenantGeoScope(
  token: string,
  tenantId: string
): Promise<{ success: true; data: TenantGeoScope }> {
  return request(`/tenants/${tenantId}/geo-scope`, token, {
    method: 'DELETE',
  });
}

/** A place the platform can anchor a tenant's scope to, one level at a time. */
export interface GeoOption {
  id: string;
  name: string;
}

export function fetchGeoStates(token: string): Promise<{ success: true; data: GeoOption[] }> {
  return request('/geo/states', token);
}

export function fetchGeoLgas(
  token: string,
  stateId: string
): Promise<{ success: true; data: GeoOption[] }> {
  return request(`/geo/lgas?stateId=${encodeURIComponent(stateId)}`, token);
}

export function fetchGeoWards(
  token: string,
  lgaId: string
): Promise<{ success: true; data: GeoOption[] }> {
  return request(`/geo/wards?lgaId=${encodeURIComponent(lgaId)}`, token);
}

export function fetchGeoPollingUnits(
  token: string,
  wardId: string
): Promise<{ success: true; data: GeoOption[] }> {
  return request(`/geo/polling-units?wardId=${encodeURIComponent(wardId)}`, token);
}