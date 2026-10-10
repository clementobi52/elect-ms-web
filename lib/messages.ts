// lib/messages.ts
//
// Copy that must read the same everywhere. The admin surfaces show real data or
// nothing - never sample rows dressed up as live ones - so a request that never
// reached the server is reported as an outage.

/** The API could not be reached at all (DNS, CORS, connection refused). */
export const SERVER_OFFLINE_MESSAGE = 'Server currently offline';

/**
 * A `fetch` rejection is a `TypeError` in browsers; an HTTP status is not.
 * Used to tell "cannot reach the server" apart from "server answered an error",
 * so the former can say so plainly.
 */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}
