import { createReadStream, statSync } from "node:fs";
import { normalize, resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "~/db/client";
import { courses, episodes } from "~/db/schema";
import { requireUser } from "~/features/auth/middleware";
import { assertLibraryAccess } from "~/features/libraries/access";
import { transcodeQueueEvents } from "./queue";
import { episodeOutputDir } from "./storage";

const params = z.object({ id: z.string().uuid() });
const segmentParams = z.object({
  id: z.string().uuid(),
  rendition: z.string().regex(/^\d+p$/),
  segment: z.string().regex(/^[\w.-]+$/),
});

async function loadEpisodeWithLibrary(episodeId: string) {
  const row = await db
    .select({
      id: episodes.id,
      libraryId: courses.libraryId,
      hlsManifestPath: episodes.hlsManifestPath,
      transcodeStatus: episodes.transcodeStatus,
    })
    .from(episodes)
    .innerJoin(courses, eq(courses.id, episodes.courseId))
    .where(eq(episodes.id, episodeId))
    .limit(1)
    .then((rows) => rows[0]);
  return row ?? null;
}

// Path-traversal guard: the resolved target must stay inside `root`.
function safeJoinUnderRoot(root: string, ...segments: string[]): string | null {
  const target = normalize(resolve(root, ...segments));
  const rootResolved = resolve(root) + sep;
  if (target !== resolve(root) && !target.startsWith(rootResolved)) return null;
  return target;
}

export async function transcodeRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/episodes/:id/hls/master.m3u8",
    { schema: { params } },
    async (req, reply) => {
      const user = requireUser(req);
      const ep = await loadEpisodeWithLibrary(req.params.id);
      if (!ep) return reply.notFound("Episode not found");
      await assertLibraryAccess(ep.libraryId, user.id, "viewer");
      if (ep.transcodeStatus !== "ready" || !ep.hlsManifestPath) {
        return reply.code(409).send({
          error: "NotReady",
          message: "Episode has not finished transcoding",
          status: ep.transcodeStatus,
        });
      }

      const root = episodeOutputDir(req.params.id);
      const masterPath = safeJoinUnderRoot(root, "master.m3u8");
      if (!masterPath) return reply.notFound();

      reply
        .header("Content-Type", "application/vnd.apple.mpegurl")
        .header("Cache-Control", "no-cache");
      return reply.send(createReadStream(masterPath));
    },
  );

  // One route serves both per-rendition `index.m3u8` and segments so auth lives in one place.
  r.get(
    "/episodes/:id/hls/:rendition/:segment",
    { schema: { params: segmentParams } },
    async (req, reply) => {
      const user = requireUser(req);
      const ep = await loadEpisodeWithLibrary(req.params.id);
      if (!ep) return reply.notFound("Episode not found");
      await assertLibraryAccess(ep.libraryId, user.id, "viewer");

      const root = episodeOutputDir(req.params.id);
      const target = safeJoinUnderRoot(root, req.params.rendition, req.params.segment);
      if (!target) return reply.notFound();

      try {
        const stat = statSync(target);
        const isManifest = req.params.segment.endsWith(".m3u8");
        reply
          .header(
            "Content-Type",
            isManifest ? "application/vnd.apple.mpegurl" : "video/mp2t",
          )
          .header("Content-Length", stat.size)
          .header("Cache-Control", isManifest ? "no-cache" : "public, max-age=31536000, immutable");
        return reply.send(createReadStream(target));
      } catch {
        return reply.notFound();
      }
    },
  );

  // Events fan out globally; clients filter by libraryId on receive. Move the
  // filter to the source once we add per-library subscription channels.
  r.get("/transcode/events", async (req, reply) => {
    requireUser(req);

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("hello", { ok: true });
    const heartbeat = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 15_000);

    type ProgressData = string | boolean | number | object;
    const onProgress = (args: { jobId: string; data: ProgressData }, _id: string) => {
      const value =
        typeof args.data === "number"
          ? args.data
          : typeof args.data === "object" && args.data !== null && "progress" in args.data
            ? (args.data as { progress: number }).progress
            : null;
      if (value !== null && Number.isFinite(value)) {
        send("progress", { jobId: args.jobId, progress: value });
      }
    };
    const onCompleted = (args: { jobId: string }, _id: string) => send("completed", args);
    const onFailed = (
      args: { jobId: string; failedReason?: string },
      _id: string,
    ) => send("failed", { jobId: args.jobId, error: args.failedReason ?? "unknown" });
    const onActive = (args: { jobId: string }, _id: string) => send("active", args);

    transcodeQueueEvents.on("progress", onProgress);
    transcodeQueueEvents.on("completed", onCompleted);
    transcodeQueueEvents.on("failed", onFailed);
    transcodeQueueEvents.on("active", onActive);

    req.raw.on("close", () => {
      clearInterval(heartbeat);
      transcodeQueueEvents.off("progress", onProgress);
      transcodeQueueEvents.off("completed", onCompleted);
      transcodeQueueEvents.off("failed", onFailed);
      transcodeQueueEvents.off("active", onActive);
    });
  });
}

