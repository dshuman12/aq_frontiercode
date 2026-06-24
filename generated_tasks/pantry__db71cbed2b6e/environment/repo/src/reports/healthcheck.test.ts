import { test } from "node:test";
import assert from "node:assert/strict";
import { check, countByCode, pretty } from "./healthcheck.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

test("clean store returns empty findings", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{ id: 1, qty: { value: 100, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  }];
  assert.deepEqual(check(items), []);
});

test("flags duplicate slugs", () => {
  const items: Item[] = [
    { id: 1, slug: "x", name: "X", lots: [], createdAt: today, updatedAt: today },
    { id: 2, slug: "x", name: "Y", lots: [], createdAt: today, updatedAt: today },
  ];
  const f = check(items);
  assert.ok(f.some((x) => x.code === "duplicate-slug"));
});

test("flags missing slug", () => {
  const items: Item[] = [{
    id: 1, slug: "", name: "X", lots: [],
    createdAt: today, updatedAt: today,
  }];
  const f = check(items);
  assert.ok(f.some((x) => x.code === "missing-slug"));
});

test("flags negative qty", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{ id: 1, qty: { value: -1, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  }];
  const f = check(items);
  assert.ok(f.some((x) => x.code === "neg-qty"));
});

test("flags bad best_by", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{ id: 1, qty: { value: 1, kind: "mass" }, addedAt: today, where: "pantry", bestBy: "tomorrow" }],
    createdAt: today, updatedAt: today,
  }];
  const f = check(items);
  assert.ok(f.some((x) => x.code === "bad-best-by"));
});

test("flags best_by before addedAt", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [{
      id: 1, qty: { value: 1, kind: "mass" }, addedAt: "2026-04-15",
      where: "pantry", bestBy: "2026-04-14",
    }],
    createdAt: today, updatedAt: today,
  }];
  const f = check(items);
  assert.ok(f.some((x) => x.code === "best-by-before-added"));
});

test("pretty prints findings or healthy message", () => {
  assert.match(pretty([]), /healthy/);
  assert.match(
    pretty([{ code: "x", detail: "y" }]),
    /x:.+y/,
  );
});

test("countByCode aggregates", () => {
  const counts = countByCode([
    { code: "neg-qty", detail: "" },
    { code: "neg-qty", detail: "" },
    { code: "missing-slug", detail: "" },
  ]);
  assert.equal(counts["neg-qty"], 2);
  assert.equal(counts["missing-slug"], 1);
});
