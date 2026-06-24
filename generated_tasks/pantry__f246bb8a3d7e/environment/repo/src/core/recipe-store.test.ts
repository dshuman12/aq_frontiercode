import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as recipes from "./recipe-store.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-recipe-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
  recipes._resetCounter();
}

const sample = {
  slug: "minestrone",
  name: "Minestrone",
  servings: 4,
  ingredients: [
    { slug: "tomato", qty: { value: 800, kind: "mass" as const } },
  ],
};

test("insert + get round-trip", async () => {
  await sandbox();
  const r = await recipes.insert(sample);
  const got = await recipes.get(r.id);
  assert.equal(got?.slug, "minestrone");
});

test("insert validates slug + name + servings", async () => {
  await sandbox();
  await assert.rejects(() => recipes.insert({ ...sample, slug: "" }));
  await assert.rejects(() => recipes.insert({ ...sample, name: "" }));
  await assert.rejects(() => recipes.insert({ ...sample, servings: 0 }));
});

test("update on missing throws RecipeNotFound", async () => {
  await sandbox();
  const r = {
    id: 9999,
    ...sample,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
  await assert.rejects(() => recipes.update(r));
});

test("remove on missing throws RecipeNotFound", async () => {
  await sandbox();
  await assert.rejects(() => recipes.remove(9999));
});

test("list returns sorted by id", async () => {
  await sandbox();
  await recipes.insert(sample);
  await recipes.insert({ ...sample, slug: "soup" });
  const out = await recipes.list();
  assert.equal(out.length, 2);
  assert.equal(out[0]?.id, 1);
});

test("findBySlug works", async () => {
  await sandbox();
  await recipes.insert(sample);
  const got = await recipes.findBySlug("minestrone");
  assert.equal(got?.name, "Minestrone");
  assert.equal(await recipes.findBySlug("missing"), null);
});

test("counter persists", async () => {
  await sandbox();
  const a = await recipes.insert(sample);
  recipes._resetCounter();
  const b = await recipes.insert({ ...sample, slug: "soup" });
  assert.ok(b.id > a.id);
});

test("get missing returns null", async () => {
  await sandbox();
  assert.equal(await recipes.get(9999), null);
});
