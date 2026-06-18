import type { Reporter } from "vitest/reporters";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { TIMING_FILE, type SetupTimingEntry } from "./setupTiming";

export default class SetupTimingReporter implements Reporter {
  onInit() {
    if (existsSync(TIMING_FILE)) unlinkSync(TIMING_FILE);
  }

  onFinished() {
    if (!existsSync(TIMING_FILE)) return;

    const raw = readFileSync(TIMING_FILE, "utf-8").trim();

    try {
      unlinkSync(TIMING_FILE);
    } catch {}

    if (!raw) return;

    const entries: SetupTimingEntry[] = raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    if (!entries.length) return;

    const cols = [
      "#",
      "testFile",
      "codePath",
      "clientBuild",
      "createCustomer",
      "createCreditAccount",
      "total",
    ];
    const rows = entries.map((e, i) => [
      String(i + 1),
      e.testFile,
      e.codePath,
      `${e.steps.clientBuild}ms`,
      `${e.steps.createCustomer}ms`,
      `${e.steps.createCreditAccount}ms`,
      `${e.total}ms`,
    ]);

    const widths = cols.map((col, i) => Math.max(col.length, ...rows.map((r) => r[i].length)));

    const divider = widths.map((w) => "─".repeat(w + 2)).join("─");
    const fmt = (row: string[]) => row.map((c, i) => c.padStart(widths[i])).join("  ");

    console.log("\nSetup Timing Report");
    console.log(divider);
    console.log(fmt(cols));
    console.log(divider);
    rows.forEach((r) => console.log(fmt(r)));
    console.log(divider + "\n");
  }
}
