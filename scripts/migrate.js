import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

async function run() {
  console.log("Checking database migrations...");
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("DATABASE_URL is not set, skipping migrations.");
    process.exit(0);
  }

  const pool = new pg.Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
