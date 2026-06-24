import { test } from "node:test";
import assert from "node:assert/strict";
import { compute, format } from "./alerts.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

test("empty store returns empty alerts", () => {
  assert.deepEqual(compute([], { today }), []);
});

test("expired lots produce a high alert", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{
      id: 1, qty: { value: 1000, kind: "volume" }, addedAt: "2026-04-01",
      where: "fridge", bestBy: "2026-04-14",
    }],
    createdAt: today, updatedAt: today,
  }];
  const alerts = compute(items, { today });
  assert.ok(alerts.some((a) => a.severity === "high" && a.title === "expired lot"));
});

test("soon-expiring lots produce warn", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{
      id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today,
      where: "fridge", bestBy: "2026-04-20",
    }],
    createdAt: today, updatedAt: today,
  }];
  const alerts = compute(items, { today });
  assert.ok(alerts.some((a) => a.severity === "warn" && a.title === "expiring soon"));
});

test("stale lots without best_by produce info", () => {
  const items: Item[] = [{
    id: 1, slug: "spice", name: "Spice",
    lots: [{
      id: 1, qty: { value: 100, kind: "mass" }, addedAt: "2025-12-01",
      where: "spice-rack",
    }],
    createdAt: "2025-12-01", updatedAt: "2025-12-01",
  }];
  const alerts = compute(items, { today, staleAfterDays: 30 });
  assert.ok(alerts.some((a) => a.title.startsWith("stale lot")));
});

test("running-low warns when total <= 25", () => {
  const items: Item[] = [{
    id: 1, slug: "olive-oil", name: "Olive Oil",
    lots: [{
      id: 1, qty: { value: 10, kind: "volume" }, addedAt: today, where: "pantry",
    }],
    createdAt: today, updatedAt: today,
  }];
  const alerts = compute(items, { today });
  assert.ok(alerts.some((a) => a.title === "running low"));
});

test("essential missing produces high", () => {
  const alerts = compute([], { today, essentialSlugs: ["salt"] });
  assert.ok(alerts.some((a) =>
    a.severity === "high" && a.title === "essential item missing"
  ));
});

test("essential present (with lots) does NOT alert", () => {
  const items: Item[] = [{
    id: 1, slug: "salt", name: "Salt",
    lots: [{ id: 1, qty: { value: 500, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  }];
  const alerts = compute(items, { today, essentialSlugs: ["salt"] });
  assert.equal(alerts.filter((a) => a.title === "essential item missing").length, 0);
});

test("alerts sorted high -> warn -> info", () => {
  const items: Item[] = [
    { id: 1, slug: "a", name: "A", lots: [
      { id: 1, qty: { value: 10, kind: "volume" }, addedAt: today, where: "pantry" },
    ], createdAt: today, updatedAt: today },
    { id: 2, slug: "b", name: "B", lots: [
      { id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge", bestBy: "2026-04-01" },
    ], createdAt: today, updatedAt: today },
  ];
  const alerts = compute(items, { today });
  for (let i = 1; i < alerts.length; i++) {
    const prev = alerts[i - 1]!;
    const cur = alerts[i]!;
    const order = (s: string) => s === "high" ? 0 : s === "warn" ? 1 : 2;
    assert.ok(order(prev.severity) <= order(cur.severity));
  }
});

test("format renders nicely", () => {
  const out = format({ severity: "warn", title: "x", detail: "y", itemSlug: "z" });
  assert.match(out, /\[warn\]/);
  assert.match(out, /x/);
  assert.match(out, /y/);
  assert.match(out, /z/);
});
