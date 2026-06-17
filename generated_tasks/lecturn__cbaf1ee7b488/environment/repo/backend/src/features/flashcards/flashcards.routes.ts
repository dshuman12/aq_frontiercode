import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { flashcardsService } from "./flashcards.service";

const cardStateSchema = z.enum(["new", "learning", "review", "relearning"]);

const FlashcardRow = z.object({
  id: z.string().uuid(),
  front: z.string(),
  back: z.string(),
  state: cardStateSchema,
  stability: z.number(),
  difficulty: z.number(),
  reps: z.number().int(),
  lapses: z.number().int(),
  dueAt: z.coerce.date(),
  lastReviewedAt: z.coerce.date().nullable(),
  episodeId: z.string().uuid().nullable(),
  courseId: z.string().uuid().nullable(),
  sourceNoteId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ratingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export async function flashcardsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/flashcards",
    {
      schema: {
        tags: ["flashcards"],
        querystring: z.object({
          episodeId: z.string().uuid().optional(),
          courseId: z.string().uuid().optional(),
        }),
        response: { 200: z.object({ items: z.array(FlashcardRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await flashcardsService.list({
        userId: user.id,
        ...(req.query.episodeId !== undefined ? { episodeId: req.query.episodeId } : {}),
        ...(req.query.courseId !== undefined ? { courseId: req.query.courseId } : {}),
      });
      return { items };
    },
  );

  r.get(
    "/flashcards/due",
    {
      schema: {
        tags: ["flashcards"],
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
        }),
        response: { 200: z.object({ items: z.array(FlashcardRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await flashcardsService.listDue(user.id, new Date(), req.query.limit);
      return { items };
    },
  );

  r.post(
    "/flashcards",
    {
      schema: {
        tags: ["flashcards"],
        body: z.object({
          front: z.string().min(1).max(2000),
          back: z.string().min(1).max(4000),
          episodeId: z.string().uuid().nullable().optional(),
          courseId: z.string().uuid().nullable().optional(),
          sourceNoteId: z.string().uuid().nullable().optional(),
        }),
        response: { 200: z.object({ id: z.string().uuid() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const created = await flashcardsService.create({
        userId: user.id,
        front: req.body.front,
        back: req.body.back,
        episodeId: req.body.episodeId ?? null,
        courseId: req.body.courseId ?? null,
        sourceNoteId: req.body.sourceNoteId ?? null,
      });
      return { id: created.id };
    },
  );

  r.patch(
    "/flashcards/:cardId",
    {
      schema: {
        tags: ["flashcards"],
        params: z.object({ cardId: z.string().uuid() }),
        body: z.object({
          front: z.string().min(1).max(2000).optional(),
          back: z.string().min(1).max(4000).optional(),
        }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const patch: { front?: string; back?: string } = {};
      if (req.body.front !== undefined) patch.front = req.body.front;
      if (req.body.back !== undefined) patch.back = req.body.back;
      await flashcardsService.update({
        cardId: req.params.cardId,
        userId: user.id,
        ...patch,
      });
      return { ok: true as const };
    },
  );

  r.delete(
    "/flashcards/:cardId",
    {
      schema: {
        tags: ["flashcards"],
        params: z.object({ cardId: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await flashcardsService.remove(req.params.cardId, user.id);
      return reply.status(204).send(null);
    },
  );

  r.post(
    "/flashcards/:cardId/review",
    {
      schema: {
        tags: ["flashcards"],
        params: z.object({ cardId: z.string().uuid() }),
        body: z.object({ rating: ratingSchema }),
        response: {
          200: z.object({
            state: cardStateSchema,
            dueAt: z.coerce.date(),
            scheduledDays: z.number(),
          }),
        },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const outcome = await flashcardsService.review({
        cardId: req.params.cardId,
        userId: user.id,
        rating: req.body.rating,
      });
      return {
        state: outcome.state,
        dueAt: outcome.dueAt,
        scheduledDays: outcome.scheduledDays,
      };
    },
  );
}
