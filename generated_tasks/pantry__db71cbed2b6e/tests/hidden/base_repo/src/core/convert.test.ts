import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN, cupsToGrams, gramsToMl, knownSlugs, lookup, mlToGrams } from "./convert.js";

test("BUILT_IN is non-empty and well-formed", () => {
  assert.ok(BUILT_IN.length > 0);
  for (const e of BUILT_IN) {
    assert.ok(e.slug.length > 0);
    assert.ok(e.gPerMl > 0);
  }
});

test("water has density 1", () => {
  const e = lookup("water");
  assert.equal(e?.gPerMl, 1.0);
});

test("gramsToMl round-trips with mlToGrams", () => {
  const ml = gramsToMl("milk", 100);
  assert.ok(ml !== null);
  const back = mlToGrams("milk", ml!);
  assert.equal(Math.round(back!), 100);
});

test("returns null for unknown slug", () => {
  assert.equal(gramsToMl("dragonfruit", 100), null);
  assert.equal(mlToGrams("dragonfruit", 100), null);
});

test("extras override built-in", () => {
  const v = gramsToMl("water", 100, [{ slug: "water", gPerMl: 2 }]);
  assert.equal(v, 50);
});

test("knownSlugs returns sorted distinct", () => {
  const out = knownSlugs();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! <= out[i]!);
});

test("knownSlugs includes extras", () => {
  const out = knownSlugs([{ slug: "moonbeam", gPerMl: 0.1 }]);
  assert.equal(out.includes("moonbeam"), true);
});

test("cupsToGrams basic sanity", () => {
  // 1 cup of water ~= 237 g
  const g = cupsToGrams("water", 1);
  assert.ok(g !== null);
  assert.ok(g! > 235 && g! < 240);
});

test("cupsToGrams unknown returns null", () => {
  assert.equal(cupsToGrams("dragonfruit", 1), null);
});
