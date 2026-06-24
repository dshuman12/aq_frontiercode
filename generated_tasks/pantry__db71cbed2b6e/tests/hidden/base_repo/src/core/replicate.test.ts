import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { countJSON, sync } from "./replicate.js";

test("sync copies new JSON files", async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), "rep-src-"));
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), "rep-dst-"));
  await fs.writeFile(path.join(src, "a.json"), '{"x":1}', "utf8");
  await fs.writeFile(path.join(src, "b.json"), '{"y":2}', "utf8");
  const r = await sync(src, dst);
  assert.equal(r.copied, 2);
});

test("sync skips existing in skip-existing mode", async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), "rep-src-"));
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), "rep-dst-"));
  await fs.writeFile(path.join(src, "a.json"), "new", "utf8");
  await fs.writeFile(path.join(dst, "a.json"), "old", "utf8");
  const r = await sync(src, dst, "skip-existing");
  assert.equal(r.skipped, 1);
  const got = await fs.readFile(path.join(dst, "a.json"), "utf8");
  assert.equal(got, "old");
});

test("sync overwrite always copies", async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), "rep-src-"));
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), "rep-dst-"));
  await fs.writeFile(path.join(src, "a.json"), "new", "utf8");
  await fs.writeFile(path.join(dst, "a.json"), "old", "utf8");
  const r = await sync(src, dst, "overwrite");
  assert.equal(r.copied, 1);
  const got = await fs.readFile(path.join(dst, "a.json"), "utf8");
  assert.equal(got, "new");
});

test("sync ignores non-JSON files", async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), "rep-src-"));
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), "rep-dst-"));
  await fs.writeFile(path.join(src, "junk.txt"), "x", "utf8");
  const r = await sync(src, dst);
  assert.equal(r.copied, 0);
});

test("sync rejects empty src/dst", async () => {
  await assert.rejects(() => sync("", "y"));
  await assert.rejects(() => sync("x", ""));
});

test("sync rejects non-directory src", async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), "rep-src-"));
  const file = path.join(src, "f.json");
  await fs.writeFile(file, "x", "utf8");
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), "rep-dst-"));
  await assert.rejects(() => sync(file, dst));
});

test("countJSON counts files recursively", async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), "rep-cnt-"));
  await fs.writeFile(path.join(src, "a.json"), "x", "utf8");
  await fs.mkdir(path.join(src, "sub"), { recursive: true });
  await fs.writeFile(path.join(src, "sub", "b.json"), "x", "utf8");
  await fs.writeFile(path.join(src, "junk.txt"), "x", "utf8");
  assert.equal(await countJSON(src), 2);
});
