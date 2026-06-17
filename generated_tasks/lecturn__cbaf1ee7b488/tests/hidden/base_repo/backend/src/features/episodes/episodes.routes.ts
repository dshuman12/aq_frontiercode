import { createReadStream, statSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "~/db/client";
import { courses, episodes } from "~/db/schema";
import { requireUser } from "~/features/auth/middleware";
import { assertLibraryAccess } from "~/features/libraries/access";

const params = z.object({ id: z.string().uuid() });

// HTTP range streaming for <video> seek. Access is gated by the owning library, so leaked URLs are inert.
export async function episodesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get("/episodes/:id/stream", { schema: { params } }, async (req, reply) => {
    const user = requireUser(req);
    const ep = await db
      .select({
        filePath: episodes.filePath,
        fileSizeBytes: episodes.fileSizeBytes,
        libraryId: courses.libraryId,
      })
      .from(episodes)
      .innerJoin(courses, eq(courses.id, episodes.courseId))
      .where(eq(episodes.id, req.params.id))
      .limit(1)
      .then((rows) => rows[0]);
    if (!ep) return reply.notFound("Episode not found");

    await assertLibraryAccess(ep.libraryId, user.id, "viewer");

    const stat = statSync(ep.filePath);
    const total = stat.size;
    const range = req.headers.range;

    if (!range) {
      reply
        .header("Content-Length", total)
        .header("Content-Type", "video/mp4")
        .header("Accept-Ranges", "bytes");
      return reply.send(createReadStream(ep.filePath));
    }

    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(startStr ?? "0", 10);
    const end = endStr ? Number.parseInt(endStr, 10) : total - 1;
    const chunkSize = end - start + 1;

    reply
      .status(206)
      .header("Content-Range", `bytes ${start}-${end}/${total}`)
      .header("Accept-Ranges", "bytes")
      .header("Content-Length", chunkSize)
      .header("Content-Type", "video/mp4");

    return reply.send(createReadStream(ep.filePath, { start, end }));
  });
}
