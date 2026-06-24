import { test } from "node:test";
import assert from "node:assert/strict";
import { asJSON, build } from "./gist.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

const sample: Item[] = [
  {
    id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
    lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "milk", name: "Milk", category: "dairy",
    lots: [{ id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  },
];

test("build returns two files", () => {
  const g = build(sample);
  assert.equal(g.files.length, 2);
});

test("first file is pantry.json", () => {
  const g = build(sample);
  assert.equal(g.files[0]?.filename, "pantry.json");
});

test("second file is summary.md with category lines", () => {
  const g = build(sample);
  const md = g.files[1]?.content;
  assert.match(md ?? "", /# pantry summary/);
  assert.match(md ?? "", /- oils: 1/);
  assert.match(md ?? "", /- dairy: 1/);
});

test("gist defaults to private", () => {
  assert.equal(build(sample).public, false);
});

test("custom description honored", () => {
  assert.equal(build(sample, "custom desc").description, "custom desc");
});

test("asJSON returns parseable string", () => {
  const text = asJSON(build(sample));
  const parsed = JSON.parse(text);
  assert.equal(parsed.files.length, 2);
});

test("empty pantry still produces both files", () => {
  const g = build([]);
  assert.equal(g.files.length, 2);
});
