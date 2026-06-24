import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as meals from "./meal-history.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-meals-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("append + readAll", async () => {
  await sandbox();
  await meals.append({ date: "2026-04-15", meal: "dinner", recipeSlug: "x", servings: 2 });
  const all = await meals.readAll();
  assert.equal(all.length, 1);
});

test("validates", async () => {
  await sandbox();
  await assert.rejects(() => meals.append({ date: "yesterday", meal: "x", recipeSlug: "y", servings: 1 }));
  await assert.rejects(() => meals.append({ date: "2026-04-15", meal: "", recipeSlug: "x", servings: 1 }));
  await assert.rejects(() => meals.append({ date: "2026-04-15", meal: "x", recipeSlug: "", servings: 1 }));
  await assert.rejects(() => meals.append({ date: "2026-04-15", meal: "x", recipeSlug: "y", servings: 0 }));
});

test("inMonth filters", async () => {
  await sandbox();
  await meals.append({ date: "2026-04-15", meal: "x", recipeSlug: "a", servings: 1 });
  await meals.append({ date: "2026-05-15", meal: "x", recipeSlug: "b", servings: 1 });
  const apr = meals.inMonth(await meals.readAll(), "2026-04");
  assert.equal(apr.length, 1);
});

test("topRecipes ranks frequency", async () => {
  await sandbox();
  await meals.append({ date: "2026-04-01", meal: "x", recipeSlug: "a", servings: 1 });
  await meals.append({ date: "2026-04-02", meal: "x", recipeSlug: "a", servings: 1 });
  await meals.append({ date: "2026-04-03", meal: "x", recipeSlug: "b", servings: 1 });
  const top = meals.topRecipes(await meals.readAll(), 2);
  assert.equal(top[0]?.slug, "a");
  assert.equal(top[0]?.count, 2);
});

test("readAll on missing returns empty", async () => {
  await sandbox();
  assert.deepEqual(await meals.readAll(), []);
});
