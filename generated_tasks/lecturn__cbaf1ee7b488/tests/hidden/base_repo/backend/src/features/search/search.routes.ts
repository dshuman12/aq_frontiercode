import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { searchService } from "./search.service";

const Hit = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("course"),
    id: z.string().uuid(),
    libraryId: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    rank: z.number(),
  }),
  z.object({
    type: z.literal("episode"),
    id: z.string().uuid(),
    libraryId: z.string().uuid(),
    courseId: z.string().uuid(),
    courseTitle: z.string(),
    title: z.string(),
    rank: z.number(),
  }),
]);

export async function searchRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/search",
    {
      schema: {
        tags: ["search"],
        querystring: z.object({
          q: z.string().min(1).max(200),
          limit: z.coerce.number().int().min(1).max(50).optional(),
        }),
        response: { 200: z.object({ items: z.array(Hit) }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      const items = await searchService.search(
        req.query.q,
        user.id,
        req.query.limit ?? 20,
      );
      return { items };
    },
  );
}
