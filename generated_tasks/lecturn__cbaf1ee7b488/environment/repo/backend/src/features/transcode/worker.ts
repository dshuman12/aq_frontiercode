import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { env } from "~/config/env";
import { db } from "~/db/client";
import { courses, episodes, transcodeJobs, transcodeRenditions } from "~/db/schema";
import { thumbnailsService } from "~/features/thumbnails/thumbnails.service";
import { buildMasterPlaylist, transcodeRendition } from "./ffmpeg";
import { probeFile } from "./probe";
import { type TranscodeJobData } from "./queue";
import { redisConnection, TRANSCODE_QUEUE } from "./redis";
import { pickRenditions } from "./renditions";
import { checkDisk, episodeOutputDir } from "./storage";

const MASTER_PLAYLIST_NAME = "master.m3u8";

async function processJob(jobId: string, data: TranscodeJobData): Promise<void> {
  const { episodeId } = data;

  // Throw on low disk so BullMQ retries the job later instead of failing it.
  const disk = await checkDisk();
  if (disk.underThreshold) {
    throw new Error(
      `Disk threshold not met: ${disk.freeGb.toFixed(1)} GB free < ${env.TRANSCODE_DISK_THRESHOLD_GB} GB`,
    );
  }

  const ep = await db.query.episodes.findFirst({
    where: eq(episodes.id, episodeId),
  });
  if (!ep) throw new Error(`Episode ${episodeId} not found`);

  await db
    .update(episodes)
    .set({ transcodeStatus: "probing", transcodeError: null, transcodeProgress: 0 })
    .where(eq(episodes.id, episodeId));
  await db
    .update(transcodeJobs)
    .set({ status: "probing", startedAt: new Date(), progress: 0 })
    .where(eq(transcodeJobs.id, jobId));

  const probe = await probeFile(ep.filePath);
  const renditions = pickRenditions(probe.height || 1080);

  const outDir = episodeOutputDir(episodeId);
  await mkdir(outDir, { recursive: true });

  // Renditions run serially — a single ffmpeg already saturates multiple cores, and parallel
  // jobs would starve the API process on the same box.
  await db
    .update(episodes)
    .set({ transcodeStatus: "transcoding" })
    .where(eq(episodes.id, episodeId));
  await db
    .update(transcodeJobs)
    .set({ status: "transcoding" })
    .where(eq(transcodeJobs.id, jobId));

  const renditionRows: Array<{
    height: number;
    width: number;
    bitrateKbps: number;
    manifestRelative: string;
  }> = [];

  // Wipe rows from a prior failed run so the unique (episodeId, height) constraint allows reinserts.
  await db.delete(transcodeRenditions).where(eq(transcodeRenditions.episodeId, episodeId));

  for (let i = 0; i < renditions.length; i++) {
    const rendition = renditions[i]!;
    const baseFraction = i / renditions.length;
    const stepFraction = 1 / renditions.length;

    const { manifestPath } = await transcodeRendition({
      inputPath: ep.filePath,
      outputDir: outDir,
      rendition,
      durationSec: probe.durationSec,
      onProgress: async (p) => {
        const overall = baseFraction + stepFraction * p;
        await db
          .update(episodes)
          .set({ transcodeProgress: overall })
          .where(eq(episodes.id, episodeId));
        await db
          .update(transcodeJobs)
          .set({ progress: overall, updatedAt: new Date() })
          .where(eq(transcodeJobs.id, jobId));
      },
    });

    const manifestRelative = relative(outDir, manifestPath);
    renditionRows.push({
      height: rendition.height,
      width: rendition.width,
      bitrateKbps: rendition.bitrateKbps,
      manifestRelative,
    });
  }

  const masterContent = buildMasterPlaylist(
    renditionRows.map((r) => ({
      bandwidth: r.bitrateKbps * 1000,
      width: r.width,
      height: r.height,
      manifestRelativePath: r.manifestRelative,
    })),
  );
  const masterPath = join(outDir, MASTER_PLAYLIST_NAME);
  await writeFile(masterPath, masterContent, "utf-8");

  if (renditionRows.length > 0) {
    await db.insert(transcodeRenditions).values(
      renditionRows.map((r) => ({
        episodeId,
        height: r.height,
        width: r.width,
        bitrateKbps: r.bitrateKbps,
        manifestPath: r.manifestRelative,
      })),
    );
  }
  await db
    .update(episodes)
    .set({
      transcodeStatus: "ready",
      transcodeProgress: 1,
      transcodedAt: new Date(),
      hlsManifestPath: masterPath,
    })
    .where(eq(episodes.id, episodeId));
  await db
    .update(transcodeJobs)
    .set({ status: "ready", progress: 1, finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(transcodeJobs.id, jobId));

  // Sprite-sheet and cover extraction are best-effort; failure leaves placeholders in the UI
  // but doesn't fail the transcode job.
  try {
    await thumbnailsService.buildSpriteSheet(episodeId);
  } catch (err) {
    console.warn(`[transcode] sprite-sheet failed for ${episodeId}:`, err);
  }
  try {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, ep.courseId),
      columns: { id: true, coverImagePath: true },
    });
    if (course && !course.coverImagePath) {
      await thumbnailsService.buildCourseCover(course.id);
    }
  } catch (err) {
    console.warn(`[transcode] cover extract failed for ${episodeId}:`, err);
  }
}

let workerInstance: Worker<TranscodeJobData> | null = null;

// Runs in-process with the API in dev; split into its own deployment in production.
export function startTranscodeWorker(): Worker<TranscodeJobData> {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker<TranscodeJobData>(
    TRANSCODE_QUEUE,
    async (job) => {
      const dbJobId = job.opts.jobId ?? job.id;
      if (!dbJobId) throw new Error("Job missing id");
      await db
        .update(transcodeJobs)
        .set({ attempts: job.attemptsMade + 1, updatedAt: new Date() })
        .where(eq(transcodeJobs.id, dbJobId));
      await processJob(dbJobId, job.data);
    },
    {
      connection: redisConnection.duplicate(),
      concurrency: env.TRANSCODE_CONCURRENCY,
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    },
  );

  workerInstance.on("failed", async (job, err) => {
    if (!job) return;
    const dbJobId = job.opts.jobId ?? job.id;
    if (!dbJobId) return;
    const isFinalFailure = job.attemptsMade >= (job.opts.attempts ?? 1);
    await db
      .update(transcodeJobs)
      .set({
        status: isFinalFailure ? "failed" : "pending",
        lastError: err.message,
        updatedAt: new Date(),
      })
      .where(eq(transcodeJobs.id, dbJobId));
    if (isFinalFailure) {
      await db
        .update(episodes)
        .set({ transcodeStatus: "failed", transcodeError: err.message })
        .where(eq(episodes.id, job.data.episodeId));
    }
  });

  workerInstance.on("error", (err) => {
    console.warn("[transcode worker] error:", err.message);
  });

  return workerInstance;
}
