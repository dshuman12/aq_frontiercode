import { test } from "node:test";
import assert from "node:assert/strict";
import { build, totals } from "./weekly.js";
import type { Item } from "../core/item.js";

const items: Item[] = [
  {
    id: 1, slug: "a", name: "A",
    lots: [
      { id: 1, qty: { value: 1, kind: "count" }, addedAt: "2026-04-01", where: "pantry" },
      { id: 2, qty: { value: 1, kind: "count" }, addedAt: "2026-04-08", where: "pantry" },
    ],
    createdAt: "2026-04-01", updatedAt: "2026-04-08",
  },
];

test("build groups by ISO week", () => {
  const rows = build(items, [], "2026-04-01", "2026-04-30");
  assert.ok(rows.length >= 2);
});

test("counts lots and items added", () => {
  const rows = build(items, [], "2026-04-01", "2026-04-30");
  const totalLots = rows.reduce((acc, r) => acc + r.lotsAdded, 0);
  assert.equal(totalLots, 2);
});

test("counts waste entries when in window", () => {
  const rows = build(items, [
    { date: "2026-04-15", slug: "milk", qty: { value: 1, kind: "count" }, reason: "expired" },
  ], "2026-04-01", "2026-04-30");
  const totalWaste = rows.reduce((acc, r) => acc + r.wasteEntries, 0);
  assert.equal(totalWaste, 1);
});

test("excludes events outside window", () => {
  const rows = build(items, [
    { date: "2026-05-15", slug: "x", qty: { value: 1, kind: "count" }, reason: "other" },
  ], "2026-04-01", "2026-04-30");
  const totalWaste = rows.reduce((acc, r) => acc + r.wasteEntries, 0);
  assert.equal(totalWaste, 0);
});

test("totals sums everything", () => {
  const rows = build(items, [], "2026-04-01", "2026-04-30");
  const t = totals(rows);
  assert.equal(t.itemsAdded, 1);
  assert.equal(t.lotsAdded, 2);
});

test("empty inputs return empty rows", () => {
  const rows = build([], [], "2026-04-01", "2026-04-30");
  assert.deepEqual(rows, []);
});
