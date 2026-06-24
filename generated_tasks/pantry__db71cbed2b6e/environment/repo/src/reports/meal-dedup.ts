// Detect duplicate entries in the meal-history log (same date + meal +
// recipe combo logged twice).

import type { MealLogEntry } from "./meal-history.js";

export function findDuplicates(entries: MealLogEntry[]): MealLogEntry[][] {
  const groups = new Map<string, MealLogEntry[]>();
  for (const e of entries) {
    const key = `${e.date}|${e.meal}|${e.recipeSlug}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

export function dedupe(entries: MealLogEntry[]): MealLogEntry[] {
  const seen = new Set<string>();
  const out: MealLogEntry[] = [];
  for (const e of entries) {
    const key = `${e.date}|${e.meal}|${e.recipeSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export function summary(entries: MealLogEntry[]): {
  total: number;
  unique: number;
  duplicateGroups: number;
} {
  const dups = findDuplicates(entries);
  return {
    total: entries.length,
    unique: dedupe(entries).length,
    duplicateGroups: dups.length,
  };
}
