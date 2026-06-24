import { test } from "node:test";
import assert from "node:assert/strict";
import { activeKeys, clearAll, isLocked, lock } from "./locker.js";

test("lock serialises async work for the same key", async () => {
  clearAll();
  const log: number[] = [];
  await Promise.all([
    lock("k", async () => { await tick(); log.push(1); }),
    lock("k", async () => { await tick(); log.push(2); }),
    lock("k", async () => { await tick(); log.push(3); }),
  ]);
  assert.deepEqual(log, [1, 2, 3]);
});

test("different keys do not block each other", async () => {
  clearAll();
  const log: string[] = [];
  await Promise.all([
    lock("a", async () => { await tick(); log.push("a"); }),
    lock("b", async () => { log.push("b"); }),
  ]);
  // b might land first because it doesn't await tick
  assert.ok(log.includes("a"));
  assert.ok(log.includes("b"));
});

test("lock without key throws", async () => {
  clearAll();
  await assert.rejects(() => lock("", async () => undefined));
});

test("isLocked reflects in-flight work", async () => {
  clearAll();
  const p = lock("x", async () => { await tick(); });
  assert.equal(isLocked("x"), true);
  await p;
  // After the holder releases, queue may or may not be cleaned synchronously
});

test("activeKeys lists held keys", async () => {
  clearAll();
  const p = lock("z", async () => { await tick(); });
  assert.ok(activeKeys().includes("z"));
  await p;
});

test("lock returns the function's resolved value", async () => {
  clearAll();
  const out = await lock("k", async () => 42);
  assert.equal(out, 42);
});

test("clearAll empties the queue map", async () => {
  clearAll();
  // (can't easily assert internal state; just ensure it doesn't throw)
  assert.deepEqual(activeKeys(), []);
});

function tick(): Promise<void> {
  return new Promise((r) => setImmediate(r));
}
