// Sanity checks against the on-disk store.

import type { Item } from "../core/item.js";
import { isISODate, today } from "../core/date.js";

export interface Finding {
  itemId?: number;
  code: string;
  detail: string;
}

export function check(items: Item[]): Finding[] {
  const out: Finding[] = [];
  const seenSlugs = new Map<string, number>();
  const now = today();

  for (const item of items) {
    if (!item.slug) {
      out.push({ itemId: item.id, code: "missing-slug", detail: "item has no slug" });
    }
    if (item.slug && seenSlugs.has(item.slug)) {
      out.push({
        itemId: item.id, code: "duplicate-slug",
        detail: `slug ${item.slug} also used by item ${seenSlugs.get(item.slug)}`,
      });
    } else if (item.slug) {
      seenSlugs.set(item.slug, item.id);
    }
    for (const lot of item.lots) {
      if (lot.qty.value < 0) {
        out.push({
          itemId: item.id, code: "neg-qty",
          detail: `lot ${lot.id} has negative qty`,
        });
      }
      if (lot.bestBy && !isISODate(lot.bestBy)) {
        out.push({
          itemId: item.id, code: "bad-best-by",
          detail: `lot ${lot.id} has unparseable best_by "${lot.bestBy}"`,
        });
      }
      if (lot.bestBy && lot.bestBy < lot.addedAt) {
        out.push({
          itemId: item.id, code: "best-by-before-added",
          detail: `lot ${lot.id} best_by ${lot.bestBy} < addedAt ${lot.addedAt}`,
        });
      }
      if (lot.bestBy && lot.bestBy < now && !lotMarkedExpired(lot)) {
        // Just informational, not an error
      }
    }
  }
  return out;
}

function lotMarkedExpired(lot: Item["lots"][number]): boolean {
  return (lot.notes ?? "").toLowerCase().includes("expired");
}

export function pretty(findings: Finding[]): string {
  if (findings.length === 0) return "(no findings - looks healthy)\n";
  return findings
    .map((f) => {
      const id = f.itemId !== undefined ? `[item ${f.itemId}] ` : "";
      return `${id}${f.code}: ${f.detail}`;
    })
    .join("\n") + "\n";
}

export function countByCode(findings: Finding[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of findings) out[f.code] = (out[f.code] ?? 0) + 1;
  return out;
}
