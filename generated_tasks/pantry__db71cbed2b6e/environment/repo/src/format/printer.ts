// Pretty-printers for various internal types. Centralises formatting
// so the CLI can stay consistent across subcommands.

import type { Item, Lot } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";
import type { Quantity } from "../core/units.js";

export function quantity(q: Quantity): string {
  if (q.kind === "mass") {
    if (q.value >= 1000) return `${(q.value / 1000).toFixed(2)}kg`;
    return `${q.value.toFixed(0)}g`;
  }
  if (q.kind === "volume") {
    if (q.value >= 1000) return `${(q.value / 1000).toFixed(2)}L`;
    return `${q.value.toFixed(0)}ml`;
  }
  return `${q.value.toFixed(0)}`;
}

export function lotLine(lot: Lot): string {
  const bits: string[] = [`#${lot.id}`, quantity(lot.qty), `in ${lot.where}`];
  if (lot.bestBy) bits.push(`bb ${lot.bestBy}`);
  if (lot.notes) bits.push(`(${lot.notes})`);
  return bits.join("  ");
}

export function itemHeader(item: Item): string {
  const cat = item.category ? ` [${item.category}]` : "";
  return `${item.slug}${cat}  ${item.name}`;
}

export function itemFull(item: Item): string {
  const lines: string[] = [];
  lines.push(itemHeader(item));
  lines.push(`  id: ${item.id}`);
  lines.push(`  created: ${item.createdAt}`);
  lines.push(`  updated: ${item.updatedAt}`);
  if (item.notes) lines.push(`  notes: ${item.notes}`);
  if (item.lots.length === 0) {
    lines.push("  (no lots)");
  } else {
    lines.push("  lots:");
    for (const lot of item.lots) lines.push("    " + lotLine(lot));
  }
  return lines.join("\n") + "\n";
}

export function recipeShort(r: Recipe): string {
  const time = r.totalMinutes !== undefined ? ` (${r.totalMinutes}m)` : "";
  return `${r.slug}${time}  ${r.name}`;
}

export function recipeFull(r: Recipe): string {
  const lines: string[] = [];
  lines.push(`# ${r.name}`);
  lines.push(`servings: ${r.servings}`);
  if (r.totalMinutes) lines.push(`time:     ${r.totalMinutes} min`);
  if (r.category) lines.push(`category: ${r.category}`);
  if (r.tags && r.tags.length > 0) lines.push(`tags:     ${r.tags.join(", ")}`);
  lines.push("");
  lines.push("## Ingredients");
  for (const ing of r.ingredients) {
    lines.push(`- ${ing.slug}  ${quantity(ing.qty)}` +
      (ing.notes ? `  (${ing.notes})` : ""));
  }
  if (r.steps) {
    lines.push("");
    lines.push("## Steps");
    lines.push(r.steps);
  }
  return lines.join("\n") + "\n";
}

export function summary(items: Item[]): string {
  const totalLots = items.reduce((acc, i) => acc + i.lots.length, 0);
  const cats = new Set<string>();
  for (const i of items) cats.add(i.category ?? "(none)");
  return `${items.length} items, ${totalLots} lots, ${cats.size} categories`;
}
