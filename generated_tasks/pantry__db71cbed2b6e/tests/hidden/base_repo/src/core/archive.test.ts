import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as archive from "./archive.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-archive-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
  return dir;
}

test("build over empty data dir returns empty archive", async () => {
  await sandbox();
  const a = await archive.build();
  assert.equal(a.version, 1);
  assert.deepEqual(a.entries, []);
});

test("build picks up files", async () => {
  const root = await sandbox();
  const dataDir = path.join(root, "data");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, "foo.json"), '{"x":1}', "utf8");
  await fs.writeFile(path.join(dataDir, "bar.json"), '{"y":2}', "utf8");
  const a = await archive.build();
  assert.equal(a.entries.length, 2);
});

test("serialize + parse round-trips", async () => {
  const a: archive.Archive = {
    version: 1, generatedAt: "2026-04-15T00:00:00Z",
    entries: [{ name: "foo.json", size: 5, body: "hi" }],
  };
  const text = archive.serialize(a);
  const back = archive.parse(text);
  assert.equal(back.entries.length, 1);
});

test("parse rejects bad version", () => {
  assert.throws(() => archive.parse(JSON.stringify({ version: 2, entries: [] })));
});

test("parse rejects dangerous names", () => {
  assert.throws(() => archive.parse(JSON.stringify({
    version: 1, entries: [{ name: "../../etc/passwd", size: 0, body: "" }],
  })));
});

test("restore writes files", async () => {
  await sandbox();
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-restore-"));
  const n = await archive.restore({
    version: 1, generatedAt: "x",
    entries: [
      { name: "items/00001.json", size: 5, body: '{"id":1}' },
      { name: "events.jsonl", size: 1, body: "x\n" },
    ],
  }, dest);
  assert.equal(n, 2);
  assert.equal(await fs.readFile(path.join(dest, "items/00001.json"), "utf8"), '{"id":1}');
});

test("restore refuses path traversal", async () => {
  await sandbox();
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-restore-"));
  await assert.rejects(() => archive.restore({
    version: 1, generatedAt: "x",
    entries: [{ name: "../escape.txt", size: 0, body: "" }],
  }, dest));
});

test("totalBytes sums sizes", () => {
  const a: archive.Archive = {
    version: 1, generatedAt: "x",
    entries: [
      { name: "a", size: 100, body: "" },
      { name: "b", size: 200, body: "" },
    ],
  };
  assert.equal(archive.totalBytes(a), 300);
});
