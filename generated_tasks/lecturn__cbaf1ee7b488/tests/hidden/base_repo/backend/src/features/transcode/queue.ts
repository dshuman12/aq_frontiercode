import { Queue, QueueEvents } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { transcodeJobs } from "~/db/schema";
import { redisConnection, TRANSCODE_QUEUE } from "./redis";

export interface TranscodeJobData {
  episodeId: string;
}

export const transcodeQueue = new Queue<TranscodeJobData>(TRANSCODE_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
  },
});

// Drives the SSE endpoint so the frontend reacts to status transitions without polling.
export const transcodeQueueEvents = new QueueEvents(TRANSCODE_QUEUE, {
  connection: redisConnection.duplicate(),
});

export async function enqueueTranscode(episodeId: string): Promise<string> {
  // Persist before enqueuing — Redis-only state would vanish on FLUSHALL.
  const [row] = await db
    .insert(transcodeJobs)
    .values({ episodeId, status: "pending" })
    .returning({ id: transcodeJobs.id });
  if (!row) throw new Error("Failed to insert transcode job row");

  const bull = await transcodeQueue.add(
    "transcode",
    { episodeId },
    { jobId: row.id },
  );
  await db
    .update(transcodeJobs)
    .set({ queueJobId: bull.id ?? null, updatedAt: new Date() })
    .where(eq(transcodeJobs.id, row.id));
  return row.id;
}
