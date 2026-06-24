import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES,
  TREE,
  categoryFor,
  isValidCategory,
  knownSlugs,
  suggestionsFor,
} from "./categories.js";

test("CATEGORIES matches TREE keys", () => {
  assert.deepEqual([...CATEGORIES].sort(), Object.keys(TREE).sort());
});

test("isValidCategory accepts known", () => {
  for (const c of CATEGORIES) assert.equal(isValidCategory(c), true);
});

test("isValidCategory rejects unknown", () => {
  assert.equal(isValidCategory("magic-beans"), false);
});

test("categoryFor finds slug", () => {
  assert.equal(categoryFor("olive-oil"), "oils");
  assert.equal(categoryFor("egg"), "dairy");
});

test("categoryFor returns null for unknown", () => {
  assert.equal(categoryFor("dragonfruit"), null);
});

test("suggestionsFor returns the slug list", () => {
  const list = suggestionsFor("oils");
  assert.ok(list.includes("olive-oil"));
});

test("suggestionsFor returns [] for unknown category", () => {
  assert.deepEqual(suggestionsFor("nope"), []);
});

test("knownSlugs is sorted distinct", () => {
  const out = knownSlugs();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! < out[i]!);
  assert.ok(out.length > 0);
});
