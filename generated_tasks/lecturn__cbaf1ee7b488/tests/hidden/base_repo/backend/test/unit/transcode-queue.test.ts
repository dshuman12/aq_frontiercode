import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { transcodeJobs } from "~/db/schema";
import { resetTestDb, setupTestDb } from "../helpers/db";
import { makeFullChain } from "../factories";
import { enqueueTranscode, transcodeQueue } from "~/features/transcode/queue";

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("enqueueTranscode", () => {
  it("inserts a transcode_jobs row in 'pending' state", async () => {
    vi.spyOn(transcodeQueue, "add").mockResolvedValue({ id: "stub" } as never);
    const { episode } = await makeFullChain();
    const jobId = await enqueueTranscode(episode.id);
    const row = await db.query.transcodeJobs.findFirst({
      where: eq(transcodeJobs.id, jobId),
    });
    expect(row).toMatchObject({ episodeId: episode.id, status: "pending" });
  });

  it("calls BullMQ Queue.add with the transcode job name + episode payload", async () => {
    const addSpy = vi
      .spyOn(transcodeQueue, "add")
      .mockResolvedValue({ id: "bull-2" } as never);
    const { episode } = await makeFullChain();
    const jobId = await enqueueTranscode(episode.id);
    expect(addSpy).toHaveBeenCalledWith(
      "transcode",
      { episodeId: episode.id },
      expect.objectContaining({ jobId }),
    );
  });

  it("backfills queueJobId on the DB row from BullMQ's return", async () => {
    vi.spyOn(transcodeQueue, "add").mockResolvedValue({ id: "bull-77" } as never);
    const { episode } = await makeFullChain();
    const jobId = await enqueueTranscode(episode.id);
    const row = await db.query.transcodeJobs.findFirst({
      where: eq(transcodeJobs.id, jobId),
    });
    expect(row?.queueJobId).toBe("bull-77");
  });
});
