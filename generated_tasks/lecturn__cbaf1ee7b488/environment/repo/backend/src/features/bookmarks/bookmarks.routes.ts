import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { bookmarksService } from "./bookmarks.service";

const BookmarkRow = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  atSec: z.number(),
  label: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export async function bookmarksRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/episodes/:id/bookmarks",
    {
      schema: {
        tags: ["bookmarks"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(BookmarkRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await bookmarksService.list(req.params.id, user.id);
      return {
        items: items.map((b) => ({
          id: b.id,
          episodeId: b.episodeId,
          atSec: b.atSec,
          label: b.label,
          createdAt: b.createdAt,
        })),
      };
    },
  );

  r.post(
    "/episodes/:id/bookmarks",
    {
      schema: {
        tags: ["bookmarks"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          atSec: z.number().min(0),
          label: z.string().max(120).optional(),
        }),
        response: { 200: z.object({ id: z.string().uuid() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const { atSec, label } = req.body;
      const created = await bookmarksService.create({
        userId: user.id,
        episodeId: req.params.id,
        atSec,
        ...(label !== undefined ? { label } : {}),
      });
      return { id: created.id };
    },
  );

  r.patch(
    "/bookmarks/:bookmarkId",
    {
      schema: {
        tags: ["bookmarks"],
        params: z.object({ bookmarkId: z.string().uuid() }),
        body: z.object({
          label: z.string().max(120).nullable().optional(),
          atSec: z.number().min(0).optional(),
        }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const patch: { label?: string | null; atSec?: number } = {};
      if (req.body.label !== undefined) patch.label = req.body.label;
      if (req.body.atSec !== undefined) patch.atSec = req.body.atSec;
      await bookmarksService.update({
        bookmarkId: req.params.bookmarkId,
        userId: user.id,
        ...patch,
      });
      return { ok: true as const };
    },
  );

  r.delete(
    "/bookmarks/:bookmarkId",
    {
      schema: {
        tags: ["bookmarks"],
        params: z.object({ bookmarkId: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await bookmarksService.remove(req.params.bookmarkId, user.id);
      return reply.status(204).send(null);
    },
  );
}
