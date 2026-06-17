import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "~/features/auth/middleware";
import { assertLibraryAccess } from "~/features/libraries/access";
import { libraryService } from "./library.service";

export async function libraryRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/library/sync",
    {
      schema: {
        body: z.object({ libraryId: z.string().uuid() }),
        response: { 200: z.object({ scanned: z.number(), inserted: z.number() }) },
      },
    },
    async (req) => {
      const user = requireUser(req);
      await assertLibraryAccess(req.body.libraryId, user.id, "editor");
      return libraryService.sync(req.body.libraryId);
    },
  );
}
