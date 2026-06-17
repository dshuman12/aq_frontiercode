import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envPath = resolve(process.cwd(), "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  API_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  WEB_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6380"),
  LIBRARY_ROOT: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  MEDIA_ROOT: z.string().min(1).default("./media"),
  TRANSCODE_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  TRANSCODE_DISK_THRESHOLD_GB: z.coerce.number().min(1).default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
