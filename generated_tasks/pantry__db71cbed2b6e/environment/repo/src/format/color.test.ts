import { test } from "node:test";
import assert from "node:assert/strict";
import * as color from "./color.js";

test("disable returns plain text", () => {
  color.disable();
  assert.equal(color.bold("hi"), "hi");
});

test("enable wraps in escape", () => {
  color.enable();
  assert.match(color.bold("hi"), /\x1b\[/);
  color.disable();
});

test("each helper wraps when enabled", () => {
  color.enable();
  for (const fn of [color.bold, color.dim, color.red, color.green,
    color.yellow, color.blue, color.cyan, color.magenta]) {
    assert.match(fn("x"), /\x1b/);
  }
  color.disable();
});

test("colorize uses the named color", () => {
  color.enable();
  assert.match(color.colorize("red", "x"), /\x1b\[31m/);
  color.disable();
});

test("isEnabled reflects current state", () => {
  color.disable();
  assert.equal(color.isEnabled(), false);
  color.enable();
  assert.equal(color.isEnabled(), true);
  color.disable();
});
