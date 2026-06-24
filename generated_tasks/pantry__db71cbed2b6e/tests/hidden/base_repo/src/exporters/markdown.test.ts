import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "./markdown.js";
import type { Item } from "../core/item.js";

const today = "2026-03-15";

test("empty pantry renders header and zero totals", () => {
  const out = render([], today);
  assert.match(out, /# Pantry/);
  assert.match(out, /items:    0/);
});

test("groups by category", () => {
  const items: Item[] = [
    {
      id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
      lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
      createdAt: today, updatedAt: today,
    },
    {
      id: 2, slug: "flour", name: "Flour", category: "grains",
      lots: [{ id: 1, qty: { value: 2000, kind: "mass" }, addedAt: today, where: "pantry" }],
      createdAt: today, updatedAt: today,
    },
  ];
  const out = render(items, today);
  assert.match(out, /## grains/);
  assert.match(out, /## oils/);
});

test("uncategorised header for items without category", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X", lots: [],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items, today);
  assert.match(out, /## Uncategorised/);
});

test("marks expired lots", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{
      id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today,
      where: "fridge", bestBy: "2026-03-14",
    }],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items, today);
  assert.match(out, /\*\*EXPIRED\*\*/);
});

test("includes lot notes when present", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{
      id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today,
      where: "fridge", notes: "from the dairy",
    }],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items, today);
  assert.match(out, /from the dairy/);
});

test("totals sum across items", () => {
  const items: Item[] = [
    { id: 1, slug: "a", name: "A", lots: [
      { id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry" },
      { id: 2, qty: { value: 2, kind: "count" }, addedAt: today, where: "pantry" },
    ], createdAt: today, updatedAt: today },
    { id: 2, slug: "b", name: "B", lots: [
      { id: 1, qty: { value: 3, kind: "count" }, addedAt: today, where: "pantry" },
    ], createdAt: today, updatedAt: today },
  ];
  const out = render(items, today);
  assert.match(out, /lots:     3/);
});
