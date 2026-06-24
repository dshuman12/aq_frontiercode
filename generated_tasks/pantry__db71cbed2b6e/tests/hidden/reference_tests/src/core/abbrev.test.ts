import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalUnit,
  categoryOf,
  isKnown,
  knownAbbreviations,
  suggestNormalisation,
} from "./abbrev.js";

test("canonical mass units", () => {
  assert.equal(canonicalUnit("kg"), "kg");
  assert.equal(canonicalUnit("KG"), "kg");
  assert.equal(canonicalUnit("kilogram"), "kg");
  assert.equal(canonicalUnit("kilograms"), "kg");
});

test("canonical volume units", () => {
  assert.equal(canonicalUnit("ml"), "ml");
  assert.equal(canonicalUnit("Liter"), "l");
  assert.equal(canonicalUnit("teaspoon"), "tsp");
  assert.equal(canonicalUnit("tablespoons"), "tbsp");
});

test("canonical count units", () => {
  assert.equal(canonicalUnit("piece"), "ea");
  assert.equal(canonicalUnit("dozen"), "dozen");
});

test("unknown returns null", () => {
  assert.equal(canonicalUnit("furlong"), null);
  assert.equal(canonicalUnit(""), null);
});

test("isKnown true / false", () => {
  assert.equal(isKnown("kg"), true);
  assert.equal(isKnown("furlong"), false);
});

test("knownAbbreviations sorted distinct", () => {
  const out = knownAbbreviations();
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1]! < out[i]!);
});

test("suggestNormalisation rewrites units", () => {
  assert.equal(suggestNormalisation("500 grams flour"), "500g flour");
  assert.equal(suggestNormalisation("1 kilogram rice"), "1kg rice");
});

test("suggestNormalisation leaves unknown units alone", () => {
  assert.equal(suggestNormalisation("3 furlongs"), "3 furlongs");
});

test("categoryOf groups", () => {
  assert.equal(categoryOf("kg"), "mass");
  assert.equal(categoryOf("ml"), "volume");
  assert.equal(categoryOf("dozen"), "count");
  assert.equal(categoryOf("furlong"), null);
});
