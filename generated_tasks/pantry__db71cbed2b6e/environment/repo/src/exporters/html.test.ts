import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "./html.js";
import type { Item } from "../core/item.js";

const today = "2026-03-15";

test("renders document skeleton", () => {
  const out = render([], today);
  assert.match(out, /<!DOCTYPE html>/);
  assert.match(out, /<title>pantry<\/title>/);
});

test("counts items and lots", () => {
  const items: Item[] = [{
    id: 1, slug: "olive-oil", name: "Olive Oil",
    lots: [
      { id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" },
      { id: 2, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "pantry" },
    ],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items, today);
  assert.match(out, /1 items/);
  assert.match(out, /2 lots/);
});

test("escapes HTML special characters", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "<script>",
    lots: [],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items, today);
  assert.equal(out.includes("<script>"), false);
  assert.match(out, /&lt;script&gt;/);
});

test("expired class applied", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{
      id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today,
      where: "fridge", bestBy: "2026-03-14",
    }],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items, today);
  assert.match(out, /class="expired"/);
});
