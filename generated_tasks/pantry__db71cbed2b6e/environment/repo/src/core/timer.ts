// Compute prep + cook timing for a recipe based on phases.
//
// We don't actually parse recipe.steps (too unstructured); instead the
// caller supplies a small list of phases with min durations. This
// module's value is figuring out which phases can run in parallel.

export interface Phase {
  name: string;
  minutes: number;
  /** What this phase needs (must be done) before starting. */
  requires?: string[];
  /** Free name; if true, may overlap with another concurrent phase. */
  passive?: boolean;
}

export interface Schedule {
  events: Array<{ phase: string; startAt: number; endAt: number }>;
  totalMinutes: number;
}

export function schedule(phases: Phase[]): Schedule {
  const completedAt = new Map<string, number>();
  const activePassive: number[] = [];
  let cursor = 0;
  const events: Schedule["events"] = [];
  const remaining = [...phases];
  while (remaining.length > 0) {
    let progressed = false;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i]!;
      const ready = (p.requires ?? []).every((r) => completedAt.has(r));
      if (!ready) continue;
      const start = (p.requires ?? []).reduce(
        (acc, r) => Math.max(acc, completedAt.get(r) ?? 0),
        cursor,
      );
      const startAt = p.passive ? start : Math.max(start, cursor);
      const endAt = startAt + p.minutes;
      events.push({ phase: p.name, startAt, endAt });
      completedAt.set(p.name, endAt);
      if (!p.passive) cursor = endAt;
      else activePassive.push(endAt);
      remaining.splice(i, 1);
      progressed = true;
      break;
    }
    if (!progressed) {
      throw new Error("schedule: cycle in phase dependencies");
    }
  }
  const total = Math.max(cursor, ...activePassive, 0);
  return { events, totalMinutes: total };
}

export function format(s: Schedule): string {
  const lines: string[] = [];
  lines.push(`total: ${s.totalMinutes} minutes`);
  for (const e of s.events) {
    lines.push(`  +${e.startAt}m -> +${e.endAt}m  ${e.phase}`);
  }
  return lines.join("\n") + "\n";
}

export function criticalPath(s: Schedule): string[] {
  const sorted = [...s.events].sort((a, b) => b.endAt - a.endAt);
  const last = sorted[0];
  if (!last) return [];
  return [last.phase];
}
