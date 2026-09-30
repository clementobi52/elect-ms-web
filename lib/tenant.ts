// lib/tenant.ts
//
// Single source of truth for "which tenant is this browser talking to".
//
// The backend resolves the tenant on every request from the X-Tenant-Slug
// header or a tenant subdomain. There is deliberately NO server-side default
// (R-TENANT-4): a request that resolves no tenant is rejected with 400, and a
// slug that does not match an active Organization is a 404. The resolved tenant
// is then cross-checked against `tenantId` inside the JWT, so a mismatched slug
// is a 401 rather than a silent read of another tenant's rows.
//
// Two consequences this module has to respect:
//   - Omitting the header is a 400, not a fallback. Anything that talks to the
//     API must name its tenant even against a single-tenant deployment.
//   - Because a wrong slug is a 400/404 and not a quiet success, a missing
//     header surfaces as a broken request instead of wrong data. That is the
//     intended failure mode; do not paper over it.
//   - The header also outranks the hostname server-side, so a client on a tenant
//     subdomain must send the slug that hostname implies. See
//     slugFromHostname() below.
//
// This module exists so the HTTP client, the Socket.IO clients, and any raw
// `fetch` call all send the same slug. Getting them out of step is how a client
// ends up authenticated on REST but rejected on the socket, or worse,
// reporting its own tenant for a request the server read as someone else's.

import { PLATFORM_DOMAIN } from './config';

export const TENANT_SLUG_HEADER = 'X-Tenant-Slug';
const STORAGE_KEY = 'tenantSlug';

/**
 * Subdomains that address the platform itself rather than a tenant.
 *
 * Mirrors RESERVED_SUBDOMAINS in the backend's utils/tenantContext.js. If a name
 * is added to one it has to be added to the other, or the browser will resolve
 * a tenant from a hostname the server refuses to.
 */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'test',
  'staging',
  'localhost',
]);

/** Same shape as the server's slug validation in resolveSlug(). */
const VALID_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

/**
 * The tenant this hostname is addressed as, or null if it names none.
 *
 *   "acme.elect-ms.com" -> "acme"
 *   "acme.localhost"    -> "acme"   (lets the subdomain path be tested locally)
 *   "localhost"         -> null
 *   "elect-ms.com"      -> null     (the platform, not a tenant)
 *   "192.168.1.132"     -> null     (bare IP - mobile's transport, never a tenant)
 *
 * A bare IP is excluded for the same reason the backend excludes it: the mobile
 * client reaches the API over a LAN address, and "192" is not an organisation.
 */
export function slugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;

  const host = window.location.hostname.toLowerCase();
  if (!host) return null;
  if (host.startsWith('[')) return null; // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // IPv4 literal

  const base = host.endsWith('.localhost')
    ? 'localhost'
    : host.endsWith(`.${PLATFORM_DOMAIN}`)
      ? PLATFORM_DOMAIN
      : null;

  if (!base) return null;

  const sub = host.slice(0, host.length - base.length - 1);
  // A nested subdomain ("a.b.elect-ms.com") is not a tenant, and neither is a
  // reserved label. Nested labels would otherwise let one tenant claim another's
  // hostname by prefixing it.
  if (!sub || sub.includes('.')) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  return VALID_SLUG.test(sub) ? sub : null;
}

function fromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing / storage disabled. Nothing to send; the request will be
    // rejected with 400 by the server, which is the correct outcome for a
    // request that cannot name its tenant.
    return null;
  }
}

/**
 * The tenant to send with the next request.
 *
 * The hostname wins over stored state, and that ordering is the point. An
 * operator who points acme.elect-ms.com at the Acme deployment has said which
 * client this is; a value left in localStorage from an earlier session must not
 * be able to contradict that. If storage took precedence, a browser that had
 * previously stored "default" would keep naming "default" while displaying the
 * Acme hostname, and the server - which trusts the header first - would serve
 * the wrong organisation's data under the right one's name.
 *
 * Returns null before sign-in when the hostname names no tenant and nothing is
 * stored, which is not a fallback: the request is refused with 400 rather than
 * resolved against a guess (R-TENANT-4).
 */
export function getTenantSlug(): string | null {
  return slugFromHostname() || fromStorage();
}

/**
 * Add the tenant header to an existing set of headers.
 *
 * This is the function every request should go through, including the raw
 * `fetch` calls that predate lib/api/client.ts. The interceptor installed by
 * AuthProvider also injects the header, but it is not a substitute: a child
 * component's effect runs before the provider's, so a page's first request can
 * escape interception and be sent with no tenant at all.
 *
 * Accepts whatever `fetch` accepts and returns a plain object, so it drops into
 * an existing header literal without restructuring the call:
 *
 *   fetch(url, { headers: withTenantHeaders({ Authorization: `Bearer ${t}` }) })
 *
 * @param base         Existing headers. Left untouched.
 * @param overrideSlug Use this slug instead of the stored one. Login passes the
 *   configured default here, because a first-time visitor has nothing stored
 *   yet but still has to name a tenant for the request to be accepted.
 *
 * An explicit header already present in `base` wins - a caller that
 * deliberately targets a different tenant is not silently overridden.
 */
export function withTenantHeaders(
  base?: HeadersInit,
  overrideSlug?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (base) {
    new Headers(base).forEach((value, key) => {
      headers[key] = value;
    });
  }

  if (!hasHeader(headers, TENANT_SLUG_HEADER)) {
    const slug = overrideSlug || getTenantSlug();
    if (slug) {
      headers[TENANT_SLUG_HEADER] = slug;
    }
  }

  return headers;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

/**
 * Persist the tenant the server just authenticated us into. Call this from the
 * login/signup response handlers using the `tenant.slug` the API returns.
 */
export function setTenantSlug(slug: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (slug) {
      window.localStorage.setItem(STORAGE_KEY, slug);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Non-fatal: the slug simply stays unset, and the next request is refused
    // with 400 rather than being served against the wrong tenant.
  }
}

/**
 * The value for the `auth` block of a Socket.IO handshake.
 *
 * The handshake is verified by `io.use()` server-side: the token must be valid
 * and its `tenantId` must belong to this tenant. A socket cannot connect
 * without both.
 */
export function getSocketAuth(token: string | null): { token: string | null; tenantSlug: string | null } {
  return { token, tenantSlug: getTenantSlug() };
}
