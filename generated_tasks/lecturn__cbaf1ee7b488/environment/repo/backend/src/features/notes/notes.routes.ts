import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { highlightsService, notesService } from "./notes.service";

const NoteRow = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  atSec: z.number().nullable(),
  body: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const HighlightRow = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  startSec: z.number(),
  endSec: z.number(),
  text: z.string().nullable(),
  color: z.string(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export async function notesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/episodes/:id/notes",
    {
      schema: {
        tags: ["notes"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(NoteRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await notesService.list(req.params.id, user.id);
      return { items };
    },
  );

  r.post(
    "/episodes/:id/notes",
    {
      schema: {
        tags: ["notes"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          body: z.string().min(1),
          atSec: z.number().min(0).nullable().optional(),
        }),
        response: { 200: z.object({ id: z.string().uuid() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const created = await notesService.create({
        userId: user.id,
        episodeId: req.params.id,
        body: req.body.body,
        atSec: req.body.atSec ?? null,
      });
      return { id: created.id };
    },
  );

  r.patch(
    "/notes/:noteId",
    {
      schema: {
        tags: ["notes"],
        params: z.object({ noteId: z.string().uuid() }),
        body: z.object({
          body: z.string().min(1).optional(),
          atSec: z.number().min(0).nullable().optional(),
        }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const patch: { body?: string; atSec?: number | null } = {};
      if (req.body.body !== undefined) patch.body = req.body.body;
      if (req.body.atSec !== undefined) patch.atSec = req.body.atSec;
      await notesService.update({ noteId: req.params.noteId, userId: user.id, ...patch });
      return { ok: true as const };
    },
  );

  r.delete(
    "/notes/:noteId",
    {
      schema: {
        tags: ["notes"],
        params: z.object({ noteId: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await notesService.remove(req.params.noteId, user.id);
      return reply.status(204).send(null);
    },
  );

  r.get(
    "/episodes/:id/highlights",
    {
      schema: {
        tags: ["highlights"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(HighlightRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await highlightsService.list(req.params.id, user.id);
      return { items };
    },
  );

  r.post(
    "/episodes/:id/highlights",
    {
      schema: {
        tags: ["highlights"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          startSec: z.number().min(0),
          endSec: z.number().min(0),
          text: z.string().nullable().optional(),
          color: z.string().min(1).max(20).optional(),
          note: z.string().nullable().optional(),
        }),
        response: { 200: z.object({ id: z.string().uuid() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const { startSec, endSec, text, color, note } = req.body;
      const created = await highlightsService.create({
        userId: user.id,
        episodeId: req.params.id,
        startSec,
        endSec,
        ...(text !== undefined ? { text } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(note !== undefined ? { note } : {}),
      });
      return { id: created.id };
    },
  );

  r.delete(
    "/highlights/:highlightId",
    {
      schema: {
        tags: ["highlights"],
        params: z.object({ highlightId: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await highlightsService.remove(req.params.highlightId, user.id);
      return reply.status(204).send(null);
    },
  );
}
