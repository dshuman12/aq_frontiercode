import { test } from "node:test";
import assert from "node:assert/strict";
import { readReceiptCSV } from "./receipt.js";

test("empty file is reported as a warning", () => {
  const r = readReceiptCSV("");
  assert.equal(r.added.length, 0);
  assert.equal(r.warnings.length, 1);
});

test("imports a clean receipt", () => {
  const r = readReceiptCSV(`item,qty,where\nOlive Oil,500ml,pantry\nFlour,2kg,pantry\n`);
  assert.equal(r.added.length, 2);
  assert.equal(r.skipped, 0);
  assert.equal(r.added[0]?.slug, "olive-oil");
});

test("uses slug column when provided", () => {
  const r = readReceiptCSV(`slug,qty\nolive-oil,500ml\n`);
  assert.equal(r.added[0]?.slug, "olive-oil");
});

test("skips rows missing both item and slug", () => {
  const r = readReceiptCSV(`item,qty\n,500ml\nflour,2kg\n`);
  assert.equal(r.skipped, 1);
  assert.equal(r.added.length, 1);
});

test("warns on missing qty", () => {
  const r = readReceiptCSV(`item,qty\nflour,\n`);
  assert.equal(r.added.length, 0);
  assert.equal(r.warnings.length, 1);
});

test("warns on bad qty", () => {
  const r = readReceiptCSV(`item,qty\nflour,xyz\n`);
  assert.equal(r.warnings.length, 1);
});

test("warns on bad location", () => {
  const r = readReceiptCSV(`item,qty,where\nflour,2kg,oven\n`);
  assert.equal(r.warnings.length, 1);
});

test("warns on bad best_by", () => {
  const r = readReceiptCSV(`item,qty,best_by\nflour,2kg,sometime\n`);
  assert.equal(r.warnings.length, 1);
});

test("propagates source default to receipt", () => {
  const r = readReceiptCSV(`item,qty\nflour,2kg\n`);
  assert.equal(r.added[0]?.lot.source, "receipt");
});

test("category column propagates", () => {
  const r = readReceiptCSV(`item,qty,category\nflour,2kg,grains\n`);
  assert.equal(r.added[0]?.category, "grains");
});

test("notes column propagates", () => {
  const r = readReceiptCSV(`item,qty,notes\nflour,2kg,king arthur\n`);
  assert.equal(r.added[0]?.lot.notes, "king arthur");
});

test("BOM at start does not break", () => {
  const r = readReceiptCSV("\uFEFFitem,qty\nflour,2kg\n");
  assert.equal(r.added.length, 1);
});
