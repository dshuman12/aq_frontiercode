import { test } from "node:test";
import assert from "node:assert/strict";
import { lineCount, render, renderGrouped } from "./checklist.js";
import type { ShoppingList } from "../core/shopping.js";

const list: ShoppingList = {
  entries: [
    {
      slug: "olive-oil",
      totalNeeded: { value: 100, kind: "volume" },
      alreadyHave: { value: 0, kind: "volume" },
      shortfall: { value: 100, kind: "volume" },
      recipes: [], notes: [],
    },
    {
      slug: "rice-uncooked",
      totalNeeded: { value: 100, kind: "mass" },
      alreadyHave: { value: 200, kind: "mass" },
      shortfall: { value: 0, kind: "mass" },
      recipes: [], notes: [],
    },
    {
      slug: "milk",
      totalNeeded: { value: 1000, kind: "volume" },
      alreadyHave: { value: 0, kind: "volume" },
      shortfall: { value: 1000, kind: "volume" },
      recipes: [], notes: [],
    },
  ],
  generatedAt: "2026-04-15",
};

test("render contains checkboxes", () => {
  const out = render(list);
  assert.match(out, /\[ \]/);
  assert.match(out, /olive-oil/);
});

test("render skips zero-shortfall entries", () => {
  const out = render(list);
  assert.equal(out.includes("rice-uncooked"), false);
});

test("renderGrouped buckets by groupOf", () => {
  const out = renderGrouped(list, (slug) =>
    slug.startsWith("o") ? "oils" : "other",
  );
  assert.match(out, /-- oils --/);
  assert.match(out, /-- other --/);
});

test("renderGrouped sorts groups", () => {
  const out = renderGrouped(list, (slug) =>
    slug === "milk" ? "z" : "a",
  );
  const aIdx = out.indexOf("-- a --");
  const zIdx = out.indexOf("-- z --");
  assert.ok(aIdx < zIdx);
});

test("lineCount excludes zero-shortfall", () => {
  assert.equal(lineCount(list), 2);
});

test("lineCount on empty list is 0", () => {
  assert.equal(lineCount({ entries: [], generatedAt: "x" }), 0);
});
