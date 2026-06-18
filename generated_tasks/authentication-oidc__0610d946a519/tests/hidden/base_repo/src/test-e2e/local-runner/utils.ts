import { createServer } from "net";
import { HttpResponse } from "@onmoapp/core-banking";
import { Context } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { decode } from "hono/jwt";
import { JwtTokenInvalid } from "hono/utils/jwt/types";
import { formatJSONResponse } from "@libs/gatewayUtils";

interface PortOptions {
  startPort?: number;
  endPort?: number;
}

/**
 * Find a free port in the specified range
 * @param options - Port range options
 * @returns The first available port
 */
async function findFreePort(options: PortOptions = {}): Promise<number> {
  const { startPort = 3000, endPort = 65535 } = options;

  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No free ports found between ${startPort} and ${endPort}`);
}

/**
 * Check if a specific port is available
 * @param port - Port number to check
 * @returns True if port is available, false otherwise
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}

function useGatewayHandler<E, O extends HttpResponse>(
  handler: (event: E) => Promise<O | undefined>,
): (ctx: Context) => Promise<Response> {
  return async (ctx: Context) => {
    try {
      const event = await toHandlerEvent(ctx);
      return toHonoResponse(await handler(event as E), ctx);
    } catch (err) {
      if (err instanceof JwtTokenInvalid) {
        return toHonoResponse(
          formatJSONResponse({ statusCode: 401, body: { message: "Unauthorized" } }),
          ctx,
        );
      }
    }
    return toHonoResponse(
      formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } }),
      ctx,
    );
  };
}

function toHonoResponse<T extends HttpResponse>(response: T | undefined, ctx: Context) {
  console.debug("HonoResponse");
  console.dir(
    {
      response,
      path: ctx.req.path,
    },
    { depth: 10 },
  );
  if (response === undefined) return ctx.json({ message: "ok" });

  Object.entries(response.headers).forEach(([key, value]) => {
    ctx.header(key, value);
  });
  ctx.status(response.statusCode as StatusCode);
  return ctx.json(response.body);
}

async function toHandlerEvent(ctx: Context, requestContext: object = {}) {
  const token = ctx.req.header("authorization")?.replace("Bearer ", "");

  const jwt = token && decode(token);
  const auth = {
    onmouuid: jwt && jwt.payload.sub,
    scope: jwt && jwt.payload.scope,
    token_id: jwt && jwt.payload.jti,
  };

  console.log(auth);

  return {
    body: await ctx.req.text(),
    headers: ctx.req.header(),
    httpMethod: ctx.req.method,
    isBase64Encoded: false,
    path: ctx.req.path,
    pathParameters: ctx.req.param(),
    queryStringParameters: ctx.req.query(),
    requestContext: {
      authorizer: {
        ...(jwt ? auth : {}),
        ...requestContext!,
      },
    },
  };
}

export { findFreePort, useGatewayHandler };
