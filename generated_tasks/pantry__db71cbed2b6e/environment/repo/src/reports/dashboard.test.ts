import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "./dashboard.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

test("empty pantry renders the headers", () => {
  const out = render([], today);
  assert.match(out, /pantry dashboard/);
  assert.match(out, /items:        0/);
  assert.match(out, /lots:         0/);
});

test("counts items, lots, expired, expiring", () => {
  const items: Item[] = [
    {
      id: 1, slug: "milk", name: "Milk",
      lots: [
        { id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "fridge", bestBy: "2026-04-14" },
        { id: 2, qty: { value: 1, kind: "count" }, addedAt: today, where: "fridge", bestBy: "2026-04-18" },
      ],
      createdAt: today, updatedAt: today,
    },
  ];
  const out = render(items, today);
  assert.match(out, /items:        1/);
  assert.match(out, /lots:         2/);
  assert.match(out, /expired:      1/);
  assert.match(out, /expiring 7d:  1/);
});

test("by-category section appears when categories present", () => {
  const items: Item[] = [
    { id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils", lots: [], createdAt: today, updatedAt: today },
  ];
  const out = render(items, today);
  assert.match(out, /by category/);
  assert.match(out, /oils/);
});

test("low-stock section flags empty items", () => {
  const items: Item[] = [
    { id: 1, slug: "salt", name: "Salt", lots: [], createdAt: today, updatedAt: today },
  ];
  const out = render(items, today);
  assert.match(out, /salt {2}\(empty\)/);
});

test("expiring soon shows up to 10 lots", () => {
  const items: Item[] = [];
  for (let i = 0; i < 15; i++) {
    items.push({
      id: i, slug: `item-${i}`, name: `Item ${i}`,
      lots: [{ id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "fridge", bestBy: "2026-04-18" }],
      createdAt: today, updatedAt: today,
    });
  }
  const out = render(items, today);
  // 10 listed + section header
  const matches = out.match(/lot 1/g) ?? [];
  assert.equal(matches.length, 10);
});
