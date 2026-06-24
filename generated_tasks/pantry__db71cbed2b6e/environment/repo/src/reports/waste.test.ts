import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as waste from "./waste.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-waste-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("appends and reads back", async () => {
  await sandbox();
  await waste.append({
    date: "2026-04-15", slug: "milk",
    qty: { value: 200, kind: "volume" },
    reason: "expired",
  });
  const all = await waste.readAll();
  assert.equal(all.length, 1);
});

test("readAll on missing file returns empty", async () => {
  await sandbox();
  const all = await waste.readAll();
  assert.deepEqual(all, []);
});

test("validate rejects bad date / slug / qty / reason", async () => {
  await sandbox();
  await assert.rejects(() => waste.append({
    date: "today", slug: "x",
    qty: { value: 1, kind: "count" }, reason: "expired",
  }));
  await assert.rejects(() => waste.append({
    date: "2026-04-15", slug: "",
    qty: { value: 1, kind: "count" }, reason: "expired",
  }));
  await assert.rejects(() => waste.append({
    date: "2026-04-15", slug: "x",
    qty: { value: 0, kind: "count" }, reason: "expired",
  }));
  await assert.rejects(() => waste.append({
    date: "2026-04-15", slug: "x",
    qty: { value: 1, kind: "count" },
    // deno-lint-ignore no-explicit-any
    reason: "ate" as any,
  }));
});

test("summarise aggregates by reason / slug / month", async () => {
  await sandbox();
  await waste.append({ date: "2026-04-01", slug: "milk", qty: { value: 100, kind: "volume" }, reason: "expired" });
  await waste.append({ date: "2026-04-15", slug: "milk", qty: { value: 200, kind: "volume" }, reason: "spoiled" });
  await waste.append({ date: "2026-05-01", slug: "lettuce", qty: { value: 1, kind: "count" }, reason: "spoiled" });
  const all = await waste.readAll();
  const sum = waste.summarise(all);
  assert.equal(sum.totalEntries, 3);
  assert.equal(sum.byReason.expired, 1);
  assert.equal(sum.byReason.spoiled, 2);
  assert.equal(sum.byMonth.get("2026-04"), 2);
});

test("topWastedSlugs returns N most-frequent", async () => {
  await sandbox();
  await waste.append({ date: "2026-04-01", slug: "milk", qty: { value: 100, kind: "volume" }, reason: "expired" });
  await waste.append({ date: "2026-04-02", slug: "milk", qty: { value: 100, kind: "volume" }, reason: "expired" });
  await waste.append({ date: "2026-04-03", slug: "lettuce", qty: { value: 1, kind: "count" }, reason: "spoiled" });
  const top = waste.topWastedSlugs(await waste.readAll(), 2);
  assert.equal(top[0]?.slug, "milk");
  assert.equal(top[0]?.count, 2);
});

test("inMonth filters", async () => {
  await sandbox();
  await waste.append({ date: "2026-04-15", slug: "x", qty: { value: 1, kind: "count" }, reason: "other" });
  await waste.append({ date: "2026-05-15", slug: "y", qty: { value: 1, kind: "count" }, reason: "other" });
  const apr = waste.inMonth(await waste.readAll(), "2026-04");
  assert.equal(apr.length, 1);
});

test("_truncate clears file", async () => {
  await sandbox();
  await waste.append({ date: "2026-04-15", slug: "x", qty: { value: 1, kind: "count" }, reason: "other" });
  await waste._truncate();
  assert.equal((await waste.readAll()).length, 0);
});
