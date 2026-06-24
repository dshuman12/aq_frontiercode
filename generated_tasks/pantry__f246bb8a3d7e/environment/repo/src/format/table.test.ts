import { test } from "node:test";
import assert from "node:assert/strict";
import { newTable } from "./table.js";

test("empty table renders as empty string", () => {
  assert.equal(newTable().toString(), "");
});

test("header-only renders with separator", () => {
  const out = newTable().setHeader(["aaa", "bbb"]).toString();
  assert.match(out, /aaa +bbb/);
  assert.match(out, /---/);
});

test("rows align with header", () => {
  const out = newTable()
    .setHeader(["fruit", "qty"])
    .addRow("apple", "3")
    .addRow("pear", "12")
    .toString();
  const lines = out.trim().split("\n");
  assert.equal(lines.length, 4);
});

test("ragged rows tolerated", () => {
  const out = newTable()
    .setHeader(["a", "b", "c"])
    .addRow("1")
    .addRow("2", "3")
    .toString();
  // Each row appears as its own line; missing cells render as blank.
  const lines = out.trimEnd().split("\n");
  assert.equal(lines.length, 4);
  assert.match(lines[2]!, /^1\b/);
  assert.match(lines[3]!, /3/);
});

test("width expands to fit content", () => {
  const out = newTable()
    .setHeader(["x"])
    .addRow("very-long-value")
    .toString();
  assert.match(out, /very-long-value/);
});

test("width returns max columns", () => {
  const t = newTable().setHeader(["a", "b"]).addRow("1", "2", "3");
  assert.equal(t.width(), 3);
});

test("rowCount tracks added rows", () => {
  const t = newTable().setHeader(["a"]).addRow("1").addRow("2");
  assert.equal(t.rowCount(), 2);
});
