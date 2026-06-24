import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as tags from "./tags.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-tags-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("load on missing returns empty", async () => {
  await sandbox();
  const f = await tags.load();
  assert.deepEqual(f, { bySlug: {} });
});

test("add then listFor", async () => {
  await sandbox();
  await tags.add("olive-oil", ["italian", "fancy"]);
  const got = await tags.listFor("olive-oil");
  assert.deepEqual(got.sort(), ["fancy", "italian"]);
});

test("add deduplicates", async () => {
  await sandbox();
  await tags.add("a", ["x", "x", "y"]);
  const got = await tags.listFor("a");
  assert.equal(got.length, 2);
});

test("remove drops tags", async () => {
  await sandbox();
  await tags.add("a", ["x", "y"]);
  await tags.remove("a", ["x"]);
  assert.deepEqual(await tags.listFor("a"), ["y"]);
});

test("remove last tag clears slug entry", async () => {
  await sandbox();
  await tags.add("a", ["x"]);
  await tags.remove("a", ["x"]);
  const all = await tags.bySlug();
  assert.equal(all["a"], undefined);
});

test("counts aggregates", async () => {
  await sandbox();
  await tags.add("a", ["x", "y"]);
  await tags.add("b", ["x"]);
  const c = await tags.counts();
  assert.equal(c["x"], 2);
  assert.equal(c["y"], 1);
});

test("topN returns top tags by count", async () => {
  await sandbox();
  await tags.add("a", ["x", "y"]);
  await tags.add("b", ["x"]);
  await tags.add("c", ["x"]);
  const top = await tags.topN(2);
  assert.equal(top[0]?.tag, "x");
  assert.equal(top[0]?.count, 3);
});

test("normalises case + whitespace", async () => {
  await sandbox();
  await tags.add("a", [" Italian ", "italian"]);
  const got = await tags.listFor("a");
  assert.deepEqual(got, ["italian"]);
});

test("listFor missing slug returns []", async () => {
  await sandbox();
  assert.deepEqual(await tags.listFor("nope"), []);
});
