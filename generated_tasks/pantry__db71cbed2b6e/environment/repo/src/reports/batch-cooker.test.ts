import { test } from "node:test";
import assert from "node:assert/strict";
import { plan } from "./batch-cooker.js";
import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-19";

const recipes: Recipe[] = [
  {
    id: 1, slug: "minestrone", name: "Minestrone", servings: 4, totalMinutes: 60,
    ingredients: [{ slug: "tomato", qty: { value: 800, kind: "mass" } }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "rice-bowl", name: "Rice Bowl", servings: 4, totalMinutes: 30,
    ingredients: [{ slug: "rice-uncooked", qty: { value: 300, kind: "mass" } }],
    createdAt: today, updatedAt: today,
  },
];

const pantry: Item[] = [];

test("plan totals servings + minutes", () => {
  const p = plan({ recipes, household: 4, pantry, date: today });
  assert.equal(p.totalServings, 8);
  assert.equal(p.totalMinutes, 90);
});

test("plan emits a shopping markdown", () => {
  const p = plan({ recipes, household: 4, pantry, date: today });
  assert.match(p.shoppingMD, /shopping list/);
});

test("plan emits a schedule markdown", () => {
  const p = plan({ recipes, household: 4, pantry, date: today });
  assert.match(p.scheduleMD, /Cook session - 2026-04-19/);
  assert.match(p.scheduleMD, /minestrone/);
  assert.match(p.scheduleMD, /rice-bowl/);
});

test("schedule sorted longest-first", () => {
  const p = plan({ recipes, household: 4, pantry, date: today });
  const idxMin = p.scheduleMD.indexOf("minestrone");
  const idxRice = p.scheduleMD.indexOf("rice-bowl");
  assert.ok(idxMin < idxRice);
});

test("recipes with no totalMinutes default to 60", () => {
  const r2: Recipe = { ...recipes[0]!, slug: "x", id: 3 };
  delete r2.totalMinutes;
  const p = plan({ recipes: [r2], household: 4, pantry, date: today });
  assert.equal(p.totalMinutes, 60);
});

test("household scaling applies max(household, recipe.servings)", () => {
  const r: Recipe = { ...recipes[0]!, servings: 2 };
  const p = plan({ recipes: [r], household: 6, pantry, date: today });
  assert.equal(p.totalServings, 6);
});

test("empty recipes returns zero totals", () => {
  const p = plan({ recipes: [], household: 4, pantry, date: today });
  assert.equal(p.totalServings, 0);
  assert.equal(p.totalMinutes, 0);
});
