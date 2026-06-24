import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffDays,
  endOfMonth,
  isFuture,
  isISODate,
  isPast,
  minusDays,
  plusDays,
  startOfMonth,
  startOfWeek,
  today,
} from "./date.js";

test("today returns YYYY-MM-DD", () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test("isISODate accepts well-formed", () => {
  assert.equal(isISODate("2026-04-15"), true);
  assert.equal(isISODate("2025-12-31"), true);
});

test("isISODate rejects garbage", () => {
  for (const s of ["", "today", "2026/04/15", "2026-13-01", "2026-04-32"]) {
    assert.equal(isISODate(s), false, `should reject ${s}`);
  }
});

test("plusDays / minusDays round trip", () => {
  assert.equal(plusDays("2026-04-15", 30), "2026-05-15");
  assert.equal(minusDays("2026-05-15", 30), "2026-04-15");
});

test("plusDays handles month rollover", () => {
  assert.equal(plusDays("2026-01-30", 5), "2026-02-04");
  assert.equal(plusDays("2026-12-31", 1), "2027-01-01");
});

test("plusDays rejects bad date", () => {
  assert.throws(() => plusDays("not-a-date", 1));
});

test("diffDays", () => {
  assert.equal(diffDays("2026-04-15", "2026-04-01"), 14);
  assert.equal(diffDays("2026-04-01", "2026-04-15"), -14);
});

test("startOfMonth", () => {
  assert.equal(startOfMonth("2026-04-15"), "2026-04-01");
});

test("endOfMonth handles 30-day months", () => {
  assert.equal(endOfMonth("2026-04-15"), "2026-04-30");
});

test("endOfMonth handles February", () => {
  assert.equal(endOfMonth("2026-02-10"), "2026-02-28");
});

test("endOfMonth handles leap February", () => {
  assert.equal(endOfMonth("2024-02-10"), "2024-02-29");
});

test("startOfWeek returns Monday", () => {
  // 2026-04-15 was a Wednesday
  assert.equal(startOfWeek("2026-04-15"), "2026-04-13");
  // Monday stays put
  assert.equal(startOfWeek("2026-04-13"), "2026-04-13");
  // Sunday goes back to previous Monday
  assert.equal(startOfWeek("2026-04-19"), "2026-04-13");
});

test("isPast / isFuture relative to a ref", () => {
  assert.equal(isPast("2026-04-14", "2026-04-15"), true);
  assert.equal(isPast("2026-04-15", "2026-04-15"), false);
  assert.equal(isFuture("2026-04-16", "2026-04-15"), true);
  assert.equal(isFuture("2026-04-15", "2026-04-15"), false);
});
