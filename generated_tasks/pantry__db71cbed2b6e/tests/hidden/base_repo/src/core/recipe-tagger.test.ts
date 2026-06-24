import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAll, applyTags, ruleNames, suggestTags } from "./recipe-tagger.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

function mk(slugs: string[], opts: Partial<Recipe> = {}): Recipe {
  return {
    id: 1, slug: "x", name: "X", servings: 4,
    ingredients: slugs.map((s) => ({ slug: s, qty: { value: 1, kind: "count" } })),
    createdAt: today, updatedAt: today,
    ...opts,
  };
}

test("vegetarian when no meat ingredients", () => {
  const tags = suggestTags(mk(["tomato", "olive-oil"]));
  assert.ok(tags.includes("vegetarian"));
});

test("not vegetarian when meat present", () => {
  const tags = suggestTags(mk(["ground-beef", "tomato"]));
  assert.equal(tags.includes("vegetarian"), false);
});

test("vegan rejects dairy", () => {
  const tags = suggestTags(mk(["milk", "tomato"]));
  assert.equal(tags.includes("vegan"), false);
});

test("vegan when no animal products", () => {
  const tags = suggestTags(mk(["tomato", "olive-oil", "rice-uncooked"]));
  assert.ok(tags.includes("vegan"));
});

test("pasta tag triggers on pasta slug", () => {
  const tags = suggestTags(mk(["spaghetti"]));
  assert.ok(tags.includes("pasta"));
});

test("soup needs broth + name", () => {
  const tags = suggestTags(mk(["vegetable-broth"], { name: "Tomato Soup" }));
  assert.ok(tags.includes("soup"));
});

test("baking detects flour + sugar", () => {
  const tags = suggestTags(mk(["all-purpose-flour", "sugar-white"]));
  assert.ok(tags.includes("baking"));
});

test("weeknight under 35 min", () => {
  const tags = suggestTags(mk(["tomato"], { totalMinutes: 25 }));
  assert.ok(tags.includes("weeknight"));
});

test("weekend over 90 min", () => {
  const tags = suggestTags(mk(["tomato"], { totalMinutes: 120 }));
  assert.ok(tags.includes("weekend"));
});

test("applyTags merges with existing", () => {
  const r = applyTags(mk(["spaghetti"], { tags: ["italian"] }));
  assert.ok(r.tags?.includes("italian"));
  assert.ok(r.tags?.includes("pasta"));
});

test("ruleNames is sorted", () => {
  const out = ruleNames();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! <= out[i]!);
});

test("applyAll updates every recipe", () => {
  const updated = applyAll([
    mk(["spaghetti"], { id: 1 }),
    mk(["all-purpose-flour", "sugar-white"], { id: 2 }),
  ]);
  assert.ok(updated[0]?.tags?.includes("pasta"));
  assert.ok(updated[1]?.tags?.includes("baking"));
});
