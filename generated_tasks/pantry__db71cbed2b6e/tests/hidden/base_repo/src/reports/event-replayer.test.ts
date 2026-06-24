import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyEvent,
  asArray,
  emptyState,
  replayUntil,
  summary,
  tracesBetween,
} from "./event-replayer.js";

test("emptyState has zero items", () => {
  const s = emptyState();
  assert.equal(s.items.size, 0);
});

test("applyEvent item.add inserts", () => {
  const s = applyEvent(emptyState(),
    { at: "2026-04-15T10:00:00Z", kind: "item.add", itemSlug: "milk" });
  assert.ok(s.items.has("milk"));
});

test("applyEvent item.remove deletes", () => {
  let s = applyEvent(emptyState(),
    { at: "2026-04-15T10:00:00Z", kind: "item.add", itemSlug: "milk" });
  s = applyEvent(s,
    { at: "2026-04-15T11:00:00Z", kind: "item.remove", itemSlug: "milk" });
  assert.equal(s.items.size, 0);
});

test("applyEvent lot.add appends", () => {
  let s = applyEvent(emptyState(),
    { at: "2026-04-15T10:00:00Z", kind: "item.add", itemSlug: "milk" });
  s = applyEvent(s,
    { at: "2026-04-15T11:00:00Z", kind: "lot.add", itemSlug: "milk", lotId: 1 });
  assert.equal(s.items.get("milk")!.lots.length, 1);
});

test("applyEvent lot.discard removes", () => {
  let s = applyEvent(emptyState(),
    { at: "2026-04-15T10:00:00Z", kind: "item.add", itemSlug: "milk" });
  s = applyEvent(s,
    { at: "2026-04-15T11:00:00Z", kind: "lot.add", itemSlug: "milk", lotId: 7 });
  s = applyEvent(s,
    { at: "2026-04-15T12:00:00Z", kind: "lot.discard", itemSlug: "milk", lotId: 7 });
  assert.equal(s.items.get("milk")!.lots.length, 0);
});

test("applyEvent skips events without itemSlug", () => {
  const s = applyEvent(emptyState(),
    { at: "2026-04-15T10:00:00Z", kind: "import" });
  assert.equal(s.items.size, 0);
});

test("replayUntil stops at given timestamp", () => {
  const events = [
    { at: "2026-04-01T00:00:00Z", kind: "item.add" as const, itemSlug: "a" },
    { at: "2026-04-15T00:00:00Z", kind: "item.add" as const, itemSlug: "b" },
  ];
  const s = replayUntil(events, "2026-04-10T00:00:00Z");
  assert.equal(s.items.size, 1);
  assert.ok(s.items.has("a"));
});

test("asArray returns values", () => {
  let s = applyEvent(emptyState(),
    { at: "x", kind: "item.add", itemSlug: "milk" });
  assert.equal(asArray(s).length, 1);
});

test("summary string", () => {
  let s = applyEvent(emptyState(),
    { at: "x", kind: "item.add", itemSlug: "milk" });
  assert.match(summary(s), /1 items/);
});

test("tracesBetween filters", () => {
  const events = [
    { at: "2026-04-01T00:00:00Z", kind: "item.add" as const, itemSlug: "a" },
    { at: "2026-04-15T00:00:00Z", kind: "item.add" as const, itemSlug: "b" },
    { at: "2026-04-30T00:00:00Z", kind: "item.add" as const, itemSlug: "c" },
  ];
  const out = tracesBetween(events, "2026-04-10T00:00:00Z", "2026-04-20T00:00:00Z");
  assert.equal(out.length, 1);
});
