import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

interface HttpError {
  name?: string;
  message?: string;
  statusCode?: number;
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "ValidationError",
        issues: error.flatten().fieldErrors,
      });
    }

    request.log.error({ err: error }, "Unhandled error");
    const httpErr = error as HttpError;
    const status = httpErr.statusCode ?? 500;
    return reply.status(status).send({
      error: httpErr.name || "InternalServerError",
      message: status >= 500 ? "Something went wrong." : (httpErr.message ?? "Error"),
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: "NotFound", message: "Route not found." });
  });
}
