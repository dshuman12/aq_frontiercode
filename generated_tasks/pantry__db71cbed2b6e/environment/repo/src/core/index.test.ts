import { test } from "node:test";
import assert from "node:assert/strict";
import { Index } from "./index.js";
import type { Item } from "./item.js";

const today = "2026-04-15";

const sample: Item[] = [
  {
    id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
    barcode: "12345",
    lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "milk", name: "Milk", category: "dairy",
    lots: [{ id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 3, slug: "rice", name: "Rice",
    lots: [
      { id: 1, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry" },
      { id: 2, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry" },
    ],
    createdAt: today, updatedAt: today,
  },
];

test("size + all", () => {
  const idx = new Index(sample);
  assert.equal(idx.size(), 3);
  assert.equal(idx.all().length, 3);
});

test("getByID + getBySlug + getByBarcode", () => {
  const idx = new Index(sample);
  assert.equal(idx.getByID(2)?.slug, "milk");
  assert.equal(idx.getBySlug("rice")?.id, 3);
  assert.equal(idx.getByBarcode("12345")?.slug, "olive-oil");
});

test("inCategory groups (none) for items lacking category", () => {
  const idx = new Index(sample);
  assert.equal(idx.inCategory("oils").length, 1);
  assert.equal(idx.inCategory("(none)").length, 1);
});

test("inLocation groups by lot location", () => {
  const idx = new Index(sample);
  assert.equal(idx.inLocation("fridge").length, 1);
  assert.equal(idx.inLocation("pantry").length, 2);
});

test("categories + locations sorted", () => {
  const idx = new Index(sample);
  assert.deepEqual(idx.categories(), ["(none)", "dairy", "oils"]);
  assert.deepEqual(idx.locations(), ["fridge", "pantry"]);
});

test("countLots", () => {
  const idx = new Index(sample);
  assert.equal(idx.countLots(), 4);
});

test("countByLocation aggregates lots", () => {
  const idx = new Index(sample);
  const counts = idx.countByLocation();
  assert.equal(counts.get("pantry"), 3);
  assert.equal(counts.get("fridge"), 1);
});

test("forEachLot visits every lot", () => {
  const idx = new Index(sample);
  let n = 0;
  idx.forEachLot(() => n++);
  assert.equal(n, 4);
});

test("missing lookups return undefined / empty", () => {
  const idx = new Index(sample);
  assert.equal(idx.getByID(99), undefined);
  assert.equal(idx.getBySlug("nope"), undefined);
  assert.deepEqual(idx.inCategory("nope"), []);
});
