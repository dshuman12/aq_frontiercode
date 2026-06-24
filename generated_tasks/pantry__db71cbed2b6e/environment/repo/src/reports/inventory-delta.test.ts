import { test } from "node:test";
import assert from "node:assert/strict";
import { biggestGain, biggestLoss, diff, format, summary } from "./inventory-delta.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

function mk(slug: string, value: number, kind: "mass" | "volume" | "count" = "mass"): Item {
  return {
    id: 1, slug, name: slug,
    lots: [{ id: 1, qty: { value, kind }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  };
}

test("diff captures added items as positive delta", () => {
  const out = diff([], [mk("a", 100)]);
  assert.equal(out[0]?.delta, 100);
});

test("diff captures removed items as negative delta", () => {
  const out = diff([mk("a", 100)], []);
  assert.equal(out[0]?.delta, -100);
});

test("diff captures qty change", () => {
  const out = diff([mk("a", 100)], [mk("a", 250)]);
  assert.equal(out[0]?.delta, 150);
});

test("diff skips unchanged", () => {
  const out = diff([mk("a", 100)], [mk("a", 100)]);
  assert.deepEqual(out, []);
});

test("diff sorted by abs(delta) desc", () => {
  const out = diff(
    [mk("a", 100), mk("b", 100)],
    [mk("a", 200), mk("b", 50)],
  );
  // a delta = 100, b delta = -50; 100 > 50
  assert.equal(out[0]?.slug, "a");
});

test("format produces signed lines", () => {
  const out = format([{ slug: "a", beforeValue: 0, afterValue: 100, delta: 100, unit: "mass" }]);
  assert.match(out, /\+100/);
});

test("summary counts +/-", () => {
  const out = summary([
    { slug: "a", beforeValue: 0, afterValue: 100, delta: 100, unit: "mass" },
    { slug: "b", beforeValue: 100, afterValue: 0, delta: -100, unit: "mass" },
  ]);
  assert.match(out, /\+1 -1/);
});

test("biggestGain", () => {
  const gain = biggestGain([
    { slug: "a", beforeValue: 0, afterValue: 100, delta: 100, unit: "mass" },
    { slug: "b", beforeValue: 0, afterValue: 50, delta: 50, unit: "mass" },
  ]);
  assert.equal(gain?.slug, "a");
});

test("biggestGain returns null on empty", () => {
  assert.equal(biggestGain([]), null);
});

test("biggestLoss", () => {
  const loss = biggestLoss([
    { slug: "a", beforeValue: 100, afterValue: 0, delta: -100, unit: "mass" },
    { slug: "b", beforeValue: 50, afterValue: 0, delta: -50, unit: "mass" },
  ]);
  assert.equal(loss?.slug, "a");
});

test("biggestLoss returns null on empty", () => {
  assert.equal(biggestLoss([]), null);
});
