import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByShelf, moveLot, shelfFor, shelfReport, totalShelves } from "./shelf.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

const sample: Item[] = [
  {
    id: 1, slug: "olive-oil", name: "Olive Oil",
    lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry", notes: "shelf:2" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "milk", name: "Milk",
    lots: [{ id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  },
];

test("shelfFor parses shelf:N from notes", () => {
  const s = shelfFor(sample[0]!.lots[0]!);
  assert.equal(s.shelfNumber, 2);
});

test("shelfFor falls back to default", () => {
  const s = shelfFor(sample[1]!.lots[0]!, 5);
  assert.equal(s.shelfNumber, 5);
});

test("groupByShelf creates location/shelf keys", () => {
  const g = groupByShelf(sample);
  assert.ok(g.has("pantry/2"));
  assert.ok(g.has("fridge/1"));
});

test("groupByShelf dedupes items in same shelf", () => {
  const item: Item = {
    ...sample[0]!,
    lots: [
      { id: 1, qty: { value: 1, kind: "volume" }, addedAt: today, where: "pantry", notes: "shelf:2" },
      { id: 2, qty: { value: 1, kind: "volume" }, addedAt: today, where: "pantry", notes: "shelf:2" },
    ],
  };
  const g = groupByShelf([item]);
  assert.equal(g.get("pantry/2")?.length, 1);
});

test("moveLot updates the matching lot's where", () => {
  const moved = moveLot(sample[0]!, 1, "freezer");
  assert.equal(moved.lots[0]?.where, "freezer");
});

test("moveLot leaves other lots alone", () => {
  const item: Item = {
    ...sample[0]!,
    lots: [
      { id: 1, qty: { value: 1, kind: "volume" }, addedAt: today, where: "pantry" },
      { id: 2, qty: { value: 1, kind: "volume" }, addedAt: today, where: "fridge" },
    ],
  };
  const moved = moveLot(item, 1, "freezer");
  assert.equal(moved.lots[1]?.where, "fridge");
});

test("shelfReport lists shelves alphabetically", () => {
  const out = shelfReport(sample);
  assert.match(out, /# fridge\/1/);
  assert.match(out, /# pantry\/2/);
});

test("totalShelves counts distinct shelves", () => {
  assert.equal(totalShelves(sample), 2);
});

test("empty input yields empty report", () => {
  assert.equal(shelfReport([]), "\n");
});
