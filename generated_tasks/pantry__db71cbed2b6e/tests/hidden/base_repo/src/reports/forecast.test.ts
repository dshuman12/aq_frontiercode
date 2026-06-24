import { test } from "node:test";
import assert from "node:assert/strict";
import { forecast, fromEvents, imminent } from "./forecast.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

test("fromEvents picks up lot.use entries with numeric detail", () => {
  const events: import("../core/event.js").Event[] = [
    { at: "2026-04-10T10:00:00Z", kind: "lot.use", itemSlug: "milk", detail: "30ml" },
    { at: "2026-04-12T10:00:00Z", kind: "lot.use", itemSlug: "milk", detail: "20ml" },
    { at: "2026-04-12T10:00:00Z", kind: "item.add", itemSlug: "milk", detail: "x" },
  ];
  const out = fromEvents(events);
  assert.equal(out.length, 2);
});

test("fromEvents skips entries without numeric detail", () => {
  const events: import("../core/event.js").Event[] = [
    { at: "2026-04-10T10:00:00Z", kind: "lot.use", itemSlug: "milk", detail: "some" },
  ];
  assert.deepEqual(fromEvents(events), []);
});

test("forecast handles items with no usage as 'never'", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{ id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  }];
  const out = forecast(items, [], today, 30);
  assert.equal(out[0]?.estimatedOutAt, "never");
});

test("forecast computes per-day rate", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{ id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  }];
  const usage = [
    { slug: "milk", date: "2026-04-10", amount: 200 },
    { slug: "milk", date: "2026-04-12", amount: 200 },
  ];
  const out = forecast(items, usage, today, 30);
  // 400 ml over 2 distinct days = 200 ml/day; 1000 ml / 200 = 5 days
  assert.equal(out[0]?.burnPerDay, 200);
  assert.equal(out[0]?.daysRemaining, 5);
});

test("forecast sorted by daysRemaining asc", () => {
  const items: Item[] = [
    {
      id: 1, slug: "a", name: "A",
      lots: [{ id: 1, qty: { value: 100, kind: "mass" }, addedAt: today, where: "pantry" }],
      createdAt: today, updatedAt: today,
    },
    {
      id: 2, slug: "b", name: "B",
      lots: [{ id: 1, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry" }],
      createdAt: today, updatedAt: today,
    },
  ];
  const usage = [
    { slug: "a", date: "2026-04-14", amount: 10 },
    { slug: "b", date: "2026-04-14", amount: 10 },
  ];
  const out = forecast(items, usage, today, 30);
  assert.equal(out[0]?.slug, "a");
});

test("imminent filters by days threshold", () => {
  const items: Item[] = [{
    id: 1, slug: "milk", name: "Milk",
    lots: [{ id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today, where: "fridge" }],
    createdAt: today, updatedAt: today,
  }];
  const usage = [
    { slug: "milk", date: "2026-04-13", amount: 500 },
    { slug: "milk", date: "2026-04-14", amount: 500 },
  ];
  const out = forecast(items, usage, today, 30);
  assert.equal(imminent(out, 3).length, 1);
  assert.equal(imminent(out, 0.5).length, 0);
});

test("forecast skips items with no totalQuantity (mixed kind lots)", () => {
  const items: Item[] = [{
    id: 1, slug: "x", name: "X",
    lots: [
      { id: 1, qty: { value: 1, kind: "mass" }, addedAt: today, where: "pantry" },
      { id: 2, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry" },
    ],
    createdAt: today, updatedAt: today,
  }];
  assert.deepEqual(forecast(items, [], today, 30), []);
});
