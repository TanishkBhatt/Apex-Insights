/**
 * Small retry helper for transient database/network errors.
 *
 * Managed Postgres providers (e.g. Neon's PgBouncer pooler) close idle
 * connections and can also reset sockets during failover. postgres.js does not
 * transparently retry queries that were written to an already-closed socket, so
 * we retry the handful of known-transient error codes a few times.
 */
const TRANSIENT_CODES = new Set([
  "CONNECTION_ENDED",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
]);

export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string" && TRANSIENT_CODES.has(candidate.code)) {
    return true;
  }
  if (candidate.cause && candidate.cause !== error) {
    return isTransientDbError(candidate.cause);
  }
  return false;
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 250 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
