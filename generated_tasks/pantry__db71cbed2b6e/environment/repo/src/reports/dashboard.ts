// One-screen "what's happening in the pantry" view.

import type { Item } from "../core/item.js";
import { lotsByExpiry, totalQuantity } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";

export function render(items: Item[], today: string): string {
  const lines: string[] = [];
  lines.push(`pantry dashboard - ${today}`);
  lines.push("=".repeat(36));
  lines.push("");
  lines.push(`items:        ${items.length}`);
  let lots = 0;
  let expired = 0;
  let expSoon = 0;
  for (const item of items) {
    lots += item.lots.length;
    for (const lot of item.lots) {
      if (!lot.bestBy) continue;
      if (lot.bestBy < today) expired++;
      else if (lot.bestBy <= isoPlusDays(today, 7)) expSoon++;
    }
  }
  lines.push(`lots:         ${lots}`);
  lines.push(`expired:      ${expired}`);
  lines.push(`expiring 7d:  ${expSoon}`);
  lines.push("");

  const byCat = new Map<string, number>();
  for (const item of items) {
    const cat = item.category ?? "(none)";
    byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
  }
  if (byCat.size > 0) {
    lines.push("by category");
    const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [cat, n] of cats) {
      lines.push(`  ${cat.padEnd(14)} ${n}`);
    }
    lines.push("");
  }

  lines.push("running low (<=3 lots, total <= 25%)");
  let lowCount = 0;
  for (const item of items) {
    if (item.lots.length === 0) {
      lines.push(`  ${item.slug}  (empty)`);
      lowCount++;
      continue;
    }
    const total = totalQuantity(item);
    if (!total) continue;
    if (item.lots.length <= 3 && total.value <= 250) {
      lines.push(`  ${item.slug}  ${fmtQ(total)}`);
      lowCount++;
    }
  }
  if (lowCount === 0) lines.push("  (nothing flagged)");
  lines.push("");

  lines.push("expiring soon");
  let shown = 0;
  for (const item of items) {
    for (const lot of lotsByExpiry(item)) {
      if (!lot.bestBy) continue;
      if (lot.bestBy > isoPlusDays(today, 7)) break;
      lines.push(`  ${item.slug.padEnd(15)} lot ${lot.id}  ${fmtQ(lot.qty)}  by ${lot.bestBy}`);
      shown++;
      if (shown >= 10) break;
    }
    if (shown >= 10) break;
  }
  if (shown === 0) lines.push("  (nothing expiring within 7 days)");
  return lines.join("\n") + "\n";
}

function isoPlusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
