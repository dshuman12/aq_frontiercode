// Schema-version migration helpers. Item / Recipe gain a `_v` field
// over time; this module owns the in-place upgrade rules.

export type Migration<T> = (input: T) => T;

interface Versioned {
  _v?: number;
}

const itemMigrations: Migration<Record<string, unknown>>[] = [
  // v1 -> v2: rename `place` to `where` on lots
  (item) => {
    const lots = item["lots"];
    if (!Array.isArray(lots)) return item;
    item["lots"] = lots.map((l: Record<string, unknown>) => {
      if (l["place"] !== undefined && l["where"] === undefined) {
        l["where"] = l["place"];
        delete l["place"];
      }
      return l;
    });
    return item;
  },
  // v2 -> v3: convert string qty into structured Quantity
  (item) => {
    const lots = item["lots"];
    if (!Array.isArray(lots)) return item;
    item["lots"] = lots.map((l: Record<string, unknown>) => {
      if (typeof l["qty"] === "string") {
        l["qty"] = { value: 0, kind: "count" };
      }
      return l;
    });
    return item;
  },
];

export const ITEM_LATEST = itemMigrations.length + 1;

export function migrateItem(input: Record<string, unknown>): Record<string, unknown> {
  let v = (input as Versioned)._v ?? 1;
  let cur = { ...input };
  while (v < ITEM_LATEST) {
    const fn = itemMigrations[v - 1];
    if (!fn) break;
    cur = fn(cur);
    v++;
    (cur as Versioned)._v = v;
  }
  (cur as Versioned)._v = ITEM_LATEST;
  return cur;
}

const recipeMigrations: Migration<Record<string, unknown>>[] = [
  // v1 -> v2: rename `qtyValue` + `qtyUnit` -> nested `qty`
  (recipe) => {
    const ings = recipe["ingredients"];
    if (!Array.isArray(ings)) return recipe;
    recipe["ingredients"] = ings.map((i: Record<string, unknown>) => {
      if (i["qty"] === undefined &&
          i["qtyValue"] !== undefined && i["qtyUnit"] !== undefined) {
        i["qty"] = { value: i["qtyValue"], kind: "mass" };
        delete i["qtyValue"];
        delete i["qtyUnit"];
      }
      return i;
    });
    return recipe;
  },
];

export const RECIPE_LATEST = recipeMigrations.length + 1;

export function migrateRecipe(input: Record<string, unknown>): Record<string, unknown> {
  let v = (input as Versioned)._v ?? 1;
  let cur = { ...input };
  while (v < RECIPE_LATEST) {
    const fn = recipeMigrations[v - 1];
    if (!fn) break;
    cur = fn(cur);
    v++;
    (cur as Versioned)._v = v;
  }
  (cur as Versioned)._v = RECIPE_LATEST;
  return cur;
}

export function isUpToDate(input: Versioned, latest: number): boolean {
  return (input._v ?? 1) >= latest;
}
