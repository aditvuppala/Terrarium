/** Read-only SQLite connection for API routes. Server-only. */
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { existsSync } from "node:fs";
import path from "node:path";
import * as schema from "@/lib/db/schema";

export const DB_PATH = path.join(process.cwd(), "data", "terrarium.db");

type Db = BetterSQLite3Database<typeof schema>;
// Reuse one connection across dev hot reloads.
const g = globalThis as unknown as { __terrariumDb?: Db };

export function getDb(): Db {
  if (g.__terrariumDb) return g.__terrariumDb;
  if (!existsSync(DB_PATH)) {
    throw new Error(`Database not found at data/terrarium.db. Run \`npm run db:build\` first.`);
  }
  const sqlite = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  g.__terrariumDb = drizzle(sqlite, { schema });
  return g.__terrariumDb;
}
