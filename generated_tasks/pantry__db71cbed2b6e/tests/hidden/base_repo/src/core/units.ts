// Quantity / unit math. Internally everything is in grams (mass) or
// milliliters (volume); this module translates from the human forms
// the user types ("500ml", "1kg", "3 oz") into the SI canonical form.
//
// We intentionally don't try to convert across mass/volume - "100g of
// milk" can't be safely turned into ml without a density table, and
// the wrong answer is more dangerous than no answer.

export type UnitKind = "mass" | "volume" | "count";

export interface Quantity {
  /** Canonical numeric value: grams for mass, ml for volume, units for count. */
  value: number;
  kind: UnitKind;
  /** Original textual form the user typed - kept verbatim for display. */
  raw?: string;
}

const MASS_TO_G: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

const VOL_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
  cups: 236.588,
  floz: 29.5735,
  pint: 473.176,
  pints: 473.176,
  qt: 946.353,
  quart: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
};

const COUNT_TO_N: Record<string, number> = {
  ea: 1,
  each: 1,
  unit: 1,
  units: 1,
  pcs: 1,
  piece: 1,
  pieces: 1,
  ct: 1,
  count: 1,
  dozen: 12,
  doz: 12,
  pair: 2,
};

const SUFFIX_RE = /^([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/;

export function parseQuantity(raw: string): Quantity {
  const text = raw.trim();
  if (text === "") {
    throw new Error("quantity: empty input");
  }
  const m = SUFFIX_RE.exec(text);
  if (!m) {
    // Bare numeric -> treat as count
    const n = Number.parseFloat(text);
    if (Number.isFinite(n)) {
      return { value: n, kind: "count", raw };
    }
    throw new Error(`quantity: cannot parse "${raw}"`);
  }
  const num = Number.parseFloat(m[1]!);
  if (!Number.isFinite(num)) {
    throw new Error(`quantity: bad number "${m[1]}"`);
  }
  if (num < 0) {
    throw new Error(`quantity: negative not allowed`);
  }
  const suf = (m[2] ?? "").toLowerCase();
  if (suf in MASS_TO_G) {
    return { value: num * MASS_TO_G[suf]!, kind: "mass", raw };
  }
  if (suf in VOL_TO_ML) {
    return { value: num * VOL_TO_ML[suf]!, kind: "volume", raw };
  }
  if (suf in COUNT_TO_N) {
    return { value: num * COUNT_TO_N[suf]!, kind: "count", raw };
  }
  throw new Error(`quantity: unknown unit "${suf}"`);
}

export function format(q: Quantity): string {
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

export function add(a: Quantity, b: Quantity): Quantity {
  if (a.kind !== b.kind) {
    throw new Error(`quantity: cannot add ${a.kind} and ${b.kind}`);
  }
  return { value: a.value + b.value, kind: a.kind };
}

export function sub(a: Quantity, b: Quantity): Quantity {
  if (a.kind !== b.kind) {
    throw new Error(`quantity: cannot subtract ${a.kind} from ${b.kind}`);
  }
  const v = a.value - b.value;
  return { value: v < 0 ? 0 : v, kind: a.kind };
}

/** Multiply a quantity by a scalar. */
export function scale(q: Quantity, factor: number): Quantity {
  if (!Number.isFinite(factor) || factor < 0) {
    throw new Error(`quantity: scale factor must be non-negative finite`);
  }
  return { value: q.value * factor, kind: q.kind };
}

/** True when q has effectively zero value. */
export function isZero(q: Quantity): boolean {
  return q.value <= 0.0005;
}

/** Compare two same-kind quantities; return -1/0/1. */
export function compare(a: Quantity, b: Quantity): number {
  if (a.kind !== b.kind) {
    throw new Error(`quantity: cannot compare ${a.kind} to ${b.kind}`);
  }
  if (a.value < b.value) return -1;
  if (a.value > b.value) return 1;
  return 0;
}
