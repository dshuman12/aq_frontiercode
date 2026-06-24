import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEY_BY_CATEGORY,
  KEY_BY_LOT_LOCATION,
  KEY_BY_LOT_MONTH,
  KEY_BY_SLUG,
  build,
  format,
} from "./pivot.js";
import type { Item } from "./item.js";

const today = "2026-04-15";

const sample: Item[] = [
  {
    id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
    lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "milk", name: "Milk", category: "dairy",
    lots: [
      { id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" },
      { id: 2, qty: { value: 1000, kind: "volume" }, addedAt: "2026-03-10", where: "fridge" },
    ],
    createdAt: today, updatedAt: today,
  },
];

test("pivot category x location", () => {
  const p = build(sample, KEY_BY_CATEGORY, KEY_BY_LOT_LOCATION);
  assert.equal(p.cells["dairy"]!["fridge"], 2);
  assert.equal(p.cells["oils"]!["pantry"], 1);
});

test("rowTotals correct", () => {
  const p = build(sample, KEY_BY_CATEGORY, KEY_BY_LOT_LOCATION);
  assert.equal(p.rowTotals["dairy"], 2);
  assert.equal(p.rowTotals["oils"], 1);
});

test("grand total matches sum of all lots", () => {
  const p = build(sample, KEY_BY_CATEGORY, KEY_BY_LOT_LOCATION);
  assert.equal(p.grand, 3);
});

test("pivot category x lot-month", () => {
  const p = build(sample, KEY_BY_CATEGORY, KEY_BY_LOT_MONTH);
  assert.equal(p.cells["dairy"]!["2026-04"], 1);
  assert.equal(p.cells["dairy"]!["2026-03"], 1);
});

test("KEY_BY_SLUG identifies one row per slug", () => {
  const p = build(sample, KEY_BY_SLUG, KEY_BY_LOT_LOCATION);
  assert.deepEqual(p.rowKeys.sort(), ["milk", "olive-oil"]);
});

test("(none) used when category absent", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X", lots: [
      { id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry" },
    ], createdAt: today, updatedAt: today,
  }];
  const p = build(items, KEY_BY_CATEGORY, KEY_BY_LOT_LOCATION);
  assert.deepEqual(p.rowKeys, ["(none)"]);
});

test("format produces tab-separated grid", () => {
  const p = build(sample, KEY_BY_CATEGORY, KEY_BY_LOT_LOCATION);
  const out = format(p);
  assert.match(out, /dairy/);
  assert.match(out, /= total/);
});

test("empty input yields zero grand", () => {
  const p = build([], KEY_BY_CATEGORY, KEY_BY_LOT_LOCATION);
  assert.equal(p.grand, 0);
});
