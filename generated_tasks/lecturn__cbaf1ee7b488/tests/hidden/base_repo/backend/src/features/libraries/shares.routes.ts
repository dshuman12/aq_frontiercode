import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { sharesService } from "./shares.service";

const Role = z.enum(["viewer", "editor"]);

const ShareRow = z.object({
  id: z.string().uuid(),
  libraryId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  role: Role,
  createdAt: z.coerce.date(),
});

export async function librarySharesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/libraries/:id/shares",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(ShareRow) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await sharesService.listForLibrary(req.params.id, user.id);
      return { items };
    },
  );

  r.post(
    "/libraries/:id/shares",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          email: z.string().email(),
          role: Role.default("viewer"),
        }),
        response: { 200: z.object({ id: z.string().uuid() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const row = await sharesService.invite({
        libraryId: req.params.id,
        callerId: user.id,
        inviteeEmail: req.body.email,
        role: req.body.role,
      });
      if (!row) throw new Error("Failed to create share");
      return { id: row.id };
    },
  );

  r.patch(
    "/libraries/:id/shares/:shareId",
    {
      schema: {
        params: z.object({ id: z.string().uuid(), shareId: z.string().uuid() }),
        body: z.object({ role: Role }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      await sharesService.updateRole(req.params.shareId, user.id, req.body.role);
      return { ok: true as const };
    },
  );

  r.delete(
    "/libraries/:id/shares/:shareId",
    {
      schema: {
        params: z.object({ id: z.string().uuid(), shareId: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const user = requireUser(req);
      await sharesService.revoke(req.params.shareId, user.id);
      return reply.status(204).send(null);
    },
  );

  r.post(
    "/libraries/:id/leave",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      await sharesService.leave(req.params.id, user.id);
      return { ok: true as const };
    },
  );
}
