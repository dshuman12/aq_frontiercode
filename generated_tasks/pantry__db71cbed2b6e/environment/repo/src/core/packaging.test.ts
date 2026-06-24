import { test } from "node:test";
import assert from "node:assert/strict";
import { format, recommend, totalCount } from "./packaging.js";
import type { ShoppingEntry } from "../core/shopping.js";

const e = (slug: string, value: number, kind: "mass" | "volume" | "count" = "mass"): ShoppingEntry => ({
  slug,
  totalNeeded: { value, kind },
  alreadyHave: { value: 0, kind },
  shortfall: { value, kind },
  recipes: [],
  notes: [],
});

test("picks smallest size that covers need", () => {
  const out = recommend([e("flour", 600)], [{
    slug: "flour", sizes: [500, 1000, 2000],
  }]);
  assert.equal(out[0]?.recommend, 1000);
  assert.equal(out[0]?.count, 1);
});

test("multiple of biggest when need exceeds biggest size", () => {
  const out = recommend([e("flour", 5000)], [{
    slug: "flour", sizes: [500, 1000, 2000],
  }]);
  assert.equal(out[0]?.recommend, 2000);
  assert.equal(out[0]?.count, 3);
  assert.equal(out[0]?.totalPurchased, 6000);
});

test("falls back to 1x exact need when no options", () => {
  const out = recommend([e("flour", 250)], []);
  assert.equal(out[0]?.recommend, 250);
});

test("format singular vs plural", () => {
  const out = recommend([e("flour", 600)], [{ slug: "flour", sizes: [1000] }]);
  assert.match(format(out[0]!), /buy 1 1000/);
});

test("format multi-package", () => {
  const out = recommend([e("flour", 5000)], [{ slug: "flour", sizes: [2000] }]);
  assert.match(format(out[0]!), /buy 3 x 2000/);
});

test("totalCount sums purchases", () => {
  const out = recommend([
    e("a", 1000), e("b", 5000),
  ], [
    { slug: "a", sizes: [500, 1000] },
    { slug: "b", sizes: [500, 1000] },
  ]);
  // a -> 1 of 1000, b -> 5 of 1000
  assert.equal(totalCount(out), 6);
});
