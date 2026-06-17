import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Session, User } from "~/db/schema";
import { auth } from "./auth";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    session?: Session;
  }
}

function fastifyHeadersToWeb(req: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }
  return headers;
}

export { fastifyHeadersToWeb };

// Anonymous requests pass through with req.user/session undefined; per-route guards enforce auth.
export function registerAuth(app: FastifyInstance) {
  app.addHook("preHandler", async (req) => {
    try {
      const headers = fastifyHeadersToWeb(req);
      const result = await auth.api.getSession({ headers });
      if (result) {
        req.user = result.user as unknown as User;
        req.session = result.session as unknown as Session;
      }
    } catch (err) {
      req.log.warn({ err }, "session resolution failed");
    }
  });
}

export function requireUser(req: FastifyRequest): User {
  if (!req.user) {
    const err = new Error("Unauthorized") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  return req.user;
}
