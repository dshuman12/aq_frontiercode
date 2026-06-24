// Markdown exporter for the pantry. Output is meant to drop straight
// into Obsidian / a vault directory.

import type { Item } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";
import { lotsByExpiry, totalQuantity } from "../core/item.js";

export function render(items: Item[], today: string): string {
  const lines: string[] = [];
  lines.push("# Pantry");
  lines.push(`_exported ${today}_`);
  lines.push("");
  lines.push("## Totals");
  lines.push(`- items:    ${items.length}`);
  const totalLots = items.reduce((acc, i) => acc + i.lots.length, 0);
  lines.push(`- lots:     ${totalLots}`);
  lines.push("");
  if (items.length === 0) return lines.join("\n") + "\n";

  const grouped = groupByCategory(items);
  for (const [cat, list] of grouped) {
    lines.push(`## ${cat}`);
    lines.push("");
    for (const item of list) {
      lines.push(renderItem(item, today));
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

function renderItem(item: Item, today: string): string {
  const total = totalQuantity(item);
  const head = total
    ? `- **${item.slug}** (${item.name}) - total ${fmtQ(total)}`
    : `- **${item.slug}** (${item.name})`;
  const out: string[] = [head];
  for (const lot of lotsByExpiry(item)) {
    const bits: string[] = [`  - lot ${lot.id}: ${fmtQ(lot.qty)} in ${lot.where}`];
    if (lot.bestBy) {
      bits.push(`best by ${lot.bestBy}`);
      if (lot.bestBy <= today) bits.push("**EXPIRED**");
    }
    if (lot.notes) bits.push(`(${lot.notes})`);
    out.push(bits.join(" "));
  }
  return out.join("\n");
}

function groupByCategory(items: Item[]): Map<string, Item[]> {
  const out = new Map<string, Item[]>();
  for (const item of items) {
    const cat = item.category ?? "Uncategorised";
    if (!out.has(cat)) out.set(cat, []);
    out.get(cat)!.push(item);
  }
  return new Map([...out.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
