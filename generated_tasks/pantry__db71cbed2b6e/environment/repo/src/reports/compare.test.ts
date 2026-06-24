import { test } from "node:test";
import assert from "node:assert/strict";
import { affectedSlugs, compare, format, summary } from "./compare.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

function mk(slug: string, name = slug.toUpperCase(), opts: Partial<Item> = {}): Item {
  return {
    id: 1, slug, name,
    lots: [{ id: 1, qty: { value: 100, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
    ...opts,
  };
}

test("identical snapshots produce no changes", () => {
  const r = compare([mk("a")], [mk("a")]);
  assert.equal(r.added.length, 0);
  assert.equal(r.removed.length, 0);
  assert.equal(r.changed.length, 0);
});

test("classifies rename", () => {
  const r = compare([mk("a", "A")], [mk("a", "Renamed")]);
  assert.equal(r.changed[0]?.reason, "renamed");
});

test("classifies recategorised", () => {
  const r = compare([mk("a")], [mk("a", "A", { category: "x" })]);
  assert.equal(r.changed[0]?.reason, "recategorised");
});

test("classifies qty-changed", () => {
  const before = mk("a");
  const after: Item = { ...mk("a") };
  after.lots = [{ ...before.lots[0]!, qty: { value: 200, kind: "mass" } }];
  const r = compare([before], [after]);
  assert.equal(r.changed[0]?.reason, "qty-changed");
});

test("classifies moved", () => {
  const before = mk("a");
  const after: Item = { ...mk("a") };
  after.lots = [{ ...before.lots[0]!, where: "fridge" }];
  const r = compare([before], [after]);
  assert.equal(r.changed[0]?.reason, "moved");
});

test("format includes added/removed/changed sections", () => {
  const r = compare([mk("a"), mk("b")], [mk("a", "A2"), mk("c")]);
  const out = format(r);
  assert.match(out, /## added/);
  assert.match(out, /## removed/);
  assert.match(out, /## changed/);
});

test("format on empty diff says no changes", () => {
  const r = compare([mk("a")], [mk("a")]);
  assert.match(format(r), /no changes/);
});

test("summary string", () => {
  const r = compare([mk("a"), mk("b")], [mk("a", "A2"), mk("c")]);
  assert.equal(summary(r), "+1 -1 ~1");
});

test("affectedSlugs sorted distinct", () => {
  const r = compare([mk("a"), mk("c")], [mk("a", "A2"), mk("b")]);
  const slugs = affectedSlugs(r);
  assert.deepEqual(slugs, ["a", "b", "c"]);
});
