// Builds a real Fastify instance for integration tests using app.inject().
// We deliberately re-build the app per test file (not per test) — boot is
// fast and isolates plugin-registration side-effects between files.
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { authRoutes } from "~/features/auth/auth.routes";
import { registerAuth } from "~/features/auth/middleware";
import { coursesRoutes } from "~/features/courses/courses.routes";
import { episodesRoutes } from "~/features/episodes/episodes.routes";
import { librariesRoutes } from "~/features/libraries/libraries.routes";
import { librarySharesRoutes } from "~/features/libraries/shares.routes";
import { libraryRoutes } from "~/features/library/library.routes";
import { bookmarksRoutes } from "~/features/bookmarks/bookmarks.routes";
import { flashcardsRoutes } from "~/features/flashcards/flashcards.routes";
import { notesRoutes } from "~/features/notes/notes.routes";
import { progressRoutes } from "~/features/progress/progress.routes";
import { searchRoutes } from "~/features/search/search.routes";
import { subtitlesRoutes } from "~/features/subtitles/subtitles.routes";
import { thumbnailsRoutes } from "~/features/thumbnails/thumbnails.routes";
import { transcodeRoutes } from "~/features/transcode/transcode.routes";
import { watchLaterRoutes } from "~/features/watch-later/watch-later.routes";
import { registerErrorHandler } from "~/plugins/error-handler";
import { registerOpenApi } from "~/plugins/openapi";

let appInstance: ReturnType<typeof Fastify> | null = null;

export async function buildTestApp(): Promise<FastifyInstance> {
  if (appInstance) return appInstance;

  const baseApp = Fastify({ logger: false });
  const app = baseApp.withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);

  registerErrorHandler(baseApp);
  registerAuth(baseApp);

  await registerOpenApi(baseApp);

  app.get("/health", () => ({ status: "ok", service: "lecturn-api" }));
  await app.register(authRoutes);
  await app.register(
    async (api) => {
      await api.register(coursesRoutes);
      await api.register(episodesRoutes);
      await api.register(libraryRoutes);
      await api.register(librariesRoutes);
      await api.register(librarySharesRoutes);
      await api.register(progressRoutes);
      await api.register(subtitlesRoutes);
      await api.register(transcodeRoutes);
      await api.register(bookmarksRoutes);
      await api.register(watchLaterRoutes);
      await api.register(searchRoutes);
      await api.register(notesRoutes);
      await api.register(flashcardsRoutes);
      await api.register(thumbnailsRoutes);
    },
    { prefix: "/api/v1" },
  );

  await app.ready();
  appInstance = baseApp;
  return baseApp;
}

export async function closeTestApp() {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
  }
}
