import { Redis } from "ioredis";
import { env } from "~/config/env";

// maxRetriesPerRequest must be null for BullMQ's blocking commands.
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
  enableReadyCheck: true,
});

redisConnection.on("error", (err) => {
  // Warn (not error) so reconnect storms don't drown the log; ops that need Redis still throw.
  console.warn("[redis] connection error:", err.message);
});

// BullMQ rejects queue names containing `:`.
export const TRANSCODE_QUEUE = "lecturn-transcode";
