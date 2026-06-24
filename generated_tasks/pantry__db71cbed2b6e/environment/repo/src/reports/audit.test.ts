import { test } from "node:test";
import assert from "node:assert/strict";
import { format, runFullAudit } from "./audit.js";
import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

test("clean store returns no findings", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{ id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  }];
  const r = runFullAudit({ items });
  assert.equal(r.findings.length, 0);
});

test("flags duplicate slugs from healthcheck", () => {
  const items: Item[] = [
    { id: 1, slug: "x", name: "X1", lots: [], createdAt: today, updatedAt: today },
    { id: 2, slug: "x", name: "X2", lots: [], createdAt: today, updatedAt: today },
  ];
  const r = runFullAudit({ items });
  assert.ok(r.findings.some((f) => f.category === "health" && f.severity === "high"));
});

test("flags duplicate barcodes", () => {
  const items: Item[] = [
    { id: 1, slug: "a", name: "A", barcode: "1", lots: [], createdAt: today, updatedAt: today },
    { id: 2, slug: "b", name: "B", barcode: "1", lots: [], createdAt: today, updatedAt: today },
  ];
  const r = runFullAudit({ items });
  assert.ok(r.findings.some((f) => f.category === "duplicate"));
});

test("flags recipes referencing unknown slugs", () => {
  const items: Item[] = [{
    id: 1, slug: "tomato", name: "Tomato", lots: [], createdAt: today, updatedAt: today,
  }];
  const recipes: Recipe[] = [{
    id: 1, slug: "x", name: "X", servings: 4,
    ingredients: [{ slug: "missing", qty: { value: 1, kind: "count" } }],
    createdAt: today, updatedAt: today,
  }];
  const r = runFullAudit({ items, recipes });
  assert.ok(r.findings.some((f) => f.category === "recipe-missing-slug"));
});

test("totals counted per severity", () => {
  const items: Item[] = [
    { id: 1, slug: "x", name: "X1", lots: [], createdAt: today, updatedAt: today },
    { id: 2, slug: "x", name: "X2", lots: [], createdAt: today, updatedAt: today },
  ];
  const r = runFullAudit({ items });
  assert.ok(r.totalsBySeverity["high"]! >= 1);
});

test("format groups by severity", () => {
  const items: Item[] = [
    { id: 1, slug: "x", name: "X1", lots: [], createdAt: today, updatedAt: today },
    { id: 2, slug: "x", name: "X2", lots: [], createdAt: today, updatedAt: today },
  ];
  const r = runFullAudit({ items });
  const text = format(r);
  assert.match(text, /# high/);
});

test("format on empty findings is 'all clear'", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{ id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  }];
  const r = runFullAudit({ items });
  assert.match(format(r), /all clear/);
});
