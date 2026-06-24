// Big density / weight-per-volume lookup table for common kitchen
// ingredients. Used by recipe scaling when a user types a volume but
// the recipe is in mass (or vice versa) and conversions agrees a swap
// is reasonable.

export interface Density {
  slug: string;
  /** Grams per cup (236.588 ml). */
  gPerCup: number;
  /** Grams per tablespoon. */
  gPerTbsp: number;
  /** Grams per teaspoon. */
  gPerTsp: number;
  /** General density in g/ml. */
  gPerMl: number;
}

const TABLE: readonly Density[] = [
  { slug: "water", gPerCup: 237, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.00 },
  { slug: "milk", gPerCup: 245, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.03 },
  { slug: "olive-oil", gPerCup: 215, gPerTbsp: 13, gPerTsp: 4.5, gPerMl: 0.91 },
  { slug: "sunflower-oil", gPerCup: 218, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.92 },
  { slug: "honey", gPerCup: 336, gPerTbsp: 21, gPerTsp: 7, gPerMl: 1.42 },
  { slug: "maple-syrup", gPerCup: 312, gPerTbsp: 20, gPerTsp: 6.5, gPerMl: 1.32 },
  { slug: "molasses", gPerCup: 328, gPerTbsp: 20, gPerTsp: 6.5, gPerMl: 1.39 },
  { slug: "all-purpose-flour", gPerCup: 125, gPerTbsp: 8, gPerTsp: 2.5, gPerMl: 0.53 },
  { slug: "bread-flour", gPerCup: 130, gPerTbsp: 8, gPerTsp: 2.5, gPerMl: 0.55 },
  { slug: "rye-flour", gPerCup: 102, gPerTbsp: 6.5, gPerTsp: 2, gPerMl: 0.43 },
  { slug: "spelt-flour", gPerCup: 120, gPerTbsp: 7.5, gPerTsp: 2.5, gPerMl: 0.51 },
  { slug: "oats-rolled", gPerCup: 90, gPerTbsp: 5.5, gPerTsp: 2, gPerMl: 0.38 },
  { slug: "polenta", gPerCup: 165, gPerTbsp: 10, gPerTsp: 3.5, gPerMl: 0.70 },
  { slug: "rice-uncooked", gPerCup: 200, gPerTbsp: 12.5, gPerTsp: 4, gPerMl: 0.85 },
  { slug: "quinoa", gPerCup: 170, gPerTbsp: 11, gPerTsp: 3.5, gPerMl: 0.72 },
  { slug: "couscous", gPerCup: 175, gPerTbsp: 11, gPerTsp: 3.5, gPerMl: 0.74 },
  { slug: "bulgur", gPerCup: 185, gPerTbsp: 11.5, gPerTsp: 4, gPerMl: 0.78 },
  { slug: "sugar-white", gPerCup: 200, gPerTbsp: 12.5, gPerTsp: 4, gPerMl: 0.85 },
  { slug: "sugar-brown", gPerCup: 220, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.93 },
  { slug: "powdered-sugar", gPerCup: 130, gPerTbsp: 8, gPerTsp: 2.5, gPerMl: 0.55 },
  { slug: "cocoa-powder", gPerCup: 100, gPerTbsp: 6, gPerTsp: 2, gPerMl: 0.42 },
  { slug: "salt-table", gPerCup: 290, gPerTbsp: 18, gPerTsp: 6, gPerMl: 1.23 },
  { slug: "salt", gPerCup: 220, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.93 },
  { slug: "butter", gPerCup: 227, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.96 },
  { slug: "yogurt", gPerCup: 245, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.04 },
  { slug: "sour-cream", gPerCup: 240, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.01 },
  { slug: "creme-fraiche", gPerCup: 240, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.01 },
  { slug: "ricotta", gPerCup: 250, gPerTbsp: 15.5, gPerTsp: 5, gPerMl: 1.06 },
  { slug: "parmesan", gPerCup: 100, gPerTbsp: 6, gPerTsp: 2, gPerMl: 0.42 },
  { slug: "tomato-passata", gPerCup: 240, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.01 },
  { slug: "tomato-paste", gPerCup: 256, gPerTbsp: 16, gPerTsp: 5.5, gPerMl: 1.08 },
  { slug: "peanut-butter", gPerCup: 258, gPerTbsp: 16, gPerTsp: 5.5, gPerMl: 1.09 },
  { slug: "tahini", gPerCup: 250, gPerTbsp: 15.5, gPerTsp: 5, gPerMl: 1.06 },
  { slug: "soy-sauce", gPerCup: 250, gPerTbsp: 16, gPerTsp: 5.5, gPerMl: 1.06 },
  { slug: "rice-vinegar", gPerCup: 240, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.01 },
  { slug: "balsamic-vinegar", gPerCup: 260, gPerTbsp: 16, gPerTsp: 5.5, gPerMl: 1.10 },
  { slug: "white-vinegar", gPerCup: 240, gPerTbsp: 15, gPerTsp: 5, gPerMl: 1.01 },
  { slug: "red-wine", gPerCup: 235, gPerTbsp: 14.5, gPerTsp: 5, gPerMl: 0.99 },
  { slug: "white-wine", gPerCup: 235, gPerTbsp: 14.5, gPerTsp: 5, gPerMl: 0.99 },
  { slug: "sesame-oil", gPerCup: 218, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.92 },
  { slug: "coconut-oil", gPerCup: 218, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.92 },
  { slug: "ghee", gPerCup: 218, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.92 },
  { slug: "lard", gPerCup: 218, gPerTbsp: 14, gPerTsp: 4.5, gPerMl: 0.92 },
  { slug: "almond", gPerCup: 145, gPerTbsp: 9, gPerTsp: 3, gPerMl: 0.61 },
  { slug: "walnut", gPerCup: 100, gPerTbsp: 6.5, gPerTsp: 2, gPerMl: 0.42 },
  { slug: "pine-nut", gPerCup: 135, gPerTbsp: 8.5, gPerTsp: 3, gPerMl: 0.57 },
  { slug: "raisin", gPerCup: 150, gPerTbsp: 9.5, gPerTsp: 3, gPerMl: 0.63 },
  { slug: "chocolate-chips", gPerCup: 175, gPerTbsp: 11, gPerTsp: 3.5, gPerMl: 0.74 },
];

const BY_SLUG = new Map<string, Density>(TABLE.map((d) => [d.slug, d]));

export function lookup(slug: string): Density | null {
  return BY_SLUG.get(slug) ?? null;
}

export function knownSlugs(): string[] {
  return TABLE.map((d) => d.slug).sort();
}

export function gramsForCups(slug: string, cups: number): number | null {
  const d = lookup(slug);
  if (!d) return null;
  return cups * d.gPerCup;
}

export function cupsForGrams(slug: string, grams: number): number | null {
  const d = lookup(slug);
  if (!d || d.gPerCup === 0) return null;
  return grams / d.gPerCup;
}

export function tablespoonsForGrams(slug: string, grams: number): number | null {
  const d = lookup(slug);
  if (!d || d.gPerTbsp === 0) return null;
  return grams / d.gPerTbsp;
}

export function describe(slug: string): string {
  const d = lookup(slug);
  if (!d) return `${slug}: unknown density`;
  return `${slug}: ${d.gPerCup} g/cup, ${d.gPerTbsp} g/Tbsp, ${d.gPerTsp} g/tsp`;
}

export function entries(): readonly Density[] {
  return TABLE;
}
