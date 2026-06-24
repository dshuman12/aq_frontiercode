import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClusters, findSimilar, similarity } from "./similarity.js";
import type { Recipe } from "./recipe.js";

const today = "2026-04-15";

function mk(slug: string, slugs: string[]): Recipe {
  return {
    id: 1, slug, name: slug.toUpperCase(), servings: 4,
    ingredients: slugs.map((s) => ({ slug: s, qty: { value: 1, kind: "count" } })),
    createdAt: today, updatedAt: today,
  };
}

test("identical recipes have similarity ~1", () => {
  const a = mk("a", ["x", "y"]);
  const b = mk("b", ["x", "y"]);
  assert.ok(Math.abs(similarity(a, b) - 1) < 1e-9);
});

test("disjoint recipes have similarity 0", () => {
  const a = mk("a", ["x"]);
  const b = mk("b", ["y"]);
  assert.equal(similarity(a, b), 0);
});

test("similarity in [0, 1]", () => {
  const a = mk("a", ["x", "y", "z"]);
  const b = mk("b", ["x", "z", "w"]);
  const s = similarity(a, b);
  assert.ok(s > 0 && s < 1);
});

test("findSimilar excludes self", () => {
  const a = mk("a", ["x", "y"]);
  const b = mk("b", ["x", "y"]);
  const out = findSimilar(a, [a, b], 5);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.slug, "b");
});

test("findSimilar sorts highest first", () => {
  const a = mk("a", ["x", "y", "z"]);
  const b = mk("b", ["x", "y"]);
  const c = mk("c", ["x"]);
  const out = findSimilar(a, [b, c], 5);
  assert.equal(out[0]?.slug, "b");
});

test("findSimilar limits N", () => {
  const a = mk("a", ["x"]);
  const others = Array.from({ length: 5 }, (_, i) => mk(`b${i}`, ["x"]));
  assert.equal(findSimilar(a, others, 3).length, 3);
});

test("findSimilar negative N gives empty", () => {
  const a = mk("a", ["x"]);
  assert.equal(findSimilar(a, [mk("b", ["x"])], -1).length, 0);
});

test("buildClusters groups very similar recipes", () => {
  const a = mk("a", ["x", "y"]);
  const b = mk("b", ["x", "y"]);
  const c = mk("c", ["w", "z"]);
  const out = buildClusters([a, b, c], 0.9);
  assert.equal(out.length, 2);
  assert.ok(out[0]!.includes("a") && out[0]!.includes("b"));
});

test("empty recipe doesn't crash", () => {
  const empty = mk("a", []);
  const b = mk("b", ["x"]);
  assert.equal(similarity(empty, b), 0);
});
