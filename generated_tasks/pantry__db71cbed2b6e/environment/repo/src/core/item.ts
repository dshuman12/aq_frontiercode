// The Item record - one row in the pantry.
//
// Each Item has a kind ("olive-oil", "flour", "frozen-peas") and zero
// or more "lots" - the actual physical units in the pantry, each with
// its own quantity and best-by date. Lots get used up, refilled, and
// discarded; the Item itself is permanent until the user removes it.

import type { Quantity } from "./units.js";

export type Location =
  | "pantry"
  | "fridge"
  | "freezer"
  | "spice-rack"
  | "counter"
  | "cellar"
  | "bread-bin"
  | "other";

export const ALL_LOCATIONS: readonly Location[] = [
  "pantry",
  "fridge",
  "freezer",
  "spice-rack",
  "counter",
  "cellar",
  "bread-bin",
  "other",
];

export interface Lot {
  id: number;
  qty: Quantity;
  /** ISO date the lot was added to the pantry. */
  addedAt: string;
  /** ISO date the lot is best by, optional (no date = "indefinite"). */
  bestBy?: string;
  /** Where in the kitchen this lot lives. */
  where: Location;
  /** Free-form note: brand, where bought, why, etc. */
  notes?: string;
  /** Source tag: "manual", "receipt", "csv", etc. */
  source?: string;
}

export interface Item {
  id: number;
  /** Stable slug ("olive-oil"). */
  slug: string;
  /** Display name ("Olive Oil"). */
  name: string;
  /** Optional category ("oils", "grains", "produce"). */
  category?: string;
  /** Optional barcode (UPC / EAN). */
  barcode?: string;
  /** Optional aliases for fuzzy matching. */
  aliases?: string[];
  /** Lots currently in the pantry. */
  lots: Lot[];
  /** Free-form notes about the item itself, not its lots. */
  notes?: string;
  /** ISO date the item was first added. */
  createdAt: string;
  /** ISO date of last edit. */
  updatedAt: string;
}

const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

/** Convert an arbitrary string into a usable slug. */
export function toSlug(s: string): string {
  const out = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (out === "") {
    throw new Error("slug: empty result");
  }
  return out;
}

export function isValidLocation(loc: string): loc is Location {
  return (ALL_LOCATIONS as readonly string[]).includes(loc);
}

export function totalQuantity(item: Item): Quantity | null {
  if (item.lots.length === 0) return null;
  const first = item.lots[0]!;
  let value = 0;
  for (const lot of item.lots) {
    if (lot.qty.kind !== first.qty.kind) {
      // Mixed-kind lots are rare but possible (eg. count + mass) -
      // we just return null rather than guess.
      return null;
    }
    value += lot.qty.value;
  }
  return { value, kind: first.qty.kind };
}

/** Return lots sorted by best-by ascending; missing dates last. */
export function lotsByExpiry(item: Item): Lot[] {
  const cp = [...item.lots];
  cp.sort((a, b) => {
    if (!a.bestBy && !b.bestBy) return a.id - b.id;
    if (!a.bestBy) return 1;
    if (!b.bestBy) return -1;
    return a.bestBy < b.bestBy ? -1 : 1;
  });
  return cp;
}

/** A lot whose best-by is on or before today. */
export function isExpired(lot: Lot, today: string): boolean {
  if (!lot.bestBy) return false;
  return lot.bestBy <= today;
}

export function expiringSoon(
  item: Item,
  today: string,
  windowDays: number,
): Lot[] {
  if (windowDays <= 0) return [];
  const horizon = isoPlusDays(today, windowDays);
  return item.lots.filter((l) =>
    l.bestBy !== undefined && l.bestBy >= today && l.bestBy <= horizon
  );
}

function isoPlusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
