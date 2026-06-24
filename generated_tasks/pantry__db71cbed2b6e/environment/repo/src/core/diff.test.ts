import { test } from "node:test";
import assert from "node:assert/strict";
import { changedSlugs, diff, summary } from "./diff.js";
import type { Item } from "./item.js";

const today = "2026-04-15";

function mk(slug: string, name = slug.toUpperCase()): Item {
  return {
    id: 1, slug, name,
    lots: [{ id: 1, qty: { value: 100, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  };
}

test("identical snapshots produce empty diff", () => {
  const r = diff([mk("a")], [mk("a")]);
  assert.equal(r.added.length, 0);
  assert.equal(r.removed.length, 0);
  assert.equal(r.changed.length, 0);
});

test("added item", () => {
  const r = diff([mk("a")], [mk("a"), mk("b")]);
  assert.equal(r.added.length, 1);
  assert.equal(r.added[0]?.slug, "b");
});

test("removed item", () => {
  const r = diff([mk("a"), mk("b")], [mk("a")]);
  assert.equal(r.removed.length, 1);
  assert.equal(r.removed[0]?.slug, "b");
});

test("changed item via name", () => {
  const r = diff([mk("a")], [mk("a", "renamed")]);
  assert.equal(r.changed.length, 1);
});

test("changed item via lot qty", () => {
  const before = mk("a");
  const after: Item = { ...mk("a") };
  after.lots = [{ ...before.lots[0]!, qty: { value: 200, kind: "mass" } }];
  const r = diff([before], [after]);
  assert.equal(r.changed.length, 1);
});

test("changed item via lot location", () => {
  const before = mk("a");
  const after: Item = { ...mk("a") };
  after.lots = [{ ...before.lots[0]!, where: "fridge" }];
  const r = diff([before], [after]);
  assert.equal(r.changed.length, 1);
});

test("changed item via best_by", () => {
  const before = mk("a");
  const after: Item = { ...mk("a") };
  after.lots = [{ ...before.lots[0]!, bestBy: "2026-12-01" }];
  const r = diff([before], [after]);
  assert.equal(r.changed.length, 1);
});

test("changed item via category", () => {
  const before = mk("a");
  const after: Item = { ...mk("a"), category: "x" };
  const r = diff([before], [after]);
  assert.equal(r.changed.length, 1);
});

test("summary string", () => {
  const r = diff([mk("a"), mk("b")], [mk("a"), mk("c")]);
  assert.match(summary(r), /added: 1/);
  assert.match(summary(r), /removed: 1/);
});

test("changedSlugs distinct sorted", () => {
  const r = diff([mk("a"), mk("c")], [mk("a", "renamed"), mk("b")]);
  const slugs = changedSlugs(r);
  assert.deepEqual(slugs, ["a", "b", "c"]);
});
