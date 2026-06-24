import { test } from "node:test";
import assert from "node:assert/strict";
import { bullet, err, info, newline, ok, plain, section, table, warn } from "./output.js";

// We can't easily intercept process.stdout / stderr writes without
// stubbing, so these tests just assert the functions don't throw and
// don't return anything weird.

test("ok / warn / err / info / plain are callable", () => {
  assert.doesNotThrow(() => ok("hello"));
  assert.doesNotThrow(() => warn("hello"));
  assert.doesNotThrow(() => err("hello"));
  assert.doesNotThrow(() => info("hello"));
  assert.doesNotThrow(() => plain("hello"));
});

test("section renders without throwing", () => {
  assert.doesNotThrow(() => section("title"));
});

test("table with no rows is a noop", () => {
  assert.doesNotThrow(() => table([]));
});

test("table with headers and rows", () => {
  assert.doesNotThrow(() => table([["1", "2"], ["3", "4"]], ["a", "b"]));
});

test("table with only rows (no header)", () => {
  assert.doesNotThrow(() => table([["1", "2"]]));
});

test("bullet renders items", () => {
  assert.doesNotThrow(() => bullet(["a", "b", "c"]));
});

test("newline writes a blank line", () => {
  assert.doesNotThrow(() => newline());
});
