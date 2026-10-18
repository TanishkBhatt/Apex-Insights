import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

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

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");

const sql = postgres(url, { ssl: "require", max: 1, prepare: false });
const rows = await sql`select current_database() as db, current_user as "user", version() as version`;
console.log("Connected:", rows[0].db, "as", rows[0].user);
const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
console.log("Tables:", tables.map((t) => t.table_name).join(", ") || "(none)");
await sql.end();
