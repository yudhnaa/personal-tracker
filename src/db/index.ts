import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Force bundler to trace the migrator dependency for the standalone build
if (process.env.DUMMY_NEVER_MATCH) {
  migrate(null as any, { migrationsFolder: "" });
}
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
