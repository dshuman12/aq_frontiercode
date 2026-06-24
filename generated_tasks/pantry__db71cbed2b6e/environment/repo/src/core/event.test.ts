import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as event from "./event.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-event-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("append + read", async () => {
  await sandbox();
  await event.append({ kind: "item.add", itemSlug: "olive-oil" });
  await event.append({ kind: "lot.add", itemSlug: "olive-oil", lotId: 1 });
  const all = await event.readAll();
  assert.equal(all.length, 2);
});

test("readAll on missing file is empty", async () => {
  await sandbox();
  assert.deepEqual(await event.readAll(), []);
});

test("lastN clamps", async () => {
  await sandbox();
  for (let i = 0; i < 5; i++) {
    await event.append({ kind: "item.add", itemId: i });
  }
  const last = await event.lastN(3);
  assert.equal(last.length, 3);
  assert.equal(last[0]?.itemId, 2);
});

test("filterKind", async () => {
  await sandbox();
  await event.append({ kind: "item.add", itemSlug: "x" });
  await event.append({ kind: "item.remove", itemSlug: "x" });
  const all = await event.readAll();
  assert.equal(event.filterKind(all, "item.add").length, 1);
});

test("countByKind", async () => {
  await sandbox();
  await event.append({ kind: "item.add" });
  await event.append({ kind: "item.add" });
  await event.append({ kind: "lot.add" });
  const all = await event.readAll();
  const counts = event.countByKind(all);
  assert.equal(counts.get("item.add"), 2);
  assert.equal(counts.get("lot.add"), 1);
});

test("pretty produces a string", async () => {
  await sandbox();
  await event.append({ kind: "lot.use", itemSlug: "milk", lotId: 3, detail: "30ml" });
  const all = await event.readAll();
  const line = event.pretty(all[0]!);
  assert.match(line, /lot.use/);
  assert.match(line, /milk/);
});

test("validate rejects empty kind", async () => {
  await sandbox();
  // deno-lint-ignore no-explicit-any
  await assert.rejects(() => event.append({ kind: "" as any }));
});

test("_truncate clears file", async () => {
  await sandbox();
  await event.append({ kind: "item.add" });
  await event._truncate();
  assert.equal((await event.readAll()).length, 0);
});
