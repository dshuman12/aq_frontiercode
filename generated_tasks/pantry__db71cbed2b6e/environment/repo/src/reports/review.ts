// Long-form monthly review markdown.

import type { Item } from "../core/item.js";
import type { MealLogEntry } from "./meal-history.js";
import type { WasteEntry } from "./waste.js";
import { topRecipes } from "./meal-history.js";
import { inMonth as wasteInMonth, summarise as wasteSummary } from "./waste.js";

export interface ReviewOptions {
  yyyymm: string;
  items: Item[];
  meals: MealLogEntry[];
  waste: WasteEntry[];
}

export function render(opts: ReviewOptions): string {
  const lines: string[] = [];
  lines.push(`# ${opts.yyyymm} in review`);
  lines.push("");

  const monthMeals = opts.meals.filter((m) => m.date.startsWith(opts.yyyymm));
  const monthWaste = wasteInMonth(opts.waste, opts.yyyymm);

  lines.push(`## At a glance`);
  lines.push(`- meals cooked:  **${monthMeals.length}**`);
  lines.push(`- distinct recipes: **${new Set(monthMeals.map((m) => m.recipeSlug)).size}**`);
  lines.push(`- items in pantry: **${opts.items.length}**`);
  lines.push(`- waste entries: **${monthWaste.length}**`);
  lines.push("");

  if (monthMeals.length > 0) {
    lines.push(`## Most-cooked recipes`);
    for (const t of topRecipes(monthMeals, 5)) {
      lines.push(`- ${t.slug} (${t.count}x)`);
    }
    lines.push("");
  }

  if (monthWaste.length > 0) {
    lines.push(`## Waste`);
    const sum = wasteSummary(monthWaste);
    lines.push(`- by reason:`);
    for (const [reason, n] of Object.entries(sum.byReason)) {
      if (n > 0) lines.push(`  - ${reason}: ${n}`);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

export function html(opts: ReviewOptions): string {
  const md = render(opts);
  // very tiny md-to-html
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
