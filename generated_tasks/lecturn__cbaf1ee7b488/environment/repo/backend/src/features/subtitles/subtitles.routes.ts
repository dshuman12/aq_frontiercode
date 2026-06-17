import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "~/db/client";
import { courses, episodes, subtitles } from "~/db/schema";
import { requireUser } from "~/features/auth/middleware";
import { assertLibraryAccess } from "~/features/libraries/access";
import { convertSrtToVtt } from "./srt-to-vtt";

const SubtitleRow = z.object({
  id: z.string().uuid(),
  language: z.string(),
  label: z.string(),
  format: z.enum(["srt", "vtt"]),
  isDefault: z.boolean(),
});

const params = z.object({ id: z.string().uuid() });
const trackParams = z.object({
  id: z.string().uuid(),
  language: z.string().min(1).max(20),
});

async function loadEpisodeWithLibrary(episodeId: string) {
  const row = await db
    .select({ id: episodes.id, libraryId: courses.libraryId })
    .from(episodes)
    .innerJoin(courses, eq(courses.id, episodes.courseId))
    .where(eq(episodes.id, episodeId))
    .limit(1)
    .then((rows) => rows[0]);
  return row ?? null;
}

export async function subtitlesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/episodes/:id/subtitles",
    {
      schema: {
        params,
        response: { 200: z.object({ items: z.array(SubtitleRow) }) },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      const ep = await loadEpisodeWithLibrary(req.params.id);
      if (!ep) return reply.notFound("Episode not found");
      await assertLibraryAccess(ep.libraryId, user.id, "viewer");

      const rows = await db
        .select({
          id: subtitles.id,
          language: subtitles.language,
          label: subtitles.label,
          format: subtitles.format,
          isDefault: subtitles.isDefault,
        })
        .from(subtitles)
        .where(eq(subtitles.episodeId, req.params.id));

      return {
        items: rows.map((r) => ({
          id: r.id,
          language: r.language,
          label: r.label,
          format: r.format as "srt" | "vtt",
          isDefault: r.isDefault === 1,
        })),
      };
    },
  );

  // Always serves VTT — SRT is converted on the fly so any fronting CDN sees one wire format.
  r.get(
    "/episodes/:id/subtitles/:language",
    { schema: { params: trackParams } },
    async (req, reply) => {
      const user = requireUser(req);
      const ep = await loadEpisodeWithLibrary(req.params.id);
      if (!ep) return reply.notFound("Episode not found");
      await assertLibraryAccess(ep.libraryId, user.id, "viewer");

      const sub = await db
        .select()
        .from(subtitles)
        .where(
          and(
            eq(subtitles.episodeId, req.params.id),
            eq(subtitles.language, req.params.language),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);
      if (!sub) return reply.notFound("Subtitle track not found");

      let body: string;
      try {
        const raw = await readFile(sub.filePath, "utf-8");
        body = sub.format === "srt" ? convertSrtToVtt(raw) : raw;
      } catch {
        return reply.notFound("Subtitle file missing on disk");
      }

      reply
        .header("Content-Type", "text/vtt; charset=utf-8")
        .header("Cache-Control", "public, max-age=3600");
      return reply.send(body);
    },
  );
}
