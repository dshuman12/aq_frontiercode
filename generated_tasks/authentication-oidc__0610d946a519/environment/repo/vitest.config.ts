import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import { config } from "dotenv";

if (process.env.NODE_ENV !== "production") {
  console.log("Loading environment variables from .env file for local development");

  config();
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    hookTimeout: 60_000,
    testTimeout: 20_000,
    globalSetup: "src/test-e2e/local-runner/setup.ts",
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results.xml",
    },
  },
});
