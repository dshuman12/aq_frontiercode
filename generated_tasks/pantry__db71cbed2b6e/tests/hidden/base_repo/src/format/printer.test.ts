import { test } from "node:test";
import assert from "node:assert/strict";
import {
  itemFull,
  itemHeader,
  lotLine,
  quantity,
  recipeFull,
  recipeShort,
  summary,
} from "./printer.js";
import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

const item: Item = {
  id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
  lots: [
    { id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry", bestBy: "2027-01-30" },
  ],
  createdAt: today, updatedAt: today,
};

const recipe: Recipe = {
  id: 1, slug: "minestrone", name: "Minestrone", servings: 4, totalMinutes: 60,
  ingredients: [
    { slug: "tomato", qty: { value: 800, kind: "mass" } },
    { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
  ],
  tags: ["soup"],
  createdAt: today, updatedAt: today,
};

test("quantity formatter for various units", () => {
  assert.equal(quantity({ value: 500, kind: "mass" }), "500g");
  assert.equal(quantity({ value: 1500, kind: "mass" }), "1.50kg");
  assert.equal(quantity({ value: 250, kind: "volume" }), "250ml");
  assert.equal(quantity({ value: 1500, kind: "volume" }), "1.50L");
  assert.equal(quantity({ value: 3, kind: "count" }), "3");
});

test("lotLine includes id, qty, location", () => {
  const line = lotLine(item.lots[0]!);
  assert.match(line, /#1/);
  assert.match(line, /500ml/);
  assert.match(line, /pantry/);
  assert.match(line, /bb 2027-01-30/);
});

test("itemHeader includes slug + category", () => {
  const out = itemHeader(item);
  assert.match(out, /olive-oil/);
  assert.match(out, /\[oils\]/);
});

test("itemFull includes all fields", () => {
  const out = itemFull(item);
  assert.match(out, /id: 1/);
  assert.match(out, /lots:/);
});

test("itemFull (no lots) prints (no lots)", () => {
  const out = itemFull({ ...item, lots: [] });
  assert.match(out, /\(no lots\)/);
});

test("recipeShort includes time", () => {
  assert.match(recipeShort(recipe), /60m/);
});

test("recipeFull includes ingredients + tags", () => {
  const out = recipeFull(recipe);
  assert.match(out, /## Ingredients/);
  assert.match(out, /tomato/);
  assert.match(out, /soup/);
});

test("summary aggregates items + lots + categories", () => {
  const out = summary([item]);
  assert.match(out, /1 items/);
  assert.match(out, /1 lots/);
  assert.match(out, /1 categories/);
});

test("summary on empty pantry", () => {
  assert.match(summary([]), /0 items/);
});
