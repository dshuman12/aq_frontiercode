// Print a shopping list as a per-line checklist suitable for the phone.

import type { ShoppingList } from "../core/shopping.js";
import { isZero } from "../core/units.js";

export function render(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`Shopping list - ${list.generatedAt}`);
  lines.push("");
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    lines.push(`[ ] ${e.slug.padEnd(20)} ${e.shortfall.value.toFixed(1)} ${e.shortfall.kind}`);
  }
  return lines.join("\n") + "\n";
}

export function renderGrouped(
  list: ShoppingList,
  groupOf: (slug: string) => string,
): string {
  const groups = new Map<string, string[]>();
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    const g = groupOf(e.slug);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(`[ ] ${e.slug}  ${e.shortfall.value.toFixed(1)} ${e.shortfall.kind}`);
  }
  const lines: string[] = [`Shopping list - ${list.generatedAt}`, ""];
  const sorted = [...groups.keys()].sort();
  for (const g of sorted) {
    lines.push(`-- ${g} --`);
    for (const item of groups.get(g)!) lines.push(item);
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

export function lineCount(list: ShoppingList): number {
  let n = 0;
  for (const e of list.entries) if (!isZero(e.shortfall)) n++;
  return n;
}
