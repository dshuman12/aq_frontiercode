import { test } from "node:test";
import assert from "node:assert/strict";
import { newDoc, readFrontmatter } from "./markdown.js";

test("h levels are clamped 1..6", () => {
  const out = newDoc().h(7, "x").toString();
  assert.match(out, /^###### x/);
  const out2 = newDoc().h(0, "x").toString();
  assert.match(out2, /^# x/);
});

test("p adds blank line after", () => {
  const out = newDoc().p("hello").toString();
  assert.equal(out, "hello\n\n");
});

test("bullet builds a list", () => {
  const out = newDoc().bullet("a").bullet("b").endList().toString();
  assert.match(out, /^- a\n- b\n\n$/);
});

test("code block", () => {
  const out = newDoc().code("ts", "let x = 1").toString();
  assert.match(out, /```ts\n/);
  assert.match(out, /let x = 1/);
});

test("quote handles multi-line text", () => {
  const out = newDoc().quote("a\nb").toString();
  const lines = out.trim().split("\n");
  assert.equal(lines.length, 2);
});

test("hr renders three dashes", () => {
  assert.match(newDoc().hr().toString(), /^---/);
});

test("table includes header + separator", () => {
  const out = newDoc().table(["a", "b"], [["1", "2"]]).toString();
  assert.match(out, /\| a \| b \|/);
  assert.match(out, /\| --- \| --- \|/);
  assert.match(out, /\| 1 \| 2 \|/);
});

test("table with empty headers is a no-op", () => {
  assert.equal(newDoc().table([], [["x"]]).toString(), "");
});

test("raw + blank", () => {
  const out = newDoc().raw("x").blank().toString();
  assert.equal(out, "x\n");
});

test("readFrontmatter on missing returns null", () => {
  assert.equal(readFrontmatter("no frontmatter"), null);
});

test("readFrontmatter parses fields", () => {
  const text = `---
slug: olive-oil
name: "Olive Oil"
---
body
`;
  const got = readFrontmatter(text);
  assert.equal(got?.fields["slug"], "olive-oil");
  assert.equal(got?.fields["name"], "Olive Oil");
  assert.match(got?.body ?? "", /body/);
});

test("readFrontmatter skips lines without colon", () => {
  const text = "---\njunk\nslug: x\n---\n";
  const got = readFrontmatter(text);
  assert.equal(got?.fields["slug"], "x");
});
