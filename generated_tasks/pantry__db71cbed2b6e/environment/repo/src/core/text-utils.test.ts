import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedent,
  formatMinutes,
  indent,
  oxfordJoin,
  parseHumanDuration,
  pluralize,
  slugify,
  titleCase,
  titleKey,
  truncate,
} from "./text-utils.js";

test("titleKey strips leading article + lowercases", () => {
  assert.equal(titleKey("The Iliad"), "iliad");
  assert.equal(titleKey("A Recipe"), "recipe");
  assert.equal(titleKey("An Onion"), "onion");
  assert.equal(titleKey("Spaghetti"), "spaghetti");
});

test("slugify normalises", () => {
  assert.equal(slugify("Olive Oil"), "olive-oil");
  assert.equal(slugify("100% effort!"), "100-effort");
  assert.equal(slugify("  --leading--  "), "leading");
});

test("titleCase casing", () => {
  assert.equal(titleCase("the soup of the day"), "The Soup of the Day");
  assert.equal(titleCase("a quick lunch"), "A Quick Lunch");
});

test("oxfordJoin", () => {
  assert.equal(oxfordJoin([]), "");
  assert.equal(oxfordJoin(["a"]), "a");
  assert.equal(oxfordJoin(["a", "b"]), "a and b");
  assert.equal(oxfordJoin(["a", "b", "c"]), "a, b, and c");
});

test("pluralize", () => {
  assert.equal(pluralize(1, "apple"), "1 apple");
  assert.equal(pluralize(2, "apple"), "2 apples");
  assert.equal(pluralize(2, "child", "children"), "2 children");
});

test("truncate adds ellipsis", () => {
  assert.equal(truncate("hello world", 5), "he...");
  assert.equal(truncate("hi", 5), "hi");
});

test("indent prefixes non-empty lines", () => {
  assert.equal(indent("a\n\nb", "> "), "> a\n\n> b");
});

test("dedent strips common prefix", () => {
  assert.equal(dedent("  a\n  b"), "a\nb");
});

test("dedent ignores blank lines for indent calc", () => {
  assert.equal(dedent("    a\n\n    b"), "a\n\nb");
});

test("parseHumanDuration handles hour + min combos", () => {
  assert.equal(parseHumanDuration("1h30m"), 90);
  assert.equal(parseHumanDuration("2 hours"), 120);
  assert.equal(parseHumanDuration("45 min"), 45);
});

test("parseHumanDuration plain integer is minutes", () => {
  assert.equal(parseHumanDuration("90"), 90);
});

test("parseHumanDuration empty returns 0", () => {
  assert.equal(parseHumanDuration("xyz"), 0);
});

test("formatMinutes renders nicely", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(90), "1h30m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(45), "45m");
});
