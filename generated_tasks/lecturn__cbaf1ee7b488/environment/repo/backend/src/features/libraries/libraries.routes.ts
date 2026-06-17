import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { env } from "~/config/env";
import { requireUser } from "~/features/auth/middleware";
import { librariesService } from "./libraries.service";

const LibraryRow = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sourcePath: z.string(),
  ownerId: z.string().uuid(),
  ownerEmail: z.string(),
  ownerName: z.string(),
  role: z.enum(["owner", "editor", "viewer"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export async function librariesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/libraries",
    {
      schema: {
        response: { 200: z.object({ items: z.array(LibraryRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      // Bootstrap a default library so a brand-new account never sees an empty UI.
      await librariesService.ensureDefault(user.id, env.LIBRARY_ROOT);
      const items = await librariesService.listForUser(user.id);
      return { items };
    },
  );

  r.post(
    "/libraries",
    {
      schema: {
        body: z.object({
          name: z.string().min(1).max(80),
          sourcePath: z.string().min(1),
        }),
        response: { 200: z.object({ id: z.string().uuid() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const lib = await librariesService.create({ ...req.body, ownerId: user.id });
      return { id: lib.id };
    },
  );

  r.patch(
    "/libraries/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(1).max(80).optional(),
          sourcePath: z.string().min(1).optional(),
        }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const patch: { name?: string; sourcePath?: string } = {};
      if (req.body.name !== undefined) patch.name = req.body.name;
      if (req.body.sourcePath !== undefined) patch.sourcePath = req.body.sourcePath;
      await librariesService.update(req.params.id, user.id, patch);
      return { ok: true as const };
    },
  );

  r.delete(
    "/libraries/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await librariesService.remove(req.params.id, user.id);
      return reply.status(204).send(null);
    },
  );
}
