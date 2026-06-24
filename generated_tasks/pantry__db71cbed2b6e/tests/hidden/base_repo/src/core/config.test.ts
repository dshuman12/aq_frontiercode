import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as config from "./config.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-config-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("load on missing returns defaults", async () => {
  await sandbox();
  const c = await config.load();
  assert.equal(c.defaultLocation, "pantry");
  assert.equal(c.expiringWindowDays, 7);
});

test("save then load round-trip", async () => {
  await sandbox();
  await config.save({ ...config.defaults(), household: "Bertha" });
  const c = await config.load();
  assert.equal(c.household, "Bertha");
});

test("set defaultLocation", async () => {
  await sandbox();
  await config.set("default_location", "fridge");
  const c = await config.load();
  assert.equal(c.defaultLocation, "fridge");
});

test("set expiring_window_days validates", async () => {
  await sandbox();
  await assert.rejects(() => config.set("expiring_window_days", "abc"));
  await assert.rejects(() => config.set("expiring_window_days", "-1"));
  await config.set("expiring_window_days", "14");
  const c = await config.load();
  assert.equal(c.expiringWindowDays, 14);
});

test("set no_color is bool-coerced", async () => {
  await sandbox();
  await config.set("no_color", "true");
  const c = await config.load();
  assert.equal(c.noColor, true);
});

test("set unknown field rejected", async () => {
  await sandbox();
  await assert.rejects(() => config.set("vibes", "good"));
});

test("validate catches negative window", () => {
  assert.throws(() => config.validate({ expiringWindowDays: -3 }));
});

test("validate catches NaN window", () => {
  assert.throws(() => config.validate({ expiringWindowDays: NaN }));
});

test("set editor", async () => {
  await sandbox();
  await config.set("editor", "vim");
  const c = await config.load();
  assert.equal(c.editor, "vim");
});

test("set household", async () => {
  await sandbox();
  await config.set("household", "Bertha");
  const c = await config.load();
  assert.equal(c.household, "Bertha");
});
