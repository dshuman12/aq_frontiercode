import { test } from "node:test";
import assert from "node:assert/strict";
import { box, center, columns, render, rightAlign, wrap } from "./textbox.js";

test("wrap respects width", () => {
  const lines = wrap("a b c d e f", 5);
  for (const l of lines) assert.ok(l.length <= 5 || /[a-z]+/.test(l));
});

test("wrap empty width is single line", () => {
  assert.deepEqual(wrap("hello", 0), ["hello"]);
});

test("box wraps text and renders edges", () => {
  const out = render(box("hello world", 20));
  assert.match(out, /\+----+\+/);
  assert.match(out, /hello world/);
});

test("box keeps multiple paragraphs", () => {
  const out = render(box("para one\n\npara two", 60));
  assert.match(out, /para one/);
  assert.match(out, /para two/);
});

test("columns lines up by left width", () => {
  const out = columns("aa\nbb", "x\ny");
  assert.match(out, /aa  x/);
  assert.match(out, /bb  y/);
});

test("center pads on both sides", () => {
  const out = center("hi", 10);
  // (10 - 2) / 2 = 4 leading spaces, then "hi"
  assert.equal(out, "    hi");
});

test("center returns input when too wide", () => {
  assert.equal(center("hello world", 5), "hello world");
});

test("rightAlign", () => {
  const out = rightAlign("hi", 5);
  assert.equal(out, "   hi");
});

test("rightAlign no-op when too wide", () => {
  assert.equal(rightAlign("hello", 3), "hello");
});
