import type { FastifyInstance } from "fastify";
import { auth } from "./auth";
import { fastifyHeadersToWeb } from "./middleware";

// Bridges Fastify's req/reply onto better-auth's single Web fetch handler.
export async function authRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    config: { rateLimit: false },
    async handler(req, reply) {
      const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
      const headers = fastifyHeadersToWeb(req);

      const init: RequestInit = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined) {
        init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        if (!headers.has("content-type")) headers.set("content-type", "application/json");
      }

      const response = await auth.handler(new Request(url.toString(), init));

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      const text = await response.text();
      reply.send(text || null);
    },
  });
}
