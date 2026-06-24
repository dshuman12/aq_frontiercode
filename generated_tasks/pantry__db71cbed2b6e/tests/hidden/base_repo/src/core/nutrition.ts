// Per-100g (or per-100ml) calorie and macro table.
//
// Numbers are rounded for readability and shouldn't be treated as
// nutrition labels - this is for planning, not health tracking.

import type { Quantity } from "./units.js";

export interface Macros {
  /** kcal */
  cal: number;
  /** grams of protein */
  protein: number;
  /** grams of carbs */
  carbs: number;
  /** grams of fat */
  fat: number;
}

export interface NutritionEntry {
  slug: string;
  /** Whether the per-100 unit is mass (g) or volume (ml). */
  basis: "mass" | "volume";
  per100: Macros;
}

export const TABLE: readonly NutritionEntry[] = [
  // Grains
  { slug: "all-purpose-flour", basis: "mass", per100: { cal: 364, protein: 10, carbs: 76, fat: 1 } },
  { slug: "rice-uncooked", basis: "mass", per100: { cal: 365, protein: 7, carbs: 80, fat: 1 } },
  { slug: "spaghetti", basis: "mass", per100: { cal: 371, protein: 13, carbs: 75, fat: 2 } },
  { slug: "tagliatelle", basis: "mass", per100: { cal: 371, protein: 13, carbs: 75, fat: 2 } },
  { slug: "fusilli", basis: "mass", per100: { cal: 371, protein: 13, carbs: 75, fat: 2 } },
  { slug: "oats-rolled", basis: "mass", per100: { cal: 389, protein: 17, carbs: 66, fat: 7 } },
  { slug: "polenta", basis: "mass", per100: { cal: 365, protein: 8, carbs: 79, fat: 2 } },
  { slug: "quinoa", basis: "mass", per100: { cal: 368, protein: 14, carbs: 64, fat: 6 } },

  // Oils
  { slug: "olive-oil", basis: "volume", per100: { cal: 884, protein: 0, carbs: 0, fat: 100 } },
  { slug: "sesame-oil", basis: "volume", per100: { cal: 884, protein: 0, carbs: 0, fat: 100 } },
  { slug: "butter", basis: "mass", per100: { cal: 717, protein: 1, carbs: 0, fat: 81 } },

  // Dairy
  { slug: "milk", basis: "volume", per100: { cal: 61, protein: 3, carbs: 5, fat: 3 } },
  { slug: "yogurt", basis: "mass", per100: { cal: 61, protein: 6, carbs: 4, fat: 3 } },
  { slug: "egg", basis: "mass", per100: { cal: 155, protein: 13, carbs: 1, fat: 11 } },
  { slug: "parmesan", basis: "mass", per100: { cal: 431, protein: 38, carbs: 4, fat: 29 } },
  { slug: "cream", basis: "volume", per100: { cal: 345, protein: 2, carbs: 3, fat: 37 } },

  // Beans / lentils
  { slug: "brown-lentils", basis: "mass", per100: { cal: 353, protein: 25, carbs: 60, fat: 1 } },
  { slug: "chickpeas-canned", basis: "mass", per100: { cal: 119, protein: 7, carbs: 19, fat: 2 } },
  { slug: "white-beans", basis: "mass", per100: { cal: 139, protein: 9, carbs: 25, fat: 0 } },
  { slug: "black-beans", basis: "mass", per100: { cal: 132, protein: 9, carbs: 24, fat: 0 } },
  { slug: "borlotti-beans", basis: "mass", per100: { cal: 139, protein: 9, carbs: 25, fat: 0 } },

  // Veg
  { slug: "tomato", basis: "mass", per100: { cal: 18, protein: 1, carbs: 4, fat: 0 } },
  { slug: "onion", basis: "mass", per100: { cal: 40, protein: 1, carbs: 9, fat: 0 } },
  { slug: "carrot", basis: "mass", per100: { cal: 41, protein: 1, carbs: 10, fat: 0 } },
  { slug: "zucchini", basis: "mass", per100: { cal: 17, protein: 1, carbs: 3, fat: 0 } },
  { slug: "spinach", basis: "mass", per100: { cal: 23, protein: 3, carbs: 4, fat: 0 } },
  { slug: "potato", basis: "mass", per100: { cal: 77, protein: 2, carbs: 17, fat: 0 } },

  // Meat
  { slug: "ground-beef", basis: "mass", per100: { cal: 250, protein: 26, carbs: 0, fat: 17 } },
  { slug: "chicken-thighs", basis: "mass", per100: { cal: 209, protein: 26, carbs: 0, fat: 11 } },

  // Sweets
  { slug: "honey", basis: "mass", per100: { cal: 304, protein: 0, carbs: 82, fat: 0 } },
  { slug: "sugar-white", basis: "mass", per100: { cal: 387, protein: 0, carbs: 100, fat: 0 } },
];

const TABLE_BY_SLUG = new Map<string, NutritionEntry>(
  TABLE.map((e) => [e.slug, e]),
);

export function lookup(slug: string): NutritionEntry | null {
  return TABLE_BY_SLUG.get(slug) ?? null;
}

export function macrosFor(slug: string, qty: Quantity): Macros | null {
  const entry = lookup(slug);
  if (!entry) return null;
  // Disallow mass<->volume crossover.
  if (entry.basis !== qty.kind) {
    if (qty.kind === "count") return null;
    if (qty.kind !== entry.basis) return null;
  }
  const factor = qty.value / 100;
  return scaleMacros(entry.per100, factor);
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    cal: round1(m.cal * factor),
    protein: round1(m.protein * factor),
    carbs: round1(m.carbs * factor),
    fat: round1(m.fat * factor),
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    cal: round1(a.cal + b.cal),
    protein: round1(a.protein + b.protein),
    carbs: round1(a.carbs + b.carbs),
    fat: round1(a.fat + b.fat),
  };
}

export function emptyMacros(): Macros {
  return { cal: 0, protein: 0, carbs: 0, fat: 0 };
}

export function format(m: Macros): string {
  return `${m.cal.toFixed(0)} kcal  P${m.protein.toFixed(0)}/C${m.carbs.toFixed(0)}/F${m.fat.toFixed(0)}`;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function knownSlugs(): string[] {
  return TABLE.map((e) => e.slug).sort();
}
