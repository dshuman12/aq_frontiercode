import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as notes from "./recipe-notes.js";

async function sandbox() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pantry-notes-"));
  process.env.PANTRY_DATA_DIR = path.join(dir, "data");
  process.env.PANTRY_CONFIG_DIR = path.join(dir, "cfg");
  process.env.PANTRY_CACHE_DIR = path.join(dir, "cache");
}

test("save + load round-trip", async () => {
  await sandbox();
  await notes.save("minestrone", "# notes");
  assert.equal(await notes.load("minestrone"), "# notes");
});

test("save validates slug", async () => {
  await sandbox();
  await assert.rejects(() => notes.save("", "x"));
});

test("load missing returns null", async () => {
  await sandbox();
  assert.equal(await notes.load("nope"), null);
});

test("exists true / false", async () => {
  await sandbox();
  await notes.save("x", "y");
  assert.equal(await notes.exists("x"), true);
  assert.equal(await notes.exists("y"), false);
});

test("remove returns true on existing", async () => {
  await sandbox();
  await notes.save("x", "y");
  assert.equal(await notes.remove("x"), true);
  assert.equal(await notes.exists("x"), false);
});

test("remove returns false on missing", async () => {
  await sandbox();
  assert.equal(await notes.remove("missing"), false);
});

test("list returns slugs only, sorted", async () => {
  await sandbox();
  await notes.save("zeta", "z");
  await notes.save("alpha", "a");
  const ls = await notes.list();
  assert.deepEqual(ls, ["alpha", "zeta"]);
});

test("list on missing dir returns []", async () => {
  await sandbox();
  assert.deepEqual(await notes.list(), []);
});

test("append concatenates", async () => {
  await sandbox();
  await notes.save("x", "first\n");
  await notes.append("x", "second");
  const got = await notes.load("x");
  assert.match(got ?? "", /first\nsecond/);
});

test("append on missing creates new file", async () => {
  await sandbox();
  await notes.append("x", "hello");
  assert.equal(await notes.load("x"), "\nhello");
});
