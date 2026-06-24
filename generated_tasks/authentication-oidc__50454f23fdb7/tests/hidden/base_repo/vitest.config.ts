import os from "os";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import yaml from "@modyfi/vite-plugin-yaml";

import { config } from "dotenv";

const cpus = os.availableParallelism?.() ?? os.cpus().length;

if (process.env.NODE_ENV !== "production") {
  console.log("Loading environment variables from .env file for local development");

  config();
}

export default defineConfig({
  plugins: [tsconfigPaths(), yaml()],
  define: { __HANDLER_NAME__: JSON.stringify("test") },
  test: {
    env: {
      SUPPRESS_LOGS: "true",
    },
    hookTimeout: 250_000,
    testTimeout: 20_000,
    globalSetup: "src/test-e2e/local-runner/setup.ts",
    reporters: process.env.CI
      ? ["junit", "hanging-process", "./src/libs/setupTimingReporter.ts"]
      : [
          ["basic", { summary: false }],
          "hanging-process",
          "./src/libs/setupTimingReporter.ts",
          "./src/libs/testResultsReporter.ts",
        ],
    poolOptions: {
      forks: { maxForks: Math.ceil(cpus * 1.5) },
    },
  },
});
