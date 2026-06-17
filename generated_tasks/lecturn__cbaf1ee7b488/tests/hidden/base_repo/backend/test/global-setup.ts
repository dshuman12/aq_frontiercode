// One-time global setup. Vitest runs this exactly once before any test files
// load and once after all are done — perfect for slow shared work like
// migrating the test database.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolve } from "node:path";

export async function setup() {
  const url =
    process.env.DATABASE_URL ?? "postgres://lecturn:lecturn@localhost:5432/lecturn_test";
  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client, { casing: "snake_case" });
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dirname, "..", "drizzle"),
    });
  } finally {
    await client.end();
  }
}

export async function teardown() {
  // Nothing to do — the test database stays around between runs so we
  // can inspect it after a failure.
}
