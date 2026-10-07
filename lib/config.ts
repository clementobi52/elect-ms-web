// lib/config.ts
//
// Single place where the API and socket URLs are resolved.
//
// The deployed backend host is committed here as the fallback so that any build
// - on Vercel, Render, or locally - produces a client bundle that points at a
// real server. NEXT_PUBLIC_* environment variables still override these when
// they are set at build time.

/** Strip a trailing slash so callers can append '/path' without doubling it. */
function normalize(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/** Base URL for REST calls, e.g. "https://api.example.com/api". */
export const API_BASE_URL = normalize(
  process.env.NEXT_PUBLIC_API_URL || 'https://d-elect-db.onrender.com/api'
);

/**
 * API origin with no /api suffix, for URLs that are not REST calls - the
 * static /uploads image paths stored in the database are the only current use.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

/** Origin for the Socket.IO connection, with no /api suffix. */
export const SOCKET_URL = normalize(
  process.env.NEXT_PUBLIC_SOCKET_URL || 'https://d-elect-db.onrender.com'
);

/**
 * Tenant a visitor is assumed to belong to before they have signed in.
 *
 * The backend has no default of its own (R-TENANT-4) and rejects any request
 * that cannot name a tenant, so a first-time login needs this. Once signed in,
 * the slug comes from the tenant the server returned and this is unused.
 *
 * This is a *fallback*, not a default in the usual sense. It is only reached
 * when the hostname names no tenant, so deploying on `acme.elect-ms.com` always
 * resolves `acme` and never this value. Do not use it to name the tenant of a
 * request whose hostname is meaningful.
 */
export const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default';

/**
 * Apex domain of this deployment, with no scheme and no leading subdomain.
 *
 * The web app uses it to recognise which tenant it is being served as: on
 * `acme.elect-ms.com` the subdomain is the slug. A different deployment sets
 * this to its own domain; leaving it wrong means the subdomain is never
 * recognised and every visitor falls through to DEFAULT_TENANT_SLUG.
 *
 * Keep in step with PLATFORM_DOMAINS in the backend's server.js, which uses the
 * same list to decide which browser origins are legitimate.
 */
export const PLATFORM_DOMAIN = (
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'elect-ms.com'
).toLowerCase().replace(/^\.+|\.+$/g, '');