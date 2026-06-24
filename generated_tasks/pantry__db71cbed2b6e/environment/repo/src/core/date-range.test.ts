import { test } from "node:test";
import assert from "node:assert/strict";
import { daysInMonth, listDays, listWeeks } from "./date-range.js";

test("listDays inclusive of endpoints", () => {
  const out = listDays("2026-04-01", "2026-04-03");
  assert.deepEqual(out, ["2026-04-01", "2026-04-02", "2026-04-03"]);
});

test("listDays empty when from > to", () => {
  assert.deepEqual(listDays("2026-04-05", "2026-04-01"), []);
});

test("listDays single-day range", () => {
  assert.deepEqual(listDays("2026-04-01", "2026-04-01"), ["2026-04-01"]);
});

test("listDays rejects non-ISO", () => {
  assert.throws(() => listDays("today", "tomorrow"));
});

test("daysInMonth April 30 days", () => {
  const out = daysInMonth("2026-04");
  assert.equal(out.length, 30);
  assert.equal(out[0], "2026-04-01");
  assert.equal(out[29], "2026-04-30");
});

test("daysInMonth February 28 days non-leap", () => {
  const out = daysInMonth("2026-02");
  assert.equal(out.length, 28);
});

test("daysInMonth February 29 days leap", () => {
  const out = daysInMonth("2024-02");
  assert.equal(out.length, 29);
});

test("daysInMonth bad input", () => {
  assert.throws(() => daysInMonth("not-a-month"));
});

test("listWeeks emits Monday-to-Monday", () => {
  const out = listWeeks("2026-04-06", "2026-04-27");
  assert.equal(out.length, 4);
});
