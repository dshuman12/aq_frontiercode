import { test } from "node:test";
import assert from "node:assert/strict";
import * as queue from "./queue.js";

test("size starts at 0", () => {
  queue.clear();
  assert.equal(queue.size(), 0);
});

test("enqueue increments size", () => {
  queue.clear();
  queue.enqueue(async () => undefined);
  assert.equal(queue.size(), 1);
});

test("flush runs everything in FIFO order", async () => {
  queue.clear();
  const log: number[] = [];
  queue.enqueue(async () => { log.push(1); });
  queue.enqueue(async () => { log.push(2); });
  queue.enqueue(async () => { log.push(3); });
  const r = await queue.flush();
  assert.deepEqual(log, [1, 2, 3]);
  assert.equal(r.ran, 3);
  assert.equal(r.failed, 0);
});

test("flush captures errors but keeps running", async () => {
  queue.clear();
  queue.enqueue(async () => { throw new Error("first"); });
  queue.enqueue(async () => undefined);
  const r = await queue.flush();
  assert.equal(r.ran, 1);
  assert.equal(r.failed, 1);
});

test("flush empties the queue", async () => {
  queue.clear();
  queue.enqueue(async () => undefined);
  await queue.flush();
  assert.equal(queue.size(), 0);
});

test("clear empties without running", () => {
  queue.clear();
  let ran = false;
  queue.enqueue(async () => { ran = true; });
  queue.clear();
  assert.equal(ran, false);
  assert.equal(queue.size(), 0);
});

test("pending returns a snapshot", () => {
  queue.clear();
  queue.enqueue(async () => undefined);
  const snap = queue.pending();
  assert.equal(snap.length, 1);
});

test("runImmediately throws on failure", async () => {
  queue.clear();
  await assert.rejects(() => queue.runImmediately(async () => {
    throw new Error("nope");
  }));
});

test("runImmediately succeeds when fn does not throw", async () => {
  queue.clear();
  let called = false;
  await queue.runImmediately(async () => { called = true; });
  assert.equal(called, true);
});
