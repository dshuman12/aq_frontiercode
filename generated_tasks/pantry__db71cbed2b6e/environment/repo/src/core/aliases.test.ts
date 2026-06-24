import { test } from "node:test";
import assert from "node:assert/strict";
import { aliasesOf, canonical, isAlias, knownAliases, knownCanonical } from "./aliases.js";

test("canonical returns input when not aliased", () => {
  assert.equal(canonical("nonexistent-slug"), "nonexistent-slug");
});

test("canonical maps known synonym to canonical", () => {
  assert.equal(canonical("courgette"), "zucchini");
  assert.equal(canonical("aubergine"), "eggplant");
  assert.equal(canonical("plain-flour"), "all-purpose-flour");
});

test("isAlias true for synonyms", () => {
  assert.equal(isAlias("courgette"), true);
  assert.equal(isAlias("zucchini"), false);
});

test("aliasesOf returns synonyms for canonical", () => {
  const out = aliasesOf("egg");
  assert.ok(out.includes("eggs"));
});

test("aliasesOf returns [] for non-canonical", () => {
  assert.deepEqual([...aliasesOf("eggs")], []);
});

test("knownCanonical sorted distinct", () => {
  const out = knownCanonical();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! < out[i]!);
});

test("knownAliases sorted", () => {
  const out = knownAliases();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! < out[i]!);
});
