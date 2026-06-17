// Vitest global setup. Runs once per worker before any test file.
//
// We use a dedicated test database so destructive operations (TRUNCATE
// between tests) don't touch the dev DB. The DB URL is a `_test` suffix on
// the dev one — ensure it exists with `createdb lecturn_test` or via
// docker-compose.
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET ??= "test-secret-must-be-at-least-32-chars-long";
process.env.LIBRARY_ROOT ??= "/tmp/lecturn-test-library";
process.env.MEDIA_ROOT ??= "/tmp/lecturn-test-media";
process.env.REDIS_URL ??= "redis://localhost:6380";

if (!process.env.DATABASE_URL?.includes("_test")) {
  process.env.DATABASE_URL =
    "postgres://lecturn:lecturn@localhost:5432/lecturn_test";
}

import { mkdir } from "node:fs/promises";
await mkdir(process.env.MEDIA_ROOT, { recursive: true });
await mkdir(process.env.LIBRARY_ROOT, { recursive: true });
