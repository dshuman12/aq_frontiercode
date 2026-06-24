// Estimate when each item will run out, given recent consumption.
//
// We compute the burn-rate per slug from the last `windowDays` of "use"
// events (drawn from the change log) and divide remaining quantity by
// rate to get a days-remaining figure.

import type { Item } from "../core/item.js";
import { totalQuantity } from "../core/item.js";
import type { Event } from "../core/event.js";
import { plusDays } from "../core/date.js";

export interface UsageEvent {
  slug: string;
  date: string;
  amount: number;
}

export interface ForecastEntry {
  slug: string;
  remaining: number;
  unit: string;
  burnPerDay: number;
  daysRemaining: number;
  estimatedOutAt: string;
}

export function fromEvents(events: Event[]): UsageEvent[] {
  const out: UsageEvent[] = [];
  for (const e of events) {
    if (e.kind !== "lot.use" && e.kind !== "lot.discard") continue;
    if (!e.itemSlug || !e.detail) continue;
    const m = /([0-9]+(?:\.[0-9]+)?)/.exec(e.detail);
    if (!m) continue;
    out.push({
      slug: e.itemSlug,
      date: e.at.slice(0, 10),
      amount: Number.parseFloat(m[1]!),
    });
  }
  return out;
}

export function forecast(
  items: Item[],
  usage: UsageEvent[],
  today: string,
  windowDays: number,
): ForecastEntry[] {
  const cutoff = plusDays(today, -windowDays);
  const burn = new Map<string, number>();
  const days = new Map<string, Set<string>>();
  for (const u of usage) {
    if (u.date < cutoff) continue;
    burn.set(u.slug, (burn.get(u.slug) ?? 0) + u.amount);
    if (!days.has(u.slug)) days.set(u.slug, new Set());
    days.get(u.slug)!.add(u.date);
  }
  const out: ForecastEntry[] = [];
  for (const item of items) {
    const total = totalQuantity(item);
    if (!total) continue;
    const used = burn.get(item.slug) ?? 0;
    const span = (days.get(item.slug)?.size ?? 0);
    if (used <= 0 || span === 0) {
      out.push({
        slug: item.slug,
        remaining: total.value,
        unit: total.kind,
        burnPerDay: 0,
        daysRemaining: Number.POSITIVE_INFINITY,
        estimatedOutAt: "never",
      });
      continue;
    }
    const perDay = used / Math.max(1, span);
    const daysRemaining = total.value / perDay;
    out.push({
      slug: item.slug,
      remaining: total.value,
      unit: total.kind,
      burnPerDay: round1(perDay),
      daysRemaining: round1(daysRemaining),
      estimatedOutAt: plusDays(today, Math.max(0, Math.floor(daysRemaining))),
    });
  }
  out.sort((a, b) => {
    if (a.daysRemaining === b.daysRemaining) {
      return a.slug.localeCompare(b.slug);
    }
    return a.daysRemaining - b.daysRemaining;
  });
  return out;
}

export function imminent(entries: ForecastEntry[], days: number): ForecastEntry[] {
  return entries.filter((e) => e.daysRemaining < days);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
