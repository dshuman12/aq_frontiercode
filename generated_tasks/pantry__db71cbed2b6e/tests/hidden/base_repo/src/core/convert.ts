// Mass <-> volume conversion helpers, only for ingredients with a
// well-known density. We keep a small built-in table - users add to it
// via configCallback if they want.

export interface DensityEntry {
  slug: string;
  /** grams per milliliter. */
  gPerMl: number;
}

export const BUILT_IN: readonly DensityEntry[] = [
  { slug: "water", gPerMl: 1.0 },
  { slug: "milk", gPerMl: 1.03 },
  { slug: "olive-oil", gPerMl: 0.91 },
  { slug: "honey", gPerMl: 1.42 },
  { slug: "all-purpose-flour", gPerMl: 0.53 },
  { slug: "sugar-white", gPerMl: 0.85 },
  { slug: "rice-uncooked", gPerMl: 0.85 },
  { slug: "salt-table", gPerMl: 1.20 },
  { slug: "butter", gPerMl: 0.91 },
  { slug: "yogurt", gPerMl: 1.04 },
];

export function gramsToMl(slug: string, grams: number, extras: DensityEntry[] = []): number | null {
  const entry = lookup(slug, extras);
  if (!entry) return null;
  return grams / entry.gPerMl;
}

export function mlToGrams(slug: string, ml: number, extras: DensityEntry[] = []): number | null {
  const entry = lookup(slug, extras);
  if (!entry) return null;
  return ml * entry.gPerMl;
}

export function lookup(slug: string, extras: DensityEntry[] = []): DensityEntry | null {
  for (const e of [...extras, ...BUILT_IN]) {
    if (e.slug === slug) return e;
  }
  return null;
}

export function knownSlugs(extras: DensityEntry[] = []): string[] {
  const set = new Set<string>();
  for (const e of [...BUILT_IN, ...extras]) set.add(e.slug);
  return [...set].sort();
}

/** "1 cup of flour weighs about X grams" helper. */
export function cupsToGrams(slug: string, cups: number, extras: DensityEntry[] = []): number | null {
  return mlToGrams(slug, cups * 236.588, extras);
}
