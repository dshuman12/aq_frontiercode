import { test } from "node:test";
import assert from "node:assert/strict";
import { audit, countByCode, format } from "./recipe-health.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

function mk(opts: Partial<Recipe>): Recipe {
  return {
    id: 1, slug: "x", name: "X", servings: 4,
    ingredients: [{ slug: "tomato", qty: { value: 1, kind: "count" } }],
    createdAt: today, updatedAt: today,
    ...opts,
  };
}

test("clean recipe has no findings", () => {
  assert.deepEqual(audit([mk({})]), []);
});

test("flags zero ingredients", () => {
  const f = audit([mk({ ingredients: [] })]);
  assert.ok(f.some((x) => x.code === "no-ingredients"));
});

test("flags bad servings", () => {
  const f = audit([mk({ servings: 0 })]);
  assert.ok(f.some((x) => x.code === "bad-servings"));
});

test("flags negative time", () => {
  const f = audit([mk({ totalMinutes: -5 })]);
  assert.ok(f.some((x) => x.code === "negative-time"));
});

test("flags implausibly long time", () => {
  const f = audit([mk({ totalMinutes: 1000 })]);
  assert.ok(f.some((x) => x.code === "implausible-time"));
});

test("flags duplicate slugs", () => {
  const f = audit([mk({ slug: "a" }), mk({ id: 2, slug: "a" })]);
  assert.ok(f.some((x) => x.code === "duplicate-slug"));
});

test("flags duplicate ingredients", () => {
  const f = audit([mk({
    ingredients: [
      { slug: "tomato", qty: { value: 1, kind: "count" } },
      { slug: "tomato", qty: { value: 1, kind: "count" } },
    ],
  })]);
  assert.ok(f.some((x) => x.code === "duplicate-ingredient"));
});

test("flags zero qty", () => {
  const f = audit([mk({
    ingredients: [{ slug: "tomato", qty: { value: 0, kind: "count" } }],
  })]);
  assert.ok(f.some((x) => x.code === "zero-qty"));
});

test("flags vegan mismatch", () => {
  const f = audit([mk({
    tags: ["vegan"],
    ingredients: [{ slug: "milk", qty: { value: 100, kind: "volume" } }],
  })]);
  assert.ok(f.some((x) => x.code === "vegan-mismatch"));
});

test("format empty findings says no findings", () => {
  assert.match(format([]), /no recipe findings/);
});

test("countByCode aggregates", () => {
  const counts = countByCode([
    { recipeSlug: "a", code: "x", detail: "y" },
    { recipeSlug: "b", code: "x", detail: "y" },
    { recipeSlug: "c", code: "z", detail: "y" },
  ]);
  assert.equal(counts["x"], 2);
  assert.equal(counts["z"], 1);
});
