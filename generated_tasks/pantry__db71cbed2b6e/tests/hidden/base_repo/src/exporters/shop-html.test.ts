import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "./shop-html.js";
import type { ShoppingList } from "../core/shopping.js";

const list: ShoppingList = {
  entries: [
    {
      slug: "olive-oil",
      totalNeeded: { value: 100, kind: "volume" },
      alreadyHave: { value: 0, kind: "volume" },
      shortfall: { value: 100, kind: "volume" },
      recipes: ["minestrone"],
      notes: [],
    },
    {
      slug: "rice-uncooked",
      totalNeeded: { value: 100, kind: "mass" },
      alreadyHave: { value: 200, kind: "mass" },
      shortfall: { value: 0, kind: "mass" },
      recipes: ["rice-bowl"],
      notes: [],
    },
  ],
  generatedAt: "2026-04-15",
};

test("renders document skeleton", () => {
  const out = render(list);
  assert.match(out, /<!DOCTYPE html>/);
  assert.match(out, /Shopping list/);
});

test("includes only non-zero entries", () => {
  const out = render(list);
  assert.match(out, /olive-oil/);
  assert.equal(out.includes("rice-uncooked"), false);
});

test("includes recipe context", () => {
  const out = render(list);
  assert.match(out, /minestrone/);
});

test("escapes HTML special chars", () => {
  const evilList: ShoppingList = {
    entries: [{
      slug: "<script>", totalNeeded: { value: 1, kind: "count" },
      alreadyHave: { value: 0, kind: "count" }, shortfall: { value: 1, kind: "count" },
      recipes: [], notes: [],
    }],
    generatedAt: "2026-04-15",
  };
  const out = render(evilList);
  assert.equal(out.includes("<script>"), false);
  assert.match(out, /&lt;script&gt;/);
});

test("empty list still renders", () => {
  const empty: ShoppingList = { entries: [], generatedAt: "2026-04-15" };
  const out = render(empty);
  assert.match(out, /<ul>[\s\S]*<\/ul>/);
});

test("checkbox input rendered for each non-zero entry", () => {
  const out = render(list);
  const inputs = (out.match(/<input type="checkbox">/g) ?? []).length;
  assert.equal(inputs, 1);
});
