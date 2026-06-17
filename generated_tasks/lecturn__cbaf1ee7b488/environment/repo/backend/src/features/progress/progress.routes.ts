import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "~/db/client";
import { courses, episodes, progress } from "~/db/schema";
import { requireUser } from "~/features/auth/middleware";
import { assertLibraryAccess } from "~/features/libraries/access";

const params = z.object({ episodeId: z.string().uuid() });
const body = z.object({
  positionSec: z.number().min(0),
  completed: z.boolean().optional(),
});

export async function progressRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  // Player heartbeat. Library access is checked before any write so a stranger can't poison resume state.
  r.put(
    "/progress/:episodeId",
    { schema: { params, body } },
    async (req, reply) => {
      const user = requireUser(req);

      const epRow = await db
        .select({
          id: episodes.id,
          courseId: episodes.courseId,
          durationSec: episodes.durationSec,
          libraryId: courses.libraryId,
        })
        .from(episodes)
        .innerJoin(courses, eq(courses.id, episodes.courseId))
        .where(eq(episodes.id, req.params.episodeId))
        .limit(1)
        .then((rows) => rows[0]);
      if (!epRow) return reply.notFound("Episode not found");

      await assertLibraryAccess(epRow.libraryId, user.id, "viewer");

      const completed =
        req.body.completed ??
        (epRow.durationSec > 0 && req.body.positionSec / epRow.durationSec >= 0.95);

      await db
        .insert(progress)
        .values({
          userId: user.id,
          episodeId: epRow.id,
          positionSec: req.body.positionSec,
          completed: completed ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: [progress.userId, progress.episodeId],
          set: {
            positionSec: req.body.positionSec,
            completed: completed ? 1 : 0,
            updatedAt: sql`now()`,
          },
        });

      await db
        .update(courses)
        .set({ lastWatchedAt: sql`now()` })
        .where(and(eq(courses.id, epRow.courseId), eq(courses.libraryId, epRow.libraryId)));

      return reply.status(204).send(null);
    },
  );
}
