// scripts/check-tenant-headers.mjs
//
// Fails if a request can reach the API without naming its tenant.
//
// The server resolves the tenant from the X-Tenant-Slug header and has no
// default (R-TENANT-4), so a request that omits it is rejected with 400. That
// is a safe failure, but it is still a broken feature, and the AuthProvider
// fetch interceptor is not sufficient coverage on its own: a child component's
// effect runs before the provider's, so a page's first request can escape
// interception. This check is the guarantee that no call site depends on that
// race.
//
// Two things are verified per file:
//   1. Every fetch() to an /api/ URL names the tenant, via withTenantHeaders()
//      or the apiClient's getHeaders().
//   2. Every io() handshake passes auth: getSocketAuth(token), because the
//      socket is refused outright without it.
//
// Run: node scripts/check-tenant-headers.mjs [--quiet]
// Exit 0 clean, 1 on any violation.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const QUIET = process.argv.includes('--quiet');
const EXT = /\.(ts|tsx)$/;

// The files that are allowed to talk to the API without naming a tenant.
// Each is exempt for a stated reason, mirroring the backend's
// TENANT_EXEMPT_PREFIXES in middlewares/tenant.js.
const EXEMPT = new Set([
  'lib/tenant.ts',              // defines the helper
  'scripts/check-tenant-headers.mjs',
]);

// A call site is tenant-aware if it routes its headers through one of these.
// `getAuthHeaders` is a local helper in PartiesTab that wraps withTenantHeaders
// at its definition, so a call to it is covered too.
const TENANT_AWARE_HEADERS = /withTenantHeaders\(|getHeaders\(|getAuthHeaders\(|this\.getHeaders\(/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Find `needle(` occurrences and return the balanced span of their arguments.
 * The needle must be a standalone call, not the head of a longer identifier:
 * `fetch(` counts, `fetchZonesPaginated(` and `x.fetch(` do not.
 */
function callSpans(src, needle) {
  const spans = [];
  let i = 0;
  for (;;) {
    const at = src.indexOf(needle, i);
    if (at === -1) break;
    i = at + needle.length;

    // A real call is `fetch(` / `io(`: never preceded or followed by an
    // identifier character, and never a method call on some other object.
    const before = at > 0 ? src[at - 1] : ' ';
    const after = src[at + needle.length] || ' ';
    if (/[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)) continue;
    if (before === '.') continue;

    const open = src.indexOf('(', at + needle.length - 1);
    if (open === -1) break;

    let depth = 0;
    let end = -1;
    for (let j = open; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') {
        depth--;
        if (depth === 0) { end = j; break; }
      }
    }
    if (end === -1) break;

    spans.push({ line: src.slice(0, at).split('\n').length, body: src.slice(open, end + 1) });
    i = end;
  }
  return spans;
}

/** Does this fetch target the API (rather than a static asset or external host)? */
function targetsApi(body) {
  return /\/api\//.test(body) || /API_BASE_URL|API_URL|apiClient/.test(body);
}

/**
 * Resolve `fetch(url, { headers })`, where the object is a local variable.
 * A shorthand is only accepted when that variable is itself built through
 * withTenantHeaders, so a header object assembled by hand is still reported.
 */
function shorthandIsTenantAware(body, fileSrc) {
  const m = body.match(/\b(headers|authHeaders|requestHeaders)\b/);
  if (!m) return false;
  return new RegExp(`const\\s+${m[1]}\\s*=\\s*withTenantHeaders\\(`).test(fileSrc);
}

const violations = [];

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (EXEMPT.has(rel)) continue;

  const src = readFileSync(file, 'utf8');

  for (const { line, body } of callSpans(src, 'fetch')) {
    if (!targetsApi(body)) continue;
    if (TENANT_AWARE_HEADERS.test(body)) continue;
    if (shorthandIsTenantAware(body, src)) continue;
    violations.push({ rel, line, what: 'fetch without a tenant header' });
  }

  for (const { line, body } of callSpans(src, 'io')) {
    // `io(` also matches the import and any identifier ending in io; require a
    // URL-looking first argument so we only inspect real constructions.
    if (!/^io\(\s*['"`]?https?:|^\(\s*$/.test(body) && !/SOCKET_URL/.test(body)) continue;
    if (!/auth\s*:\s*getSocketAuth\(/.test(body)) {
      violations.push({ rel, line, what: 'io() handshake without auth: getSocketAuth()' });
    }
  }

  // Using the helper without importing it is a build failure, but it is also
  // the exact way a call site can look covered to this script while throwing at
  // runtime, so it is worth reporting here rather than only in tsc.
  for (const helper of ['withTenantHeaders', 'getSocketAuth']) {
    const used = new RegExp(`(?<![.\\w])${helper}\\s*\\(`).test(src);
    const imported = new RegExp(`import\\s*\\{[^}]*\\b${helper}\\b[^}]*\\}`).test(src);
    if (used && !imported) {
      violations.push({
        rel,
        line: src.split('\n').findIndex((l) => new RegExp(`(?<![.\\w])${helper}\\s*\\(`).test(l)) + 1,
        what: `${helper}() used but not imported from @/lib/tenant`,
      });
    }
  }
}

if (violations.length === 0) {
  if (!QUIET) console.log('OK - every API request names its tenant.');
  process.exit(0);
}

console.error(`${violations.length} request(s) can reach the API without a tenant:\n`);
for (const v of violations) {
  console.error(`  ${v.rel}:${v.line}  ${v.what}`);
}
console.error('\nFix: wrap the header object in withTenantHeaders() from @/lib/tenant.');
process.exit(1);
