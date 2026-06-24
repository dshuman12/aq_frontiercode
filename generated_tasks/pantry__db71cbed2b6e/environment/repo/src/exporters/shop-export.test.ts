import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asChecklist,
  asJSON,
  asMarkdown,
  asPlainText,
  groupedByPrefix,
} from "./shop-export.js";
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
      slug: "olive-tapenade",
      totalNeeded: { value: 50, kind: "mass" },
      alreadyHave: { value: 0, kind: "mass" },
      shortfall: { value: 50, kind: "mass" },
      recipes: [],
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

test("asMarkdown skips zero shortfall", () => {
  const out = asMarkdown(list);
  assert.match(out, /olive-oil/);
  assert.equal(out.includes("rice-uncooked"), false);
});

test("asMarkdown includes recipe context", () => {
  const out = asMarkdown(list);
  assert.match(out, /minestrone/);
});

test("asPlainText renders header + entries", () => {
  const out = asPlainText(list);
  assert.match(out, /shopping list/);
  assert.match(out, /olive-oil/);
});

test("asJSON returns parseable object", () => {
  const text = asJSON(list);
  const parsed = JSON.parse(text);
  assert.equal(parsed.generatedAt, "2026-04-15");
});

test("asChecklist renders checkboxes", () => {
  const out = asChecklist(list);
  assert.match(out, /- \[ \]/);
});

test("groupedByPrefix groups by first slug token", () => {
  const out = groupedByPrefix(list);
  assert.ok(out.get("olive")?.includes("olive-oil"));
  assert.ok(out.get("olive")?.includes("olive-tapenade"));
});

test("empty list renders header only", () => {
  const empty: ShoppingList = { entries: [], generatedAt: "2026-04-15" };
  const out = asMarkdown(empty);
  assert.match(out, /Shopping list \(2026-04-15\)/);
});
