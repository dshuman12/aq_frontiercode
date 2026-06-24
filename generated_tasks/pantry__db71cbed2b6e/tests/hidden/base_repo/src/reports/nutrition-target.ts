// Track daily macro targets and how each day's intake stacks up.

import type { Macros } from "../core/nutrition.js";

export interface Targets {
  calMin?: number;
  calMax?: number;
  proteinMin?: number;
  carbsMax?: number;
  fatMax?: number;
}

export interface TargetReport {
  date: string;
  intake: Macros;
  hits: Record<string, "below" | "ok" | "above">;
}

export function evaluate(date: string, intake: Macros, targets: Targets): TargetReport {
  const hits: Record<string, "below" | "ok" | "above"> = {};
  if (targets.calMin !== undefined) {
    hits["cal-min"] = intake.cal < targets.calMin ? "below" : "ok";
  }
  if (targets.calMax !== undefined) {
    hits["cal-max"] = intake.cal > targets.calMax ? "above" : "ok";
  }
  if (targets.proteinMin !== undefined) {
    hits["protein-min"] = intake.protein < targets.proteinMin ? "below" : "ok";
  }
  if (targets.carbsMax !== undefined) {
    hits["carbs-max"] = intake.carbs > targets.carbsMax ? "above" : "ok";
  }
  if (targets.fatMax !== undefined) {
    hits["fat-max"] = intake.fat > targets.fatMax ? "above" : "ok";
  }
  return { date, intake, hits };
}

export function evaluateMany(
  intakes: Array<{ date: string; intake: Macros }>,
  targets: Targets,
): TargetReport[] {
  return intakes.map((d) => evaluate(d.date, d.intake, targets));
}

export function violationCount(report: TargetReport): number {
  let n = 0;
  for (const v of Object.values(report.hits)) if (v !== "ok") n++;
  return n;
}

export function format(report: TargetReport): string {
  const flags = Object.entries(report.hits)
    .filter(([, v]) => v !== "ok")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  if (!flags) return `${report.date}  ok  cal=${report.intake.cal.toFixed(0)}`;
  return `${report.date}  ${flags}  cal=${report.intake.cal.toFixed(0)}`;
}

export function defaults(): Targets {
  return {
    calMin: 1800, calMax: 2400,
    proteinMin: 60, carbsMax: 320, fatMax: 90,
  };
}
