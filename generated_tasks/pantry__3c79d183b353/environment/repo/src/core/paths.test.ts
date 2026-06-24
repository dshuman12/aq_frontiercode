import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import {
  cacheDir,
  configDir,
  configFile,
  counterFile,
  dataDir,
  ensureAll,
  itemDir,
  recipeDir,
} from "./paths.js";

test("PANTRY_DATA_DIR overrides", () => {
  process.env.PANTRY_DATA_DIR = "/tmp/pantry-data-test";
  assert.equal(dataDir(), "/tmp/pantry-data-test");
  delete process.env.PANTRY_DATA_DIR;
});

test("PANTRY_CONFIG_DIR overrides", () => {
  process.env.PANTRY_CONFIG_DIR = "/tmp/pantry-cfg-test";
  assert.equal(configDir(), "/tmp/pantry-cfg-test");
  delete process.env.PANTRY_CONFIG_DIR;
});

test("XDG_DATA_HOME falls back when no PANTRY_*", () => {
  delete process.env.PANTRY_DATA_DIR;
  process.env.XDG_DATA_HOME = "/tmp/xdg-data";
  assert.equal(dataDir(), "/tmp/xdg-data/pantry");
  delete process.env.XDG_DATA_HOME;
});

test("default falls back to ~/.local/share", () => {
  delete process.env.PANTRY_DATA_DIR;
  delete process.env.XDG_DATA_HOME;
  assert.equal(dataDir(), path.join(os.homedir(), ".local", "share", "pantry"));
});

test("itemDir / recipeDir / counterFile / configFile under their roots", () => {
  process.env.PANTRY_DATA_DIR = "/tmp/x";
  process.env.PANTRY_CONFIG_DIR = "/tmp/x-cfg";
  assert.ok(itemDir().startsWith("/tmp/x"));
  assert.ok(recipeDir().startsWith("/tmp/x"));
  assert.ok(counterFile().startsWith("/tmp/x"));
  assert.ok(configFile().startsWith("/tmp/x-cfg"));
  delete process.env.PANTRY_DATA_DIR;
  delete process.env.PANTRY_CONFIG_DIR;
});

test("ensureAll creates all three", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-paths-"));
  process.env.PANTRY_DATA_DIR = path.join(tmp, "d");
  process.env.PANTRY_CONFIG_DIR = path.join(tmp, "c");
  process.env.PANTRY_CACHE_DIR = path.join(tmp, "ca");
  await ensureAll();
  for (const sub of ["d", "c", "ca"]) {
    const stat = await fs.stat(path.join(tmp, sub));
    assert.ok(stat.isDirectory());
  }
  delete process.env.PANTRY_DATA_DIR;
  delete process.env.PANTRY_CONFIG_DIR;
  delete process.env.PANTRY_CACHE_DIR;
});

test("cacheDir env override", () => {
  process.env.PANTRY_CACHE_DIR = "/tmp/pantry-cache-test";
  assert.equal(cacheDir(), "/tmp/pantry-cache-test");
  delete process.env.PANTRY_CACHE_DIR;
});
