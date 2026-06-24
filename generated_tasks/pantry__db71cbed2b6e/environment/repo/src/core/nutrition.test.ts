import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TABLE,
  addMacros,
  emptyMacros,
  format,
  knownSlugs,
  lookup,
  macrosFor,
  scaleMacros,
} from "./nutrition.js";

test("TABLE entries are well-formed", () => {
  for (const e of TABLE) {
    assert.ok(e.slug.length > 0);
    assert.ok(e.per100.cal >= 0);
  }
});

test("lookup hits + misses", () => {
  assert.equal(lookup("olive-oil")?.basis, "volume");
  assert.equal(lookup("dragonfruit"), null);
});

test("macrosFor scales linearly", () => {
  const m = macrosFor("olive-oil", { value: 50, kind: "volume" });
  assert.equal(m?.cal, 442);
});

test("macrosFor rejects mass<->volume crossover", () => {
  assert.equal(macrosFor("olive-oil", { value: 100, kind: "mass" }), null);
});

test("macrosFor rejects count for mass-based slug", () => {
  assert.equal(macrosFor("rice-uncooked", { value: 1, kind: "count" }), null);
});

test("addMacros sums", () => {
  const a = { cal: 100, protein: 5, carbs: 10, fat: 2 };
  const b = { cal: 200, protein: 5, carbs: 15, fat: 3 };
  const c = addMacros(a, b);
  assert.equal(c.cal, 300);
  assert.equal(c.protein, 10);
});

test("emptyMacros all zero", () => {
  assert.deepEqual(emptyMacros(), { cal: 0, protein: 0, carbs: 0, fat: 0 });
});

test("scaleMacros 0 -> all zero", () => {
  const m = scaleMacros({ cal: 100, protein: 5, carbs: 10, fat: 2 }, 0);
  assert.equal(m.cal, 0);
});

test("format produces a string", () => {
  const out = format({ cal: 100, protein: 5, carbs: 10, fat: 2 });
  assert.match(out, /100 kcal/);
});

test("knownSlugs is sorted distinct", () => {
  const out = knownSlugs();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! < out[i]!);
});
