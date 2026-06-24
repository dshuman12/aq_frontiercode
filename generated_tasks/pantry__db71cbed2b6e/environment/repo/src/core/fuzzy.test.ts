import { test } from "node:test";
import assert from "node:assert/strict";
import { bestMatch, levenshtein, topMatches, withinDistance } from "./fuzzy.js";

test("identical strings have distance 0", () => {
  assert.equal(levenshtein("hello", "hello"), 0);
});

test("empty strings handled", () => {
  assert.equal(levenshtein("", ""), 0);
  assert.equal(levenshtein("abc", ""), 3);
  assert.equal(levenshtein("", "abc"), 3);
});

test("classic example", () => {
  assert.equal(levenshtein("kitten", "sitting"), 3);
});

test("bestMatch returns null on empty haystack", () => {
  assert.equal(bestMatch("x", []), null);
});

test("bestMatch finds closest", () => {
  // Exact match should always win.
  const out = bestMatch("milk", ["milk", "rice", "olive-oil"]);
  assert.equal(out?.candidate, "milk");
  assert.equal(out?.distance, 0);
});

test("topMatches limited to N", () => {
  const out = topMatches("milk", ["milk", "silk", "tilk", "rice"], 2);
  assert.equal(out.length, 2);
  assert.equal(out[0]?.candidate, "milk");
});

test("withinDistance filters", () => {
  const out = withinDistance("milk", ["milk", "silk", "rice"], 1);
  assert.equal(out.length, 2); // milk + silk
});

test("withinDistance empty when threshold too tight", () => {
  const out = withinDistance("milk", ["rice"], 0);
  assert.equal(out.length, 0);
});

test("topMatches returns all when N >= length", () => {
  const out = topMatches("x", ["a", "b"], 99);
  assert.equal(out.length, 2);
});
