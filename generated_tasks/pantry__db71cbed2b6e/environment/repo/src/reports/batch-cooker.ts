// Plan a multi-recipe Sunday cook session.

import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";
import { build, format as fmtShop } from "../core/shopping.js";

export interface BatchSession {
  recipes: Recipe[];
  household: number;
  pantry: Item[];
  date: string;
}

export interface BatchPlan {
  date: string;
  totalServings: number;
  totalMinutes: number;
  shoppingMD: string;
  scheduleMD: string;
}

export function plan(s: BatchSession): BatchPlan {
  const totalServings = s.recipes.reduce(
    (acc, r) => acc + Math.max(s.household, r.servings), 0,
  );
  const totalMinutes = s.recipes.reduce(
    (acc, r) => acc + (r.totalMinutes ?? 60), 0,
  );
  const shoppingList = build({
    recipes: s.recipes,
    pantry: s.pantry,
    today: s.date,
  });
  const shoppingMD = fmtShop(shoppingList);
  const scheduleMD = renderSchedule(s);
  return { date: s.date, totalServings, totalMinutes, shoppingMD, scheduleMD };
}

function renderSchedule(s: BatchSession): string {
  const sorted = [...s.recipes].sort(
    (a, b) => (b.totalMinutes ?? 60) - (a.totalMinutes ?? 60),
  );
  const lines: string[] = [];
  lines.push(`# Cook session - ${s.date}`);
  lines.push("");
  let cursorMin = 0;
  for (const r of sorted) {
    lines.push(`- ${pad(cursorMin)} start ${r.slug} (~${r.totalMinutes ?? 60} min)`);
    cursorMin += Math.min(15, r.totalMinutes ?? 60);
  }
  return lines.join("\n") + "\n";
}

function pad(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}m`;
}
