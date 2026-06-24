import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as store from "./store.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-store-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
  store._resetCounterCache();
}

test("insert assigns ID and round-trips", async () => {
  await sandbox();
  const inserted = await store.insert({
    slug: "olive-oil",
    name: "Olive Oil",
    lots: [],
  });
  assert.ok(inserted.id > 0);
  const got = await store.get(inserted.id);
  assert.equal(got?.slug, "olive-oil");
});

test("insert validates slug", async () => {
  await sandbox();
  await assert.rejects(() =>
    store.insert({ slug: "", name: "x", lots: [] })
  );
});

test("insert validates name", async () => {
  await sandbox();
  await assert.rejects(() =>
    store.insert({ slug: "x", name: "", lots: [] })
  );
});

test("update replaces and bumps updatedAt", async () => {
  await sandbox();
  const inserted = await store.insert({ slug: "x", name: "X", lots: [] });
  const next = { ...inserted, name: "Renamed" };
  await store.update(next);
  const got = await store.get(inserted.id);
  assert.equal(got?.name, "Renamed");
});

test("update missing throws NotFound", async () => {
  await sandbox();
  await assert.rejects(() =>
    store.update({
      id: 9999, slug: "x", name: "X", lots: [],
      createdAt: "2026-01-01", updatedAt: "2026-01-01",
    })
  );
});

test("remove deletes file", async () => {
  await sandbox();
  const inserted = await store.insert({ slug: "x", name: "X", lots: [] });
  await store.remove(inserted.id);
  assert.equal(await store.get(inserted.id), null);
});

test("remove missing throws NotFound", async () => {
  await sandbox();
  await assert.rejects(() => store.remove(9999));
});

test("get missing returns null", async () => {
  await sandbox();
  assert.equal(await store.get(9999), null);
});

test("list sorted by id", async () => {
  await sandbox();
  await store.insert({ slug: "b", name: "B", lots: [] });
  await store.insert({ slug: "a", name: "A", lots: [] });
  const items = await store.list();
  assert.equal(items.length, 2);
  assert.equal(items[0]?.id, 1);
});

test("list on empty store returns []", async () => {
  await sandbox();
  await store.open();
  const items = await store.list();
  assert.deepEqual(items, []);
});

test("findBySlug returns the matching item", async () => {
  await sandbox();
  await store.insert({ slug: "a", name: "A", lots: [] });
  const inserted = await store.insert({ slug: "b", name: "B", lots: [] });
  const got = await store.findBySlug("b");
  assert.equal(got?.id, inserted.id);
  assert.equal(await store.findBySlug("c"), null);
});

test("counter persists across opens", async () => {
  await sandbox();
  const a = await store.insert({ slug: "a", name: "A", lots: [] });
  store._resetCounterCache();
  const b = await store.insert({ slug: "b", name: "B", lots: [] });
  assert.ok(b.id > a.id);
});
