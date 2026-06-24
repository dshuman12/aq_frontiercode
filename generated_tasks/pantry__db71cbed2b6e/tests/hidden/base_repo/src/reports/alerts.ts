// "You might want to look at this" warnings.

import type { Item } from "../core/item.js";
import { totalQuantity } from "../core/item.js";
import { plusDays } from "../core/date.js";
import { format as fmtQ } from "../core/units.js";

export type Severity = "info" | "warn" | "high";

export interface Alert {
  severity: Severity;
  title: string;
  detail: string;
  itemSlug?: string;
}

export interface AlertOptions {
  expiringWindowDays?: number;
  staleAfterDays?: number;
  essentialSlugs?: string[];
  /** today (ISO date), required for the date math */
  today: string;
}

export function compute(items: Item[], opts: AlertOptions): Alert[] {
  const out: Alert[] = [];
  const expiringDays = opts.expiringWindowDays ?? 7;
  const staleDays = opts.staleAfterDays ?? 90;

  for (const item of items) {
    for (const lot of item.lots) {
      if (!lot.bestBy) continue;
      if (lot.bestBy < opts.today) {
        out.push({
          severity: "high",
          title: "expired lot",
          itemSlug: item.slug,
          detail: `lot ${lot.id} of ${item.slug} expired ${lot.bestBy}`,
        });
      } else if (lot.bestBy <= plusDays(opts.today, expiringDays)) {
        out.push({
          severity: "warn",
          title: "expiring soon",
          itemSlug: item.slug,
          detail: `lot ${lot.id} of ${item.slug} expires ${lot.bestBy}`,
        });
      }
    }
    for (const lot of item.lots) {
      const ageDays = daysBetween(lot.addedAt, opts.today);
      if (!lot.bestBy && ageDays > staleDays) {
        out.push({
          severity: "info",
          title: "stale lot (no best-by, very old)",
          itemSlug: item.slug,
          detail: `lot ${lot.id} of ${item.slug} added ${lot.addedAt} (${ageDays} days ago)`,
        });
      }
    }
    const total = totalQuantity(item);
    if (total !== null && total.value === 0) {
      out.push({
        severity: "info",
        title: "item is empty",
        itemSlug: item.slug,
        detail: `${item.slug} has zero remaining quantity`,
      });
    } else if (total !== null && total.value <= 25) {
      out.push({
        severity: "warn",
        title: "running low",
        itemSlug: item.slug,
        detail: `${item.slug}: only ${fmtQ(total)} remains`,
      });
    }
  }

  for (const slug of opts.essentialSlugs ?? []) {
    const item = items.find((i) => i.slug === slug);
    if (!item || item.lots.length === 0) {
      out.push({
        severity: "high",
        title: "essential item missing",
        itemSlug: slug,
        detail: `essential "${slug}" is missing or empty`,
      });
    }
  }

  out.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  return out;
}

function severityOrder(s: Severity): number {
  if (s === "high") return 0;
  if (s === "warn") return 1;
  return 2;
}

function daysBetween(a: string, b: string): number {
  const ax = new Date(`${a}T00:00:00Z`).getTime();
  const bx = new Date(`${b}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((bx - ax) / 86400000));
}

export function format(alert: Alert): string {
  const tag = `[${alert.severity}]`;
  const item = alert.itemSlug ? ` ${alert.itemSlug}` : "";
  return `${tag.padEnd(7)} ${alert.title}${item}: ${alert.detail}`;
}
