import { test } from "node:test";
import assert from "node:assert/strict";
import { audit, format, notOK, shortfallTotal } from "./staple.js";
import type { Item } from "../core/item.js";
import type { Profile } from "../core/profile.js";

const today = "2026-04-15";

const profile: Profile = {
  householdName: "Bertha",
  householdSize: 2,
  diet: [],
  alwaysStock: [
    { slug: "salt", minQty: 250, unitKind: "mass" },
    { slug: "olive-oil", minQty: 250, unitKind: "volume" },
  ],
};

const pantry: Item[] = [
  {
    id: 1, slug: "salt", name: "Salt",
    lots: [{ id: 1, qty: { value: 500, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "olive-oil", name: "Olive Oil",
    lots: [{ id: 1, qty: { value: 100, kind: "volume" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
];

test("audit returns one row per always-stock entry", () => {
  const r = audit(profile, pantry);
  assert.equal(r.length, 2);
});

test("ok reflects whether stock meets floor", () => {
  const r = audit(profile, pantry);
  const salt = r.find((x) => x.slug === "salt");
  const oil = r.find((x) => x.slug === "olive-oil");
  assert.equal(salt?.ok, true);
  assert.equal(oil?.ok, false);
});

test("notOK returns short staples only", () => {
  const r = audit(profile, pantry);
  const short = notOK(r);
  assert.equal(short.length, 1);
  assert.equal(short[0]?.slug, "olive-oil");
});

test("missing item counts as zero have", () => {
  const profileX = { ...profile, alwaysStock: [{ slug: "missing", minQty: 100, unitKind: "mass" as const }] };
  const r = audit(profileX, pantry);
  assert.equal(r[0]?.haveValue, 0);
  assert.equal(r[0]?.ok, false);
});

test("kind mismatch counts as zero have", () => {
  const profileX = { ...profile, alwaysStock: [{ slug: "salt", minQty: 100, unitKind: "volume" as const }] };
  const r = audit(profileX, pantry);
  assert.equal(r[0]?.haveValue, 0);
});

test("format renders rows + (no staples) on empty", () => {
  assert.equal(format([]), "(no staples configured)\n");
  const r = audit(profile, pantry);
  const text = format(r);
  assert.match(text, /salt/);
});

test("shortfallTotal sums needValue", () => {
  const r = audit(profile, pantry);
  assert.equal(shortfallTotal(r), 150);
});
