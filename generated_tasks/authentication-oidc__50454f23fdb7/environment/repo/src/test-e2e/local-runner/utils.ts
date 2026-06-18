import { createServer } from "net";
import { HttpResponse } from "@onmoapp/core-banking";
import { Context } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { decode } from "hono/jwt";
import { JwtTokenInvalid } from "hono/utils/jwt/types";
import { SERVER_ERROR_RESPONSE, UNAUTHORIZED_RESPONSE } from "@libs/config";

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

    server.listen(port, "0.0.0.0");
  });
}

const mockLambdaContext = {
  awsRequestId: "local-runner",
  functionName: "local-runner",
  functionVersion: "local",
  invokedFunctionArn: "arn:aws:lambda:local:000000000000:function:local-runner",
  memoryLimitInMB: "128",
  logGroupName: "/aws/lambda/local-runner",
  logStreamName: "local",
  getRemainingTimeInMillis: () => 30_000,
  callbackWaitsForEmptyEventLoop: false,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

// requiresAuth mirrors the API Gateway authorizer configuration in terraform/3-gateway.tf.
// Set to false for routes that are NOT behind the Lambda authorizer (i.e. no bearer token required).
// Defaults to true, which short-circuits with 401 if no Authorization header is present.
function useGatewayHandler<E, O extends HttpResponse>(
  handler: (event: E, context: typeof mockLambdaContext) => Promise<O | undefined>,
  { requiresAuth = true }: { requiresAuth?: boolean } = {},
): (ctx: Context) => Promise<Response> {
  return async (ctx: Context) => {
    try {
      const token = ctx.req.header("authorization")?.replace("Bearer ", "");
      if (requiresAuth && !token) {
        return toHonoResponse(UNAUTHORIZED_RESPONSE, ctx);
      }
      const event = await toHandlerEvent(ctx);
      console.dir({ label: "useGatewayHandler", event, path: ctx.req.path }, { depth: 10 });
      return toHonoResponse(await handler(event as E, mockLambdaContext), ctx);
    } catch (err) {
      if (err instanceof JwtTokenInvalid) {
        return toHonoResponse(UNAUTHORIZED_RESPONSE, ctx);
      }
      console.error("useGatewayHandler error", err);
    }
    return toHonoResponse(SERVER_ERROR_RESPONSE, ctx);
  };
}

function toHonoResponse<T extends HttpResponse>(response: T | undefined, ctx: Context) {
  console.dir(
    {
      label: "HonoResponse",
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
      identity: {
        userAgent: ctx.req.header("user-agent"),
      },
    },
  };
}

export { findFreePort, useGatewayHandler };
