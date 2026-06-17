import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    globalSetup: ["test/global-setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    // Test files share the test DB; run them sequentially so TRUNCATEs
    // between files don't trample each other.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/db/migrate.ts",
        "src/server.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
