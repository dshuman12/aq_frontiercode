import { GlobalSetupContext } from "vitest/node";
import { serve } from "@hono/node-server";
import devcert from "@expo/devcert";
import { createServer } from "https";
declare module "vitest" {
  export interface ProvidedContext {
    apiURL: string;
  }
}

const domain = "local.app";
export default async function setup({ provide }: GlobalSetupContext): Promise<(() => void) | void> {
  if (!process.env.TEST_LOCAL) {
    console.warn("TEST_LOCAL env variable not set. Skipping local server setup.");
    return;
  }

  (globalThis as any).__HANDLER_NAME__ = "local-runner";
  const { app } = await import("./api");
  const { findFreePort } = await import("./utils");
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  console.info("Running local server...");
  const ssl = await devcert.certificateFor(domain, {
    getCaPath: true,
    getCaBuffer: true,
  });

  const server = serve(
    {
      fetch: app.fetch,
      port: await findFreePort(),
      createServer: createServer,
      serverOptions: {
        key: ssl.key,
        cert: ssl.cert,
        ca: ssl.ca,
      },
    },
    (info) => {
      const url = `${domain}:${info.port}`;
      provide("apiURL", url);
      console.log(`Listening on https://${url}`);
    },
  );

  return () => {
    server.close();
  };
}
