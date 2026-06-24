import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_LOCATIONS,
  expiringSoon,
  isExpired,
  isValidLocation,
  isValidSlug,
  lotsByExpiry,
  toSlug,
  totalQuantity,
  type Item,
  type Lot,
} from "./item.js";

const NOW = "2026-04-15";

const baseItem: Item = {
  id: 1,
  slug: "olive-oil",
  name: "Olive Oil",
  lots: [],
  createdAt: NOW,
  updatedAt: NOW,
};

test("isValidSlug accepts well-formed slugs", () => {
  for (const s of ["olive-oil", "flour", "all-purpose-flour", "tomato_paste"]) {
    assert.ok(isValidSlug(s), `should accept ${s}`);
  }
});

test("isValidSlug rejects bad slugs", () => {
  for (const s of ["", "Olive-Oil", "olive oil", "olive--oil", "-leading"]) {
    assert.equal(isValidSlug(s), false, `should reject ${s}`);
  }
});

test("toSlug normalises", () => {
  assert.equal(toSlug("Olive Oil"), "olive-oil");
  assert.equal(toSlug("  All Purpose Flour  "), "all-purpose-flour");
  assert.equal(toSlug("San Marzano Tomatoes!!"), "san-marzano-tomatoes");
});

test("toSlug rejects empty result", () => {
  assert.throws(() => toSlug("!!!"));
});

test("isValidLocation", () => {
  for (const loc of ALL_LOCATIONS) assert.ok(isValidLocation(loc));
  assert.equal(isValidLocation("oven"), false);
});

test("totalQuantity null when no lots", () => {
  assert.equal(totalQuantity({ ...baseItem }), null);
});

test("totalQuantity sums same-kind lots", () => {
  const item: Item = {
    ...baseItem,
    lots: [
      mkLot(1, { value: 500, kind: "volume" }),
      mkLot(2, { value: 250, kind: "volume" }),
    ],
  };
  assert.equal(totalQuantity(item)?.value, 750);
});

test("totalQuantity null on mixed-kind lots", () => {
  const item: Item = {
    ...baseItem,
    lots: [
      mkLot(1, { value: 500, kind: "volume" }),
      mkLot(2, { value: 1, kind: "count" }),
    ],
  };
  assert.equal(totalQuantity(item), null);
});

test("lotsByExpiry sorts ascending by date, missing last", () => {
  const item: Item = {
    ...baseItem,
    lots: [
      mkLot(1, { value: 1, kind: "count" }, undefined),
      mkLot(2, { value: 1, kind: "count" }, "2026-06-01"),
      mkLot(3, { value: 1, kind: "count" }, "2026-04-30"),
    ],
  };
  const sorted = lotsByExpiry(item);
  assert.deepEqual(
    sorted.map((l) => l.id),
    [3, 2, 1],
  );
});

test("isExpired", () => {
  assert.equal(isExpired(mkLot(1, qz(), "2026-04-14"), NOW), true);
  assert.equal(isExpired(mkLot(1, qz(), "2026-04-15"), NOW), true);
  assert.equal(isExpired(mkLot(1, qz(), "2026-04-16"), NOW), false);
  assert.equal(isExpired(mkLot(1, qz(), undefined), NOW), false);
});

test("expiringSoon respects window and excludes already-expired", () => {
  const item: Item = {
    ...baseItem,
    lots: [
      mkLot(1, qz(), "2026-04-10"), // expired
      mkLot(2, qz(), "2026-04-20"), // in 5 days
      mkLot(3, qz(), "2026-05-15"), // outside 7 days
      mkLot(4, qz()), // no date
    ],
  };
  const got = expiringSoon(item, NOW, 7);
  assert.deepEqual(got.map((l) => l.id), [2]);
});

test("expiringSoon zero window returns empty", () => {
  const item: Item = {
    ...baseItem,
    lots: [mkLot(1, qz(), "2026-04-20")],
  };
  assert.deepEqual(expiringSoon(item, NOW, 0), []);
});

function mkLot(id: number, qty: Lot["qty"], bestBy?: string): Lot {
  const lot: Lot = { id, qty, addedAt: NOW, where: "pantry" };
  if (bestBy !== undefined) lot.bestBy = bestBy;
  return lot;
}

function qz(): Lot["qty"] {
  return { value: 1, kind: "count" };
}
