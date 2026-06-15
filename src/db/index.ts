import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://tracker:tracker@127.0.0.1:5433/personal_tracker";

const globalForDb = globalThis as typeof globalThis & {
  trackerPgPool?: Pool;
};

export const pool =
  globalForDb.trackerPgPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.trackerPgPool = pool;
}

export const db = drizzle(pool, { schema });
