import type { Reporter } from "vitest/reporters";
import type { File, Task } from "vitest";
import { basename } from "path";

function countTests(tasks: Task[]): { total: number; failed: number } {
  let total = 0;
  let failed = 0;
  for (const task of tasks) {
    if (task.type === "test" || task.type === "custom") {
      total++;
      if (task.result?.state === "fail") failed++;
    } else if (task.type === "suite") {
      const sub = countTests(task.tasks);
      total += sub.total;
      failed += sub.failed;
    }
  }
  return { total, failed };
}

export default class TestResultsReporter implements Reporter {
  onFinished(files: File[] = []) {
    if (!files.length) return;

    const rows = files.map((file) => {
      const { total, failed } = countTests(file.tasks);
      const ms = Math.round(file.result?.duration ?? 0);
      return { name: basename(file.name), total, failed, duration: `${ms}ms` };
    });

    const cols = ["testFile", "tests", "failed", "duration"];
    const data = rows.map((r) => [r.name, String(r.total), String(r.failed), r.duration]);
    const widths = cols.map((col, i) => Math.max(col.length, ...data.map((r) => r[i].length)));
    const divider = widths.map((w) => "─".repeat(w + 2)).join("─");
    const fmt = (row: string[]) => row.map((c, i) => c.padStart(widths[i])).join("  ");

    console.log("\nTest Results");
    console.log(divider);
    console.log(fmt(cols));
    console.log(divider);
    data.forEach((r) => console.log(fmt(r)));
    console.log(divider);

    const totalTests = rows.reduce((s, r) => s + r.total, 0);
    const totalFailed = rows.reduce((s, r) => s + r.failed, 0);
    console.log(
      totalFailed > 0
        ? `${totalTests - totalFailed} passed, ${totalFailed} failed\n`
        : `All ${totalTests} tests passed\n`,
    );
  }
}
