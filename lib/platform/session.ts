// lib/platform/session.ts
//
// The Platform Admin session, kept apart from the tenant auth context.
//
// Why not lib/auth-context.tsx: that provider's interceptor attaches the stored
// tenant slug to every /api/ request, and its sign-in flow requires a tenant to
// resolve. A Platform Admin has neither. Storing their token in the same place
// would mean a page could read `user` and assume a tenant exists, and would put a
// tenant-bound token in a context whose whole job is to produce one.
//
// Separate storage keys are what keeps the two sessions from overwriting each
// other. A browser that has used both - an operator checking a tenant and then the
// platform - can hold both tokens at once, and signing out of one leaves the other
// intact.

const TOKEN_KEY = 'platformToken';
const USER_KEY = 'platformUser';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Storage disabled. Treated as signed out; the API would refuse the request
    // anyway, so failing to a signed-out state is the safe direction.
    return null;
  }
}

export function getPlatformUser(): PlatformUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PlatformUser) : null;
  } catch {
    return null;
  }
}

export function savePlatformSession(token: string, user: PlatformUser): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Non-fatal: the session simply will not survive a reload.
  }
}

export function clearPlatformSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // Nothing useful to do; the in-memory state is cleared by the caller.
  }
}

/**
 * Whether the stored token has expired.
 *
 * The platform API rejects an expired token with 401, so this is a convenience to
 * send the user to the sign-in screen rather than let them land on a page of
 * failed requests. It is not a security boundary - it reads a client-side value,
 * and the server re-checks every request regardless.
 */
export function isPlatformTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    const { exp } = JSON.parse(atob(payload));
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}