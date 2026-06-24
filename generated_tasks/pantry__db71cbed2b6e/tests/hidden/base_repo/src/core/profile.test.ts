import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as profile from "./profile.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-profile-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("load on missing returns defaults", async () => {
  await sandbox();
  const p = await profile.load();
  assert.equal(p.householdSize, 2);
});

test("save/load round-trip", async () => {
  await sandbox();
  await profile.save({ ...profile.defaults(), householdSize: 4 });
  const p = await profile.load();
  assert.equal(p.householdSize, 4);
});

test("validate rejects bad household size", () => {
  assert.throws(() => profile.validate({ ...profile.defaults(), householdSize: 0 }));
  assert.throws(() => profile.validate({ ...profile.defaults(), householdSize: -1 }));
  assert.throws(() => profile.validate({ ...profile.defaults(), householdSize: NaN }));
});

test("validate rejects bad alwaysStock entries", () => {
  assert.throws(() => profile.validate({
    ...profile.defaults(),
    // deno-lint-ignore no-explicit-any
    alwaysStock: [{ slug: "", minQty: 1, unitKind: "mass" } as any],
  }));
  assert.throws(() => profile.validate({
    ...profile.defaults(),
    alwaysStock: [{ slug: "x", minQty: -1, unitKind: "mass" }],
  }));
  assert.throws(() => profile.validate({
    ...profile.defaults(),
    // deno-lint-ignore no-explicit-any
    alwaysStock: [{ slug: "x", minQty: 1, unitKind: "weight" as any }],
  }));
});

test("setHouseholdSize updates", async () => {
  await sandbox();
  await profile.setHouseholdSize(5);
  const p = await profile.load();
  assert.equal(p.householdSize, 5);
});

test("addAlwaysStock inserts and replaces", async () => {
  await sandbox();
  await profile.addAlwaysStock({ slug: "salt", minQty: 100, unitKind: "mass" });
  await profile.addAlwaysStock({ slug: "salt", minQty: 250, unitKind: "mass" });
  const p = await profile.load();
  assert.equal(p.alwaysStock.length, 1);
  assert.equal(p.alwaysStock[0]?.minQty, 250);
});

test("removeAlwaysStock returns true when removing", async () => {
  await sandbox();
  await profile.addAlwaysStock({ slug: "salt", minQty: 100, unitKind: "mass" });
  assert.equal(await profile.removeAlwaysStock("salt"), true);
  assert.equal(await profile.removeAlwaysStock("salt"), false);
});

test("addDiet dedupes", async () => {
  await sandbox();
  await profile.addDiet("vegetarian");
  await profile.addDiet("vegetarian");
  const p = await profile.load();
  assert.equal(p.diet.length, 1);
});

test("recipeScale = householdSize / 2", () => {
  assert.equal(profile.recipeScale({ ...profile.defaults(), householdSize: 6 }), 3);
});
