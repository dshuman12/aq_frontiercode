import { test } from "node:test";
import assert from "node:assert/strict";
import { criticalPath, format, schedule } from "./timer.js";

test("simple sequential", () => {
  const s = schedule([
    { name: "chop", minutes: 5 },
    { name: "cook", minutes: 20, requires: ["chop"] },
  ]);
  assert.equal(s.totalMinutes, 25);
});

test("passive phase overlaps", () => {
  const s = schedule([
    { name: "boil-water", minutes: 10, passive: true },
    { name: "chop", minutes: 5 },
    { name: "cook-pasta", minutes: 8, requires: ["boil-water", "chop"] },
  ]);
  assert.ok(s.totalMinutes >= 13 && s.totalMinutes <= 18);
});

test("dependency cycle throws", () => {
  assert.throws(() =>
    schedule([
      { name: "a", minutes: 1, requires: ["b"] },
      { name: "b", minutes: 1, requires: ["a"] },
    ])
  );
});

test("missing requires-ID throws", () => {
  assert.throws(() =>
    schedule([{ name: "a", minutes: 1, requires: ["missing"] }])
  );
});

test("format produces a string", () => {
  const s = schedule([{ name: "x", minutes: 5 }]);
  const out = format(s);
  assert.match(out, /total: 5 minutes/);
  assert.match(out, /x/);
});

test("criticalPath identifies last-finishing phase", () => {
  const s = schedule([
    { name: "a", minutes: 5 },
    { name: "b", minutes: 10, requires: ["a"] },
  ]);
  const cp = criticalPath(s);
  assert.equal(cp[0], "b");
});

test("criticalPath empty when no events", () => {
  assert.deepEqual(criticalPath({ events: [], totalMinutes: 0 }), []);
});
