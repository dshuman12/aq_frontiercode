import { GlobalSetupContext } from "vitest/node";
import { serve } from "@hono/node-server";
import { app } from "./api";
import { findFreePort } from "./utils";
import devcert from "@expo/devcert";
import { createServer } from "https";

declare module "vitest" {
  export interface ProvidedContext {
    apiURL: string;
  }
}

const domain = "local.app";
export default async function setup({ provide }: GlobalSetupContext): Promise<void> {
  if (!process.env.TEST_LOCAL) return;
  console.info("Running local server...");
  const ssl = await devcert.certificateFor(domain, {
    getCaPath: true,
    getCaBuffer: true,
  });

  serve(
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
}
