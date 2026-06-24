import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as price from "./pricing.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-price-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("append + readAll", async () => {
  await sandbox();
  await price.append({
    date: "2026-04-15", slug: "olive-oil",
    qty: { value: 500, kind: "volume" }, totalCents: 750,
  });
  const all = await price.readAll();
  assert.equal(all.length, 1);
});

test("validate rejects bad input", async () => {
  await sandbox();
  await assert.rejects(() => price.append({
    date: "yesterday", slug: "x",
    qty: { value: 1, kind: "count" }, totalCents: 100,
  }));
  await assert.rejects(() => price.append({
    date: "2026-04-15", slug: "",
    qty: { value: 1, kind: "count" }, totalCents: 100,
  }));
  await assert.rejects(() => price.append({
    date: "2026-04-15", slug: "x",
    qty: { value: 0, kind: "count" }, totalCents: 100,
  }));
  await assert.rejects(() => price.append({
    date: "2026-04-15", slug: "x",
    qty: { value: 1, kind: "count" }, totalCents: -1,
  }));
  await assert.rejects(() => price.append({
    date: "2026-04-15", slug: "x",
    qty: { value: 1, kind: "count" }, totalCents: 1.5,
  }));
});

test("recentMean averages over last N entries", async () => {
  await sandbox();
  await price.append({ date: "2026-04-01", slug: "olive-oil", qty: { value: 500, kind: "volume" }, totalCents: 750 });
  await price.append({ date: "2026-04-15", slug: "olive-oil", qty: { value: 500, kind: "volume" }, totalCents: 850 });
  const all = await price.readAll();
  const mean = price.recentMean(all, "olive-oil", 5);
  // total cents 1600 / total qty 1000 = 1.6 cents per ml
  assert.equal(mean, 1.6);
});

test("recentMean null on no matches", async () => {
  await sandbox();
  const mean = price.recentMean([], "olive-oil", 5);
  assert.equal(mean, null);
});

test("spentInRange filters", async () => {
  await sandbox();
  await price.append({ date: "2026-03-15", slug: "x", qty: { value: 1, kind: "count" }, totalCents: 100 });
  await price.append({ date: "2026-04-15", slug: "x", qty: { value: 1, kind: "count" }, totalCents: 200 });
  await price.append({ date: "2026-05-15", slug: "x", qty: { value: 1, kind: "count" }, totalCents: 300 });
  const all = await price.readAll();
  assert.equal(price.spentInRange(all, "x", "2026-04-01", "2026-04-30"), 200);
});

test("totalInRange sums across slugs", async () => {
  await sandbox();
  await price.append({ date: "2026-04-15", slug: "a", qty: { value: 1, kind: "count" }, totalCents: 100 });
  await price.append({ date: "2026-04-15", slug: "b", qty: { value: 1, kind: "count" }, totalCents: 200 });
  const all = await price.readAll();
  assert.equal(price.totalInRange(all, "2026-04-01", "2026-04-30"), 300);
});

test("formatCents", () => {
  assert.equal(price.formatCents(125), "$1.25");
  assert.equal(price.formatCents(0), "$0.00");
});

test("readAll on missing returns empty", async () => {
  await sandbox();
  assert.deepEqual(await price.readAll(), []);
});
