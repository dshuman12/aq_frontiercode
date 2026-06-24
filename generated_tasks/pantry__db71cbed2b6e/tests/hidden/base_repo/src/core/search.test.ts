import { test } from "node:test";
import assert from "node:assert/strict";
import { apply, parse } from "./search.js";
import type { Item } from "./item.js";

const today = "2026-03-15";

const sample: Item[] = [
  {
    id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
    lots: [{
      id: 1, qty: { value: 500, kind: "volume" }, addedAt: today,
      where: "pantry", bestBy: "2026-03-20", notes: "from the deli",
    }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "milk", name: "Milk", category: "dairy",
    lots: [{
      id: 1, qty: { value: 1000, kind: "volume" }, addedAt: today,
      where: "fridge", bestBy: "2027-01-01",
    }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 3, slug: "rice", name: "Rice", category: "grains",
    lots: [{ id: 1, qty: { value: 2000, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
];

test("parse empty returns empty filter", () => {
  assert.deepEqual(parse(""), {});
});

test("parse slug:", () => {
  assert.equal(parse("slug:olive").slug, "olive");
});

test("parse category: respects case", () => {
  assert.equal(parse("category:Oils").category, "Oils");
});

test("parse where: lowercases", () => {
  assert.equal(parse("where:Fridge").where, "fridge");
});

test("parse expiring:N validates", () => {
  assert.equal(parse("expiring:7").expiring, 7);
  assert.throws(() => parse("expiring:abc"));
  assert.throws(() => parse("expiring:-1"));
});

test("parse bare word goes to notes", () => {
  assert.equal(parse("Deli").notes, "deli");
});

test("parse rejects unknown keys", () => {
  assert.throws(() => parse("color:blue"));
});

test("parse quoted notes", () => {
  assert.equal(parse(`notes:"with spaces"`).notes, "with spaces");
});

test("apply slug substring", () => {
  const got = apply(sample, parse("slug:oil"), today);
  assert.equal(got.length, 1);
});

test("apply category exact", () => {
  const got = apply(sample, parse("category:oils"), today);
  assert.equal(got.length, 1);
});

test("apply where matches lot location", () => {
  const got = apply(sample, parse("where:fridge"), today);
  assert.equal(got.length, 1);
});

test("apply expiring window", () => {
  const got = apply(sample, parse("expiring:7"), today);
  assert.equal(got.length, 1);
  assert.equal(got[0]?.slug, "olive-oil");
});

test("apply notes substring", () => {
  const got = apply(sample, parse("notes:deli"), today);
  assert.equal(got.length, 1);
});

test("apply combined filters AND", () => {
  const got = apply(sample, parse("category:oils where:pantry"), today);
  assert.equal(got.length, 1);
  const empty = apply(sample, parse("category:oils where:fridge"), today);
  assert.equal(empty.length, 0);
});
