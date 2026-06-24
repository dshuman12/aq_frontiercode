import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cupsForGrams,
  describe,
  entries,
  gramsForCups,
  knownSlugs,
  lookup,
  tablespoonsForGrams,
} from "./density.js";

test("entries non-empty + well-formed", () => {
  for (const e of entries()) {
    assert.ok(e.slug.length > 0);
    assert.ok(e.gPerCup > 0);
    assert.ok(e.gPerTbsp > 0);
    assert.ok(e.gPerTsp > 0);
    assert.ok(e.gPerMl > 0);
  }
});

test("water has 237 g/cup", () => {
  assert.equal(lookup("water")?.gPerCup, 237);
});

test("lookup returns null for unknown", () => {
  assert.equal(lookup("dragonfruit"), null);
});

test("gramsForCups + cupsForGrams round trip", () => {
  const g = gramsForCups("milk", 1);
  assert.ok(g);
  const c = cupsForGrams("milk", g!);
  assert.ok(Math.abs(c! - 1) < 0.001);
});

test("tablespoonsForGrams correct", () => {
  // 30 g of water -> ~2 tbsp (30 / 15)
  const t = tablespoonsForGrams("water", 30);
  assert.ok(t && Math.abs(t - 2) < 0.01);
});

test("describe gives a string", () => {
  assert.match(describe("olive-oil"), /g\/cup/);
});

test("describe handles unknown gracefully", () => {
  assert.match(describe("dragonfruit"), /unknown/);
});

test("knownSlugs sorted distinct", () => {
  const out = knownSlugs();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! < out[i]!);
});

test("returns null for missing slugs", () => {
  assert.equal(gramsForCups("nope", 1), null);
  assert.equal(cupsForGrams("nope", 100), null);
  assert.equal(tablespoonsForGrams("nope", 100), null);
});
