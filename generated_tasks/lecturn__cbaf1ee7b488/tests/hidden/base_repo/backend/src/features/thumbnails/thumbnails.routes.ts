import { createReadStream, statSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "~/db/client";
import { courses, episodeThumbnails, episodes } from "~/db/schema";
import { requireUser } from "~/features/auth/middleware";
import { assertLibraryAccess } from "~/features/libraries/access";
import { thumbnailsService } from "./thumbnails.service";

const SpriteResponse = z.object({
  episodeId: z.string().uuid(),
  intervalSec: z.number().int(),
  cols: z.number().int(),
  rows: z.number().int(),
  thumbWidth: z.number().int(),
  thumbHeight: z.number().int(),
  url: z.string(),
});

export async function thumbnailsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/episodes/:id/thumbnails",
    {
      schema: {
        tags: ["thumbnails"],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: SpriteResponse,
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      const ep = await db
        .select({ libraryId: courses.libraryId })
        .from(episodes)
        .innerJoin(courses, eq(courses.id, episodes.courseId))
        .where(eq(episodes.id, req.params.id))
        .limit(1)
        .then((r) => r[0]);
      if (!ep) return reply.notFound("Episode not found");
      await assertLibraryAccess(ep.libraryId, user.id, "viewer");

      const sheet = await db.query.episodeThumbnails.findFirst({
        where: eq(episodeThumbnails.episodeId, req.params.id),
      });
      if (!sheet) return reply.notFound("No thumbnails for this episode");
      return {
        episodeId: sheet.episodeId,
        intervalSec: sheet.intervalSec,
        cols: sheet.cols,
        rows: sheet.rows,
        thumbWidth: sheet.thumbWidth,
        thumbHeight: sheet.thumbHeight,
        url: `/api/v1/episodes/${sheet.episodeId}/thumbnails/sheet.jpg`,
      };
    },
  );

  r.get(
    "/episodes/:id/thumbnails/sheet.jpg",
    {
      schema: { tags: ["thumbnails"], params: z.object({ id: z.string().uuid() }) },
    },
    async (req, reply) => {
      const user = requireUser(req);
      const ep = await db
        .select({ libraryId: courses.libraryId })
        .from(episodes)
        .innerJoin(courses, eq(courses.id, episodes.courseId))
        .where(eq(episodes.id, req.params.id))
        .limit(1)
        .then((r) => r[0]);
      if (!ep) return reply.notFound();
      await assertLibraryAccess(ep.libraryId, user.id, "viewer");

      const sheet = await db.query.episodeThumbnails.findFirst({
        where: eq(episodeThumbnails.episodeId, req.params.id),
      });
      if (!sheet) return reply.notFound();
      try {
        const stat = statSync(sheet.spriteImagePath);
        reply
          .header("Content-Type", "image/jpeg")
          .header("Content-Length", stat.size)
          .header("Cache-Control", "public, max-age=31536000, immutable");
        return reply.send(createReadStream(sheet.spriteImagePath));
      } catch {
        return reply.notFound();
      }
    },
  );

  r.get(
    "/courses/:id/cover.jpg",
    { schema: { tags: ["thumbnails"], params: z.object({ id: z.string().uuid() }) } },
    async (req, reply) => {
      const user = requireUser(req);
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, req.params.id),
      });
      if (!course || !course.coverImagePath) return reply.notFound();
      await assertLibraryAccess(course.libraryId, user.id, "viewer");
      try {
        const stat = statSync(course.coverImagePath);
        reply
          .header("Content-Type", "image/jpeg")
          .header("Content-Length", stat.size)
          .header("Cache-Control", "public, max-age=86400");
        return reply.send(createReadStream(course.coverImagePath));
      } catch {
        return reply.notFound();
      }
    },
  );

  r.post(
    "/courses/:id/cover/auto",
    {
      schema: {
        tags: ["thumbnails"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, req.params.id),
      });
      if (!course) throw new Error("Course not found");
      await assertLibraryAccess(course.libraryId, user.id, "editor");
      await thumbnailsService.buildCourseCover(req.params.id);
      return { ok: true as const };
    },
  );
}
