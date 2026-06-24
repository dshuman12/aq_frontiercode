import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as event from "./event.js";
import { consume, pollLoop, startPosition, summary } from "./usage-stream.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-stream-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("startPosition is zero", () => {
  assert.equal(startPosition().count, 0);
});

test("consume returns new entries since position", async () => {
  await sandbox();
  await event.append({ kind: "item.add", itemSlug: "x" });
  await event.append({ kind: "item.add", itemSlug: "y" });
  const { events, nextPosition } = await consume(startPosition());
  assert.equal(events.length, 2);
  assert.equal(nextPosition.count, 2);
});

test("consume from advanced position is empty", async () => {
  await sandbox();
  await event.append({ kind: "item.add", itemSlug: "x" });
  const { nextPosition } = await consume(startPosition());
  const { events } = await consume(nextPosition);
  assert.equal(events.length, 0);
});

test("pollLoop calls onEvent for each new entry", async () => {
  await sandbox();
  await event.append({ kind: "item.add", itemSlug: "x" });
  const seen: string[] = [];
  await pollLoop(startPosition(), (e) => seen.push(e.kind), { maxIterations: 1 });
  assert.equal(seen.length, 1);
});

test("pollLoop multiple iterations picks up newly-appended events", async () => {
  await sandbox();
  await event.append({ kind: "item.add", itemSlug: "x" });
  let pos = startPosition();
  pos = await pollLoop(pos, () => undefined, { maxIterations: 1 });
  await event.append({ kind: "item.add", itemSlug: "y" });
  const seen: string[] = [];
  await pollLoop(pos, (e) => seen.push(e.kind), { maxIterations: 1 });
  assert.equal(seen.length, 1);
});

test("summary aggregates by kind", () => {
  const out = summary([
    { at: "x", kind: "item.add" },
    { at: "x", kind: "item.add" },
    { at: "x", kind: "lot.use" },
  ]);
  assert.equal(out["item.add"], 2);
  assert.equal(out["lot.use"], 1);
});

test("summary on empty is empty object", () => {
  assert.deepEqual(summary([]), {});
});
