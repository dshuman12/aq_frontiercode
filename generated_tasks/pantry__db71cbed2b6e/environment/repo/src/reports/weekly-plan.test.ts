import { test } from "node:test";
import assert from "node:assert/strict";
import { format, suggestWeek } from "./weekly-plan.js";
import type { Recipe } from "../core/recipe.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

const recipes: Recipe[] = [
  {
    id: 1, slug: "minestrone", name: "Minestrone", servings: 4,
    ingredients: [{ slug: "tomato", qty: { value: 800, kind: "mass" } }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "rice-bowl", name: "Rice Bowl", servings: 4,
    ingredients: [{ slug: "rice-uncooked", qty: { value: 300, kind: "mass" } }],
    createdAt: today, updatedAt: today,
  },
];

const pantry: Item[] = [{
  id: 1, slug: "tomato", name: "Tomato",
  lots: [{ id: 1, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry" }],
  createdAt: today, updatedAt: today,
}];

test("suggests 7 days", () => {
  const out = suggestWeek({
    startDate: "2026-04-15", history: [], recipes, pantry,
  });
  assert.equal(out.length, 7);
});

test("dates are consecutive", () => {
  const out = suggestWeek({
    startDate: "2026-04-15", history: [], recipes, pantry,
  });
  for (let i = 1; i < out.length; i++) {
    const a = new Date(out[i - 1]!.date + "T00:00:00Z").getTime();
    const b = new Date(out[i]!.date + "T00:00:00Z").getTime();
    assert.equal(b - a, 86400000);
  }
});

test("uses popular history when available", () => {
  const history = [
    { date: "2026-04-01", meal: "dinner", recipeSlug: "minestrone", servings: 4 },
    { date: "2026-04-02", meal: "dinner", recipeSlug: "minestrone", servings: 4 },
  ];
  const out = suggestWeek({
    startDate: "2026-04-15", history, recipes, pantry,
  });
  assert.ok(out.some((s) => s.recipeSlug === "minestrone"));
});

test("classifies covered-by-pantry when ingredients present", () => {
  const history = [{ date: "2026-04-01", meal: "dinner", recipeSlug: "minestrone", servings: 4 }];
  const out = suggestWeek({
    startDate: "2026-04-15", history, recipes, pantry,
  });
  assert.ok(out[0]?.reason === "covered-by-pantry");
});

test("format produces lines", () => {
  const out = suggestWeek({
    startDate: "2026-04-15", history: [], recipes, pantry,
  });
  const text = format(out);
  assert.match(text, /minestrone|rice-bowl/);
});

test("empty recipes returns empty", () => {
  const out = suggestWeek({
    startDate: "2026-04-15", history: [], recipes: [], pantry: [],
  });
  // We return at most 7 entries; with no recipes available, output is empty
  assert.equal(out.length, 0);
});
