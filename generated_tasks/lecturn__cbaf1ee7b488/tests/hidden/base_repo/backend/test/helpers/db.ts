import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/db/schema";

// Test DB client. Migrations run once globally (see test/global-setup.ts);
// each test calls resetTestDb() in beforeEach to TRUNCATE all tables.
export const testClient = postgres(process.env.DATABASE_URL!, { max: 4 });
export const testDb = drizzle(testClient, { schema, casing: "snake_case" });

const ALL_TABLES = [
  "library_shares",
  "subtitles",
  "transcode_renditions",
  "transcode_jobs",
  "progress",
  "episodes",
  "chapters",
  "courses",
  "libraries",
  "verifications",
  "accounts",
  "sessions",
  "users",
] as const;

// Kept as a no-op so test files can call it for clarity even though the
// global setup already ran migrations.
export async function setupTestDb() {
  // intentionally empty
}

export async function resetTestDb() {
  // Single TRUNCATE for speed. CASCADE drops dependent rows; RESTART IDENTITY
  // resets sequences (we don't use them, but cheap insurance).
  const tables = ALL_TABLES.map((t) => `"${t}"`).join(", ");
  await testClient.unsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
