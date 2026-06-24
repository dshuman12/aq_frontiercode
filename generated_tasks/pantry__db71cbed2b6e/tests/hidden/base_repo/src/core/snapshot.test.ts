import { test } from "node:test";
import assert from "node:assert/strict";
import { Snapshot } from "./snapshot.js";
import type { Item } from "./item.js";

const today = "2026-04-15";

function mk(slug: string, id = 1): Item {
  return {
    id, slug, name: slug.toUpperCase(),
    lots: [{ id: 1, qty: { value: 1, kind: "count" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  };
}

test("size + countLots", () => {
  const snap = new Snapshot([mk("a", 1), mk("b", 2)]);
  assert.equal(snap.size(), 2);
  assert.equal(snap.countLots(), 2);
});

test("all returns deep copy", () => {
  const items = [mk("a", 1)];
  const snap = new Snapshot(items);
  const copy = snap.all();
  copy[0]!.name = "MUTATED";
  assert.notEqual(snap.all()[0]?.name, "MUTATED");
});

test("get returns deep copy", () => {
  const items = [mk("a", 1)];
  const snap = new Snapshot(items);
  const copy = snap.get(1)!;
  copy.name = "MUTATED";
  assert.notEqual(snap.get(1)?.name, "MUTATED");
});

test("get missing returns null", () => {
  const snap = new Snapshot([]);
  assert.equal(snap.get(1), null);
});

test("itemsAddedSince + itemsRemovedSince", () => {
  const before = new Snapshot([mk("a", 1), mk("b", 2)]);
  const after = new Snapshot([mk("a", 1), mk("c", 3)]);
  const added = after.itemsAddedSince(before);
  const removed = after.itemsRemovedSince(before);
  assert.equal(added.length, 1);
  assert.equal(added[0]?.slug, "c");
  assert.equal(removed.length, 1);
  assert.equal(removed[0]?.slug, "b");
});

test("takenAt provided is preserved", () => {
  const snap = new Snapshot([], "2026-01-01T00:00:00Z");
  assert.equal(snap.takenAt, "2026-01-01T00:00:00Z");
});

test("takenAt defaults to now", () => {
  const before = Date.now();
  const snap = new Snapshot([]);
  const t = Date.parse(snap.takenAt);
  assert.ok(t >= before);
});
