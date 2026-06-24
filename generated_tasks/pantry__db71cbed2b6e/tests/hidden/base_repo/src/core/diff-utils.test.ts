import { test } from "node:test";
import assert from "node:assert/strict";
import { added, format, lineDiff, removed, unified } from "./diff-utils.js";

test("identical input has only context lines", () => {
  const d = lineDiff("a\nb\nc", "a\nb\nc");
  for (const l of d) assert.equal(l.kind, " ");
});

test("appended line shown as +", () => {
  const d = lineDiff("a\nb", "a\nb\nc");
  assert.deepEqual(added(d), ["c"]);
});

test("removed line shown as -", () => {
  const d = lineDiff("a\nb\nc", "a\nc");
  assert.deepEqual(removed(d), ["b"]);
});

test("modified line is - then +", () => {
  const d = lineDiff("a\nb\nc", "a\nx\nc");
  assert.ok(removed(d).includes("b"));
  assert.ok(added(d).includes("x"));
});

test("format prefixes each line", () => {
  const d = lineDiff("a", "b");
  const out = format(d);
  assert.match(out, /^- a/m);
  assert.match(out, /^\+ b/m);
});

test("unified hides context far from changes", () => {
  const before = "1\n2\n3\n4\n5\n6\n7\n8\n9";
  const after = "1\n2\n3\n4\nX\n6\n7\n8\n9";
  const out = unified(before, after, 1);
  assert.match(out, /\+ X/);
  // unchanged context "1" far from the change should be filtered out
  assert.equal(out.includes(" 1"), false);
});

test("empty input handled", () => {
  assert.deepEqual(lineDiff("", ""), [{ kind: " ", text: "" }]);
});
