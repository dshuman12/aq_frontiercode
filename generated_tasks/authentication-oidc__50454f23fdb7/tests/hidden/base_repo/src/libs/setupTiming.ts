import { appendFileSync } from "fs";
import { basename, join } from "path";
import { tmpdir } from "os";

export const TIMING_FILE = join(tmpdir(), "vitest-setup-timing.ndjson");

export type SetupTimingEntry = {
  testFile: string;
  codePath: string;
  steps: {
    clientBuild: number;
    createCustomer: number;
    createCreditAccount: number;
  };
  total: number;
};

export const getCallerTestFile = (): string => {
  const stack = new Error().stack ?? "";
  for (const line of stack.split("\n")) {
    const match =
      line.match(/\((.+\.test\.ts):\d+:\d+\)/) ?? line.match(/at (.+\.test\.ts):\d+:\d+/);
    if (match) return basename(match[1]);
  }
  return "unknown";
};

export const recordSetupTiming = (entry: SetupTimingEntry): void => {
  try {
    appendFileSync(TIMING_FILE, JSON.stringify(entry) + "\n");
  } catch {
    // non-fatal — don't break tests if timing write fails
  }
};
