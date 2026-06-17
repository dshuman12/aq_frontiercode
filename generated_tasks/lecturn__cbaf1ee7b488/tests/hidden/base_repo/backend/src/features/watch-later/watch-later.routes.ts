import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { watchLaterService } from "./watch-later.service";

const QueueItem = z.object({
  episodeId: z.string().uuid(),
  episodeTitle: z.string(),
  episodeDurationSec: z.number().int(),
  positionSec: z.number(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  courseSlug: z.string(),
  libraryId: z.string().uuid(),
  addedAt: z.coerce.date().nullable(),
  position: z.number().int().nullable(),
  source: z.enum(["queued", "in_progress"]),
});

export async function watchLaterRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/queue",
    {
      schema: {
        tags: ["queue"],
        response: {
          200: z.object({
            queued: z.array(QueueItem),
            continueWatching: z.array(QueueItem),
          }),
        },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const [queued, continueWatching] = await Promise.all([
        watchLaterService.listQueue(user.id),
        watchLaterService.listContinueWatching(user.id),
      ]);
      return { queued, continueWatching };
    },
  );

  r.post(
    "/queue/:episodeId",
    {
      schema: {
        tags: ["queue"],
        params: z.object({ episodeId: z.string().uuid() }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      await watchLaterService.add(user.id, req.params.episodeId);
      return { ok: true as const };
    },
  );

  r.delete(
    "/queue/:episodeId",
    {
      schema: {
        tags: ["queue"],
        params: z.object({ episodeId: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await watchLaterService.remove(user.id, req.params.episodeId);
      return reply.status(204).send(null);
    },
  );

  r.put(
    "/queue/order",
    {
      schema: {
        tags: ["queue"],
        body: z.object({ episodeIds: z.array(z.string().uuid()).max(500) }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      await watchLaterService.reorder(user.id, req.body.episodeIds);
      return { ok: true as const };
    },
  );
}
