import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

// Routes are the spec source of truth — jsonSchemaTransform converts each route's Zod schemas to JSON Schema.
export async function registerOpenApi(app: FastifyInstance) {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Lecturn API",
        description:
          "REST API for Lecturn — a self-hosted video course platform with multi-library sharing, adaptive HLS streaming, and per-user progress.",
        version: "1.0.0",
        contact: { name: "Lecturn" },
        license: { name: "MIT" },
      },
      servers: [
        { url: "http://localhost:4000", description: "Local development" },
      ],
      tags: [
        { name: "auth", description: "Sign-up, sign-in, sessions" },
        { name: "libraries", description: "Library CRUD" },
        { name: "shares", description: "Library collaborator invites" },
        { name: "courses", description: "Course catalog and details" },
        { name: "episodes", description: "Episode streaming and metadata" },
        { name: "library", description: "Library scanner / sync" },
        { name: "progress", description: "Per-user playback progress" },
        { name: "subtitles", description: "Subtitle tracks (VTT)" },
        { name: "transcode", description: "HLS playlists, segments, and SSE progress" },
      ],
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "lecturn.session_token",
            description:
              "Session cookie issued by /api/auth/sign-in/email or /api/auth/sign-up/email.",
          },
        },
      },
      security: [{ sessionCookie: [] }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
  });
}
