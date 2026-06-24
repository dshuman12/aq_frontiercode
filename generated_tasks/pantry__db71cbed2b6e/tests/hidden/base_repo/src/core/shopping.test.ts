import { test } from "node:test";
import assert from "node:assert/strict";
import { build, format, shortfallOnly } from "./shopping.js";
import type { Item } from "./item.js";
import type { Recipe } from "./recipe.js";

const today = "2026-01-15";

const recipe: Recipe = {
  id: 1,
  slug: "minestrone",
  name: "Minestrone",
  servings: 4,
  ingredients: [
    { slug: "tomato", qty: { value: 800, kind: "mass" } },
    { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
  ],
  createdAt: today,
  updatedAt: today,
};

const pantry: Item[] = [
  {
    id: 1, slug: "tomato", name: "Tomato",
    lots: [
      { id: 1, qty: { value: 500, kind: "mass" }, addedAt: today, where: "pantry" },
    ],
    createdAt: today, updatedAt: today,
  },
];

test("build computes shortfall against pantry", () => {
  const list = build({ recipes: [recipe], pantry, today });
  const tomato = list.entries.find((e) => e.slug === "tomato");
  assert.equal(tomato?.shortfall.value, 300);
  const oil = list.entries.find((e) => e.slug === "olive-oil");
  assert.equal(oil?.shortfall.value, 30);
});

test("build uses serving overrides", () => {
  const list = build({
    recipes: [recipe], pantry, today,
    servingOverrides: new Map([["minestrone", 8]]),
  });
  const tomato = list.entries.find((e) => e.slug === "tomato");
  // 800 g per 4 -> 1600 for 8, minus 500 in pantry = 1100
  assert.equal(tomato?.shortfall.value, 1100);
});

test("build merges duplicate ingredients across recipes", () => {
  const second: Recipe = {
    ...recipe,
    id: 2, slug: "soup",
    ingredients: [{ slug: "tomato", qty: { value: 200, kind: "mass" } }],
  };
  const list = build({ recipes: [recipe, second], pantry, today });
  const tomato = list.entries.find((e) => e.slug === "tomato");
  assert.equal(tomato?.totalNeeded.value, 1000);
  assert.equal(tomato?.recipes.length, 2);
});

test("build with extras", () => {
  const list = build({
    recipes: [], pantry, today,
    extras: [{ slug: "bread", qty: { value: 1, kind: "count" } }],
  });
  const bread = list.entries.find((e) => e.slug === "bread");
  assert.equal(bread?.shortfall.value, 1);
});

test("build empty inputs", () => {
  const list = build({ recipes: [], pantry: [], today });
  assert.deepEqual(list.entries, []);
});

test("shortfallOnly drops zeros", () => {
  // pantry has more than recipe needs
  const bigPantry: Item[] = [{
    ...pantry[0]!,
    lots: [{ id: 1, qty: { value: 5000, kind: "mass" }, addedAt: today, where: "pantry" }],
  }];
  const list = build({ recipes: [recipe], pantry: bigPantry, today });
  const visible = shortfallOnly(list);
  // tomato shortfall is 0, olive-oil is still 30
  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.slug, "olive-oil");
});

test("format renders header + entries", () => {
  const list = build({ recipes: [recipe], pantry, today });
  const out = format(list);
  assert.match(out, /shopping list/);
  assert.match(out, /tomato/);
});

test("format excludes zero-shortfall entries", () => {
  const big: Item[] = [{
    ...pantry[0]!,
    lots: [{ id: 1, qty: { value: 5000, kind: "mass" }, addedAt: today, where: "pantry" }],
  }];
  const list = build({ recipes: [recipe], pantry: big, today });
  const out = format(list);
  assert.equal(out.includes("- tomato"), false);
});
