import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeRow, headerIndex, parseCSV } from "./csv-parser.js";

test("parses simple rows", () => {
  const rows = parseCSV("a,b,c\n1,2,3\n");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0]?.values, ["a", "b", "c"]);
  assert.deepEqual(rows[1]?.values, ["1", "2", "3"]);
});

test("handles BOM", () => {
  const rows = parseCSV("\uFEFFa,b\n1,2\n");
  assert.deepEqual(rows[0]?.values, ["a", "b"]);
});

test("quoted field with comma", () => {
  const rows = parseCSV(`name,note\nfoo,"hello, world"\n`);
  assert.deepEqual(rows[1]?.values, ["foo", "hello, world"]);
});

test("escaped quote inside quoted field", () => {
  const rows = parseCSV(`x\n"a ""quoted"" b"\n`);
  assert.equal(rows[1]?.values[0], 'a "quoted" b');
});

test("trailing empty cell from trailing comma", () => {
  const rows = parseCSV("a,b,\n1,2,\n");
  assert.equal(rows[0]?.values.length, 3);
  assert.equal(rows[1]?.values[2], "");
});

test("rejects unterminated quoted field", () => {
  assert.throws(() => parseCSV(`"unterminated\n`));
});

test("blank lines are skipped", () => {
  const rows = parseCSV("a,b\n\n1,2\n");
  assert.equal(rows.length, 2);
});

test("CRLF line endings supported", () => {
  const rows = parseCSV("a,b\r\n1,2\r\n");
  assert.equal(rows.length, 2);
});

test("headerIndex lowercases", () => {
  const m = headerIndex(["Name", "  QTY  "]);
  assert.equal(m.get("name"), 0);
  assert.equal(m.get("qty"), 1);
});

test("encodeRow leaves plain values alone", () => {
  assert.equal(encodeRow(["a", "b", "c"]), "a,b,c");
});

test("encodeRow quotes when needed", () => {
  assert.equal(encodeRow(["a", "b,c"]), `a,"b,c"`);
  assert.equal(encodeRow(["he said \"hi\""]), `"he said ""hi"""`);
});
