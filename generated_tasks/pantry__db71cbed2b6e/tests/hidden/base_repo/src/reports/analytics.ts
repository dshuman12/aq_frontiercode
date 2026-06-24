// Higher-level analytics over the change-log:
// - item churn: how often a slug oscillates between "stocked" and "empty"
// - season heatmap: when in the year a slug tends to be added

import type { Event } from "../core/event.js";

export interface ChurnEntry {
  slug: string;
  emptyToStockedTransitions: number;
  stockedToEmptyTransitions: number;
}

export function churn(events: Event[]): ChurnEntry[] {
  const map = new Map<string, { ets: number; ste: number; lastStocked: boolean }>();
  for (const e of events) {
    if (!e.itemSlug) continue;
    if (e.kind !== "lot.add" && e.kind !== "lot.use" && e.kind !== "lot.discard") continue;
    const cur = map.get(e.itemSlug) ?? { ets: 0, ste: 0, lastStocked: false };
    if (e.kind === "lot.add") {
      if (!cur.lastStocked) cur.ets++;
      cur.lastStocked = true;
    } else if (e.kind === "lot.use" || e.kind === "lot.discard") {
      // We don't actually know if this empties the item without further info.
      // Approximation: if the detail string mentions "empty", treat as transition.
      if (cur.lastStocked && (e.detail ?? "").toLowerCase().includes("empty")) {
        cur.ste++;
        cur.lastStocked = false;
      }
    }
    map.set(e.itemSlug, cur);
  }
  return [...map.entries()].map(([slug, v]) => ({
    slug,
    emptyToStockedTransitions: v.ets,
    stockedToEmptyTransitions: v.ste,
  }));
}

/** Map month (1..12) -> count of lot.add events that happened in that month. */
export function seasonHeatmap(events: Event[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) out[m] = 0;
  for (const e of events) {
    if (e.kind !== "lot.add") continue;
    const d = new Date(e.at);
    if (!Number.isFinite(d.getTime())) continue;
    const m = d.getUTCMonth() + 1;
    out[m] = (out[m] ?? 0) + 1;
  }
  return out;
}

/** Total events per kind. */
export function eventTotals(events: Event[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
}

/** Active days = distinct dates across all events. */
export function activeDays(events: Event[]): number {
  const set = new Set<string>();
  for (const e of events) set.add(e.at.slice(0, 10));
  return set.size;
}

/** Mean events per active day. */
export function meanPerActiveDay(events: Event[]): number {
  const days = activeDays(events);
  if (days === 0) return 0;
  return Math.round((events.length / days) * 10) / 10;
}
