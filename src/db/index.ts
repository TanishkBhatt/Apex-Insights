import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Configure .env.local (see .env.example).");
  }
  return postgres(url, {
    ssl: "require",
    max: 10,
    connect_timeout: 15,
    idle_timeout: 20,
    prepare: false,
  });
}

const client = globalForDb.__pgClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;

export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}
