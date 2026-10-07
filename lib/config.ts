// lib/config.ts
//
// Single place where the API and socket URLs are resolved.
//
// These used to be read inline as
//   process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'
// in about twenty files. The fallback is convenient locally and dangerous
// everywhere else: a deployment that forgets to set the variable does not fail,
// it silently talks to a developer's machine, and the symptom surfaces much
// later as every request 401-ing or 400-ing with no obvious cause. Under
// multi-tenancy that failure is even harder to read, because a wrong host also
// means a request that never reaches the tenant middleware at all.
//
// So: the fallback stays for local development, and in production a missing
// variable is a hard error rather than a silent default.
//
// The error is raised when the app is actually serving traffic, not while
// `next build` is prerendering. Failing the build would mean anyone compiling
// the app needs the full production environment, and the tempting response to
// that is to delete the guard. During a build the fallback is allowed but
// logged, so a misconfigured deployment is still visible in the build log.

const isProduction = process.env.NODE_ENV === 'production';

// Next.js sets this for the build process; it is absent when the built app runs.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

/** Strip a trailing slash so callers can append '/path' without doubling it. */
function normalize(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function required(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return normalize(value);

  if (isProduction) {
    const message =
      `${name} is not set. Refusing to fall back to ${fallback}, because that ` +
      `silently points live traffic at a local machine. Set ${name} in the ` +
      `deployment environment.`;

    if (isBuild) {
      console.warn(`[config] ${message} Falling back for this build only.`);
    } else {
      throw new Error(message);
    }
  }

  return normalize(fallback);
}

/** Base URL for REST calls, e.g. "https://api.example.com/api". */
export const API_BASE_URL = required('NEXT_PUBLIC_API_URL', 'https://d-elect-db.onrender.com/api');

/**
 * API origin with no /api suffix, for URLs that are not REST calls - the
 * static /uploads image paths stored in the database are the only current use.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

/** Origin for the Socket.IO connection, with no /api suffix. */
export const SOCKET_URL = required('NEXT_PUBLIC_SOCKET_URL', 'https://d-elect-db.onrender.com');

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
