import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as menu from "./menu.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-menu-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("load on missing file returns empty plan", async () => {
  await sandbox();
  const plan = await menu.load();
  assert.deepEqual(plan, { entries: [] });
});

test("add then load", async () => {
  await sandbox();
  await menu.add({ date: "2026-01-15", meal: "dinner", recipeSlug: "minestrone" });
  const plan = await menu.load();
  assert.equal(plan.entries.length, 1);
});

test("add validates", async () => {
  await sandbox();
  await assert.rejects(() =>
    menu.add({ date: "yesterday", meal: "dinner", recipeSlug: "x" })
  );
  await assert.rejects(() =>
    menu.add({ date: "2026-01-15", meal: "", recipeSlug: "x" })
  );
  await assert.rejects(() =>
    menu.add({ date: "2026-01-15", meal: "lunch", recipeSlug: "" })
  );
  await assert.rejects(() =>
    menu.add({ date: "2026-01-15", meal: "lunch", recipeSlug: "x", servings: 0 })
  );
});

test("removeByDate drops matching", async () => {
  await sandbox();
  await menu.add({ date: "2026-01-15", meal: "dinner", recipeSlug: "x" });
  await menu.add({ date: "2026-01-16", meal: "dinner", recipeSlug: "y" });
  const dropped = await menu.removeByDate("2026-01-15");
  assert.equal(dropped, 1);
  const plan = await menu.load();
  assert.equal(plan.entries.length, 1);
});

test("inRange", async () => {
  await sandbox();
  await menu.add({ date: "2026-01-10", meal: "lunch", recipeSlug: "a" });
  await menu.add({ date: "2026-01-15", meal: "dinner", recipeSlug: "b" });
  await menu.add({ date: "2026-01-20", meal: "dinner", recipeSlug: "c" });
  const plan = await menu.load();
  const got = menu.inRange(plan, "2026-01-12", "2026-01-18");
  assert.equal(got.length, 1);
  assert.equal(got[0]?.recipeSlug, "b");
});

test("recipeSlugs returns distinct", async () => {
  await sandbox();
  await menu.add({ date: "2026-01-15", meal: "dinner", recipeSlug: "a" });
  await menu.add({ date: "2026-01-16", meal: "dinner", recipeSlug: "a" });
  await menu.add({ date: "2026-01-17", meal: "dinner", recipeSlug: "b" });
  const plan = await menu.load();
  const slugs = menu.recipeSlugs(plan);
  assert.deepEqual(slugs.sort(), ["a", "b"]);
});

test("recipeSlugs respects range", async () => {
  await sandbox();
  await menu.add({ date: "2026-01-10", meal: "dinner", recipeSlug: "a" });
  await menu.add({ date: "2026-01-20", meal: "dinner", recipeSlug: "b" });
  const plan = await menu.load();
  const slugs = menu.recipeSlugs(plan, "2026-01-15", "2026-01-25");
  assert.deepEqual(slugs, ["b"]);
});
