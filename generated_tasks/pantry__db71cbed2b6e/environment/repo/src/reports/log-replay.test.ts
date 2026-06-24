import { test } from "node:test";
import assert from "node:assert/strict";
import { reconstruct, reconstructAll, summary, timeline } from "./log-replay.js";
import type { Event } from "../core/event.js";

const events: Event[] = [
  { at: "2026-04-01T10:00:00Z", kind: "item.add", itemSlug: "milk" },
  { at: "2026-04-02T10:00:00Z", kind: "lot.add", itemSlug: "milk", lotId: 1 },
  { at: "2026-04-15T10:00:00Z", kind: "lot.use", itemSlug: "milk", detail: "30ml" },
  { at: "2026-04-15T10:00:00Z", kind: "lot.add", itemSlug: "rice" },
];

test("reconstruct picks up only target slug", () => {
  const life = reconstruct(events, "milk");
  assert.equal(life.events.length, 3);
});

test("reconstruct sets firstSeen + lastSeen", () => {
  const life = reconstruct(events, "milk");
  assert.equal(life.firstSeen, "2026-04-01T10:00:00Z");
  assert.equal(life.lastSeen, "2026-04-15T10:00:00Z");
});

test("totalLotEvents counts lot.* only", () => {
  const life = reconstruct(events, "milk");
  assert.equal(life.totalLotEvents, 2);
});

test("missing slug returns empty lifecycle", () => {
  const life = reconstruct(events, "missing");
  assert.equal(life.events.length, 0);
  assert.equal(life.firstSeen, undefined);
});

test("reconstructAll finds all slugs", () => {
  const m = reconstructAll(events);
  assert.equal(m.size, 2);
  assert.ok(m.has("milk"));
  assert.ok(m.has("rice"));
});

test("timeline includes events in chronological order", () => {
  const out = timeline(events);
  const milkIdx = out.indexOf("item.add");
  const useIdx = out.indexOf("lot.use");
  assert.ok(milkIdx < useIdx);
});

test("summary string includes counts", () => {
  const life = reconstruct(events, "milk");
  const out = summary(life);
  assert.match(out, /lot events: 2/);
});

test("summary on empty lifecycle handles never", () => {
  const life = reconstruct(events, "x");
  const out = summary(life);
  assert.match(out, /\(never\)/);
});
