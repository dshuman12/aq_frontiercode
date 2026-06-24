// Replay the change log to reconstruct an item's lifecycle.
// Used to answer "where did lot 17 come from?".

import type { Event } from "../core/event.js";

export interface Lifecycle {
  itemSlug: string;
  events: Event[];
  totalLotEvents: number;
  firstSeen?: string;
  lastSeen?: string;
}

export function reconstruct(events: Event[], itemSlug: string): Lifecycle {
  const filtered = events
    .filter((e) => e.itemSlug === itemSlug)
    .sort((a, b) => a.at.localeCompare(b.at));
  const lifecycle: Lifecycle = {
    itemSlug,
    events: filtered,
    totalLotEvents: filtered.filter((e) =>
      e.kind === "lot.add" || e.kind === "lot.use" || e.kind === "lot.discard"
    ).length,
  };
  if (filtered.length > 0) {
    lifecycle.firstSeen = filtered[0]!.at;
    lifecycle.lastSeen = filtered[filtered.length - 1]!.at;
  }
  return lifecycle;
}

export function reconstructAll(events: Event[]): Map<string, Lifecycle> {
  const slugs = new Set<string>();
  for (const e of events) {
    if (e.itemSlug) slugs.add(e.itemSlug);
  }
  const out = new Map<string, Lifecycle>();
  for (const slug of slugs) out.set(slug, reconstruct(events, slug));
  return out;
}

export function timeline(events: Event[]): string {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  return sorted
    .map((e) => `${e.at}  ${e.kind.padEnd(14)} ${e.itemSlug ?? ""}  ${e.detail ?? ""}`)
    .join("\n") + "\n";
}

export function summary(life: Lifecycle): string {
  const lines: string[] = [];
  lines.push(`# ${life.itemSlug}`);
  lines.push(`first seen: ${life.firstSeen ?? "(never)"}`);
  lines.push(`last seen:  ${life.lastSeen ?? "(never)"}`);
  lines.push(`lot events: ${life.totalLotEvents}`);
  return lines.join("\n") + "\n";
}
