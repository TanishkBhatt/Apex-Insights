import fs from "node:fs";
import path from "node:path";
import { beforeAll } from "vitest";

/**
 * Load .env.local into process.env for tests. Tests run against the database
 * configured in DATABASE_URL — a development database only. Never point this
 * at production data.
 */
for (const file of [".env.local", ".env"]) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) continue;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for integration tests (.env.local).");
}

/**
 * Warm the shared database connection before each test file runs.
 *
 * Vitest is configured with `isolate: false` and `fileParallelism: false`, so a
 * single module-level postgres.js client is reused across every test file.
 * Managed Postgres providers (Neon) close idle sockets, so a later file's first
 * query can hit an already-closed connection. The retry helper recovers from
 * those transient errors and re-establishes the connection.
 */
beforeAll(async () => {
  const { db } = await import("@/db");
  const { withDbRetry } = await import("@/lib/db-retry");
  await withDbRetry(() => db.execute("select 1"));
});
