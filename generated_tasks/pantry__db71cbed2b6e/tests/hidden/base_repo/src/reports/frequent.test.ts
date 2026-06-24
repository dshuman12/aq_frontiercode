import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFrequencyReport, topN, totalLots } from "./frequent.js";
import type { Item } from "../core/item.js";

const sample: Item[] = [
  {
    id: 1, slug: "milk", name: "Milk",
    lots: [
      { id: 1, qty: { value: 1, kind: "count" }, addedAt: "2026-03-01", where: "fridge" },
      { id: 2, qty: { value: 1, kind: "count" }, addedAt: "2026-03-15", where: "fridge" },
      { id: 3, qty: { value: 1, kind: "count" }, addedAt: "2026-04-01", where: "fridge" },
    ],
    createdAt: "2026-01-01", updatedAt: "2026-04-01",
  },
  {
    id: 2, slug: "olive-oil", name: "Olive Oil",
    lots: [
      { id: 1, qty: { value: 500, kind: "volume" }, addedAt: "2026-02-20", where: "pantry" },
    ],
    createdAt: "2026-01-01", updatedAt: "2026-02-20",
  },
];

test("buildFrequencyReport counts lots in window", () => {
  const r = buildFrequencyReport(sample, "2026-03-01", "2026-04-01");
  const milk = r.find((e) => e.slug === "milk");
  assert.equal(milk?.lotCount, 3);
});

test("excludes items with no lots in window", () => {
  const r = buildFrequencyReport(sample, "2026-04-15", "2026-04-30");
  assert.equal(r.length, 0);
});

test("sorted by lotCount desc", () => {
  const r = buildFrequencyReport(sample, "2026-01-01", "2026-12-31");
  assert.equal(r[0]?.slug, "milk");
});

test("per30Days computed", () => {
  const r = buildFrequencyReport(sample, "2026-03-01", "2026-04-01");
  const milk = r.find((e) => e.slug === "milk");
  // 3 lots over ~31 days -> ~2.9 per 30 days
  assert.ok((milk?.per30Days ?? 0) >= 2);
});

test("topN clamps to length", () => {
  const r = buildFrequencyReport(sample, "2026-01-01", "2026-12-31");
  assert.equal(topN(r, 99).length, r.length);
  assert.equal(topN(r, 0).length, 0);
});

test("topN negative is treated as zero", () => {
  const r = buildFrequencyReport(sample, "2026-01-01", "2026-12-31");
  assert.equal(topN(r, -1).length, 0);
});

test("totalLots sums lotCount", () => {
  const r = buildFrequencyReport(sample, "2026-01-01", "2026-12-31");
  assert.equal(totalLots(r), 4);
});
