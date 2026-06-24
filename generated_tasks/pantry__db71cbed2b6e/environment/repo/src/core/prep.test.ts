import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, planTotalDraw, summarize } from "./prep.js";
import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

const recipe: Recipe = {
  id: 1, slug: "minestrone", name: "Minestrone", servings: 4,
  ingredients: [
    { slug: "tomato", qty: { value: 800, kind: "mass" } },
    { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
  ],
  createdAt: today, updatedAt: today,
};

test("plan with empty pantry has zero draws + non-empty shortfall", () => {
  const p = plan(recipe, []);
  assert.equal(p.fullyCovered, false);
  for (const step of p.steps) assert.equal(step.draws.length, 0);
});

test("plan covered when pantry has enough", () => {
  const items: Item[] = [
    {
      id: 1, slug: "tomato", name: "Tomato",
      lots: [{ id: 1, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry" }],
      createdAt: today, updatedAt: today,
    },
    {
      id: 2, slug: "olive-oil", name: "Olive Oil",
      lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
      createdAt: today, updatedAt: today,
    },
  ];
  const p = plan(recipe, items);
  assert.equal(p.fullyCovered, true);
});

test("plan splits across multiple lots", () => {
  const items: Item[] = [
    {
      id: 1, slug: "tomato", name: "Tomato",
      lots: [
        { id: 1, qty: { value: 300, kind: "mass" }, addedAt: today, where: "pantry" },
        { id: 2, qty: { value: 600, kind: "mass" }, addedAt: today, where: "pantry" },
      ],
      createdAt: today, updatedAt: today,
    },
  ];
  const p = plan(recipe, items);
  const tomatoStep = p.steps.find((s) => s.ingredientSlug === "tomato");
  assert.equal(tomatoStep?.draws.length, 2);
});

test("planTotalDraw sums across draws", () => {
  const items: Item[] = [
    {
      id: 1, slug: "tomato", name: "Tomato",
      lots: [
        { id: 1, qty: { value: 300, kind: "mass" }, addedAt: today, where: "pantry" },
        { id: 2, qty: { value: 600, kind: "mass" }, addedAt: today, where: "pantry" },
      ],
      createdAt: today, updatedAt: today,
    },
  ];
  const p = plan(recipe, items);
  assert.equal(planTotalDraw(p, "tomato"), 800);
});

test("plan picks oldest-first across lots", () => {
  const items: Item[] = [{
    id: 1, slug: "tomato", name: "Tomato",
    lots: [
      { id: 1, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry", bestBy: "2026-05-01" },
      { id: 2, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry", bestBy: "2026-04-20" },
    ],
    createdAt: today, updatedAt: today,
  }];
  const p = plan(recipe, items);
  const tomato = p.steps.find((s) => s.ingredientSlug === "tomato");
  assert.equal(tomato?.draws[0]?.lotId, 2); // earlier best-by goes first
});

test("summarize renders covered + steps", () => {
  const p = plan(recipe, []);
  const out = summarize(p);
  assert.match(out, /minestrone/);
  assert.match(out, /covered: false/);
});

test("plan tolerates extra ingredient kinds", () => {
  const r: Recipe = {
    ...recipe,
    ingredients: [{ slug: "egg", qty: { value: 2, kind: "count" } }],
  };
  const items: Item[] = [{
    id: 1, slug: "egg", name: "Egg",
    lots: [{ id: 1, qty: { value: 6, kind: "count" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  }];
  const p = plan(r, items);
  assert.equal(p.fullyCovered, true);
});

test("plan steps preserve recipe order", () => {
  const p = plan(recipe, []);
  assert.equal(p.steps[0]?.ingredientSlug, "tomato");
  assert.equal(p.steps[1]?.ingredientSlug, "olive-oil");
});
