import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    console.log("Checking database migrations...");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.warn("DATABASE_URL is not set, skipping migrations.");
      return;
    }

    const pool = new Pool({ connectionString, max: 1 });
    const db = drizzle(pool);

    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
      console.log("Migrations applied successfully!");
    } catch (err) {
      console.error("Migration failed:", err);
      // We don't exit the process here so that the app can still try to start,
      // but if the db is completely broken, the app will just throw errors as usual.
      // To strictly fail startup, you could throw the error:
      // throw err;
    } finally {
      await pool.end();
    }
  }
}
