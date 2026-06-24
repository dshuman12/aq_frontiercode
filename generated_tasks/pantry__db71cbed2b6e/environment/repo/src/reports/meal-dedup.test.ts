import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupe, findDuplicates, summary } from "./meal-dedup.js";

test("findDuplicates returns groups with >1 entries", () => {
  const dups = findDuplicates([
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
    { date: "2026-04-16", meal: "dinner", recipeSlug: "y", servings: 4 },
  ]);
  assert.equal(dups.length, 1);
});

test("findDuplicates empty when no duplicates", () => {
  const dups = findDuplicates([
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
  ]);
  assert.deepEqual(dups, []);
});

test("dedupe preserves first occurrence", () => {
  const out = dedupe([
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 99 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.servings, 4);
});

test("summary counts", () => {
  const s = summary([
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
    { date: "2026-04-16", meal: "dinner", recipeSlug: "y", servings: 4 },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.unique, 2);
  assert.equal(s.duplicateGroups, 1);
});

test("dedupe on already-unique input is identity", () => {
  const in_ = [
    { date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 4 },
    { date: "2026-04-16", meal: "lunch", recipeSlug: "y", servings: 4 },
  ];
  assert.deepEqual(dedupe(in_), in_);
});
