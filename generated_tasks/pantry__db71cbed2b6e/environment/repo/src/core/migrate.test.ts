import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ITEM_LATEST,
  RECIPE_LATEST,
  isUpToDate,
  migrateItem,
  migrateRecipe,
} from "./migrate.js";

test("migrateItem renames place -> where on lots", () => {
  const input = {
    _v: 1, lots: [{ id: 1, place: "fridge", qty: { value: 1, kind: "count" } }],
  };
  const out = migrateItem(input);
  const lot = (out["lots"] as Array<Record<string, unknown>>)[0]!;
  assert.equal(lot["where"], "fridge");
  assert.equal(lot["place"], undefined);
});

test("migrateItem converts string qty to structured", () => {
  const input = {
    _v: 2, lots: [{ id: 1, where: "fridge", qty: "500ml" }],
  };
  const out = migrateItem(input);
  const lot = (out["lots"] as Array<Record<string, unknown>>)[0]!;
  assert.equal(typeof lot["qty"], "object");
});

test("migrateItem stamps latest version", () => {
  const out = migrateItem({ _v: 1, lots: [] });
  assert.equal(out["_v"], ITEM_LATEST);
});

test("migrateItem on already-current is a noop", () => {
  const input = { _v: ITEM_LATEST, lots: [] };
  const out = migrateItem(input);
  assert.deepEqual(out, { _v: ITEM_LATEST, lots: [] });
});

test("migrateRecipe renames qtyValue/qtyUnit to qty", () => {
  const input = {
    _v: 1,
    ingredients: [{ slug: "salt", qtyValue: 5, qtyUnit: "g" }],
  };
  const out = migrateRecipe(input);
  const ing = (out["ingredients"] as Array<Record<string, unknown>>)[0]!;
  assert.equal((ing["qty"] as Record<string, unknown>)["value"], 5);
  assert.equal(ing["qtyValue"], undefined);
});

test("migrateRecipe stamps latest", () => {
  const out = migrateRecipe({ _v: 1, ingredients: [] });
  assert.equal(out["_v"], RECIPE_LATEST);
});

test("isUpToDate", () => {
  assert.equal(isUpToDate({ _v: ITEM_LATEST }, ITEM_LATEST), true);
  assert.equal(isUpToDate({ _v: 1 }, ITEM_LATEST), false);
  assert.equal(isUpToDate({}, ITEM_LATEST), false);
});

test("migrateItem on missing _v starts from 1", () => {
  const input = { lots: [{ id: 1, place: "pantry", qty: "100g" }] };
  const out = migrateItem(input);
  const lot = (out["lots"] as Array<Record<string, unknown>>)[0]!;
  assert.equal(lot["where"], "pantry");
  assert.equal(typeof lot["qty"], "object");
});
