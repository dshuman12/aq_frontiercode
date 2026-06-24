import { test } from "node:test";
import assert from "node:assert/strict";
import { build, format } from "./analyze.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

const items: Item[] = [
  { id: 1, slug: "olive-oil", name: "X", lots: [{ id: 1, qty: { value: 1, kind: "volume" }, addedAt: today, where: "pantry" }], createdAt: today, updatedAt: today },
  { id: 2, slug: "rice", name: "X", lots: [{ id: 1, qty: { value: 1, kind: "mass" }, addedAt: today, where: "pantry" }], createdAt: today, updatedAt: today },
];

const recipesByMeal = new Map([
  ["a", [{ slug: "olive-oil" }, { slug: "tomato" }]],
  ["b", [{ slug: "rice" }, { slug: "olive-oil" }]],
]);

test("counts most-used ingredients across meals", () => {
  const r = build({
    items,
    meals: [
      { date: "2026-04-15", meal: "dinner", recipeSlug: "a", servings: 4 },
      { date: "2026-04-16", meal: "dinner", recipeSlug: "b", servings: 4 },
    ],
    waste: [],
    recipesByMeal,
  });
  const oliveCount = r.mostUsedSlugs.find((x) => x.slug === "olive-oil")?.count;
  assert.equal(oliveCount, 2);
});

test("rarelyUsed lists pantry items not in any meal recipe", () => {
  const r = build({
    items: [{ id: 99, slug: "saffron", name: "X", lots: [], createdAt: today, updatedAt: today }],
    meals: [],
    waste: [],
    recipesByMeal,
  });
  assert.ok(r.rarelyUsed.includes("saffron"));
});

test("alwaysShort surfaces ingredients used >=3 times not in pantry", () => {
  const r = build({
    items: [],
    meals: [
      { date: "2026-04-01", meal: "x", recipeSlug: "a", servings: 4 },
      { date: "2026-04-02", meal: "x", recipeSlug: "a", servings: 4 },
      { date: "2026-04-03", meal: "x", recipeSlug: "a", servings: 4 },
    ],
    waste: [],
    recipesByMeal,
  });
  assert.ok(r.alwaysShort.includes("tomato"));
});

test("mostWastedSlugs ranks by waste count", () => {
  const r = build({
    items, meals: [], waste: [
      { date: "2026-04-15", slug: "milk", qty: { value: 1, kind: "count" }, reason: "expired" },
      { date: "2026-04-15", slug: "milk", qty: { value: 1, kind: "count" }, reason: "expired" },
      { date: "2026-04-15", slug: "lettuce", qty: { value: 1, kind: "count" }, reason: "spoiled" },
    ], recipesByMeal,
  });
  assert.equal(r.mostWastedSlugs[0]?.slug, "milk");
});

test("totals reflect items + lots", () => {
  const r = build({ items, meals: [], waste: [], recipesByMeal });
  assert.equal(r.pantrySize, 2);
  assert.equal(r.totalLots, 2);
});

test("format prints all sections", () => {
  const r = build({
    items, meals: [
      { date: "2026-04-15", meal: "dinner", recipeSlug: "a", servings: 4 },
    ],
    waste: [
      { date: "2026-04-15", slug: "milk", qty: { value: 1, kind: "count" }, reason: "expired" },
    ],
    recipesByMeal,
  });
  const text = format(r);
  assert.match(text, /Most-used ingredients/);
  assert.match(text, /Most-wasted/);
});

test("empty inputs still produce a header", () => {
  const r = build({ items: [], meals: [], waste: [], recipesByMeal });
  assert.equal(r.pantrySize, 0);
});
