import { test } from "node:test";
import assert from "node:assert/strict";
import { countJSONL, readJSONL, validateJSONL, writeJSONL } from "./jsonl.js";

test("write then read round-trip", () => {
  const items = [{ a: 1 }, { a: 2 }, { a: 3 }];
  const text = writeJSONL(items);
  const round = readJSONL<{ a: number }>(text);
  assert.deepEqual(round, items);
});

test("read skips blank lines", () => {
  const text = "{\"a\":1}\n\n{\"a\":2}\n";
  assert.equal(readJSONL(text).length, 2);
});

test("read throws on bad json", () => {
  assert.throws(() => readJSONL("not-json\n"));
});

test("countJSONL returns line count without parsing", () => {
  assert.equal(countJSONL("a\nb\nc\n"), 3);
  assert.equal(countJSONL(""), 0);
});

test("validateJSONL counts ok + errors", () => {
  const r = validateJSONL("{\"a\":1}\nbad-line\n{\"b\":2}\n");
  assert.equal(r.ok, 2);
  assert.equal(r.errors.length, 1);
});

test("write empty array returns just trailing newline", () => {
  const text = writeJSONL([]);
  assert.equal(text, "\n");
});

test("validateJSONL ignores blank lines", () => {
  const r = validateJSONL("\n{\"a\":1}\n\n");
  assert.equal(r.ok, 1);
  assert.equal(r.errors.length, 0);
});
