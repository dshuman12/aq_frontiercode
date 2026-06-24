import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "./csv.js";
import type { Item } from "../core/item.js";

const today = "2026-03-15";

test("renders header alone for empty pantry", () => {
  const out = render([]);
  assert.match(out, /^slug,name,category,lot,qty,where,best_by,source,notes\n/);
});

test("emits one row per lot", () => {
  const items: Item[] = [{
    id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
    lots: [
      { id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" },
      { id: 2, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "pantry" },
    ],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items);
  const lines = out.trim().split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[1]!, /olive-oil/);
  assert.match(lines[2]!, /olive-oil/);
});

test("emits empty row for items with no lots", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X", lots: [],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items);
  const lines = out.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[1]!, /^x,X,/);
});

test("escapes commas in notes", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{
      id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry",
      notes: "with, commas",
    }],
    createdAt: today, updatedAt: today,
  }];
  const out = render(items);
  assert.match(out, /"with, commas"/);
});
