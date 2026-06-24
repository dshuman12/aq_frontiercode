// Shopping-list export in markdown / plain-text / JSON.

import type { ShoppingList } from "../core/shopping.js";
import { isZero } from "../core/units.js";

export function asMarkdown(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`# Shopping list (${list.generatedAt})`);
  lines.push("");
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    const recipes = e.recipes.length > 0 ? `  _for_ ${e.recipes.join(", ")}` : "";
    lines.push(`- **${e.slug}** ${e.shortfall.value.toFixed(1)} ${e.shortfall.kind}${recipes}`);
  }
  return lines.join("\n") + "\n";
}

export function asPlainText(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`shopping list - ${list.generatedAt}`);
  lines.push("");
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    lines.push(`- ${e.slug.padEnd(20)} ${e.shortfall.value.toFixed(1)} ${e.shortfall.kind}`);
  }
  return lines.join("\n") + "\n";
}

export function asJSON(list: ShoppingList): string {
  return JSON.stringify(list, null, 2);
}

/** As a checklist with markdown checkboxes. */
export function asChecklist(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`# Shopping list (${list.generatedAt})`);
  lines.push("");
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    lines.push(`- [ ] ${e.slug} (${e.shortfall.value.toFixed(1)} ${e.shortfall.kind})`);
  }
  return lines.join("\n") + "\n";
}

/** Group entries by category-prefix slug; useful when categories
 *  aren't tagged in the shopping list. */
export function groupedByPrefix(list: ShoppingList): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    const prefix = e.slug.split("-")[0] ?? "(none)";
    if (!out.has(prefix)) out.set(prefix, []);
    out.get(prefix)!.push(e.slug);
  }
  return out;
}
