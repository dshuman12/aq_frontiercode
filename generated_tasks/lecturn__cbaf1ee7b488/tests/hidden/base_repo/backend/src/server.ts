import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "~/config/env";
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
import { startTranscodeWorker } from "~/features/transcode/worker";
import { watchLaterRoutes } from "~/features/watch-later/watch-later.routes";
import { registerErrorHandler } from "~/plugins/error-handler";
import { registerOpenApi } from "~/plugins/openapi";

// Split because exactOptionalPropertyTypes rejects `transport: undefined` on Fastify's union type.
const loggerConfig =
  env.NODE_ENV === "development"
    ? {
        level: env.API_LOG_LEVEL,
        transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } },
      }
    : { level: env.API_LOG_LEVEL };

const baseApp = Fastify({ logger: loggerConfig });
const app = baseApp.withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: env.API_CORS_ORIGIN.split(","),
  credentials: true,
});
await app.register(sensible);
await app.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
  // Auth routes apply a tighter per-route limit via routeOptions.
  allowList: () => false,
});

// Pass the pre-typeprovider handle so plain FastifyInstance signatures line up.
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

startTranscodeWorker();

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}
