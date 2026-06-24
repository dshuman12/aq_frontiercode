import { test } from "node:test";
import assert from "node:assert/strict";
import { currentStreak, distinctDays, format, longestStreak, stats } from "./streaks.js";

const today = "2026-04-15";

function mk(date: string) {
  return { date, meal: "x", recipeSlug: "y", servings: 1 };
}

test("empty input returns 0/0", () => {
  const s = stats([], today);
  assert.equal(s.current, 0);
  assert.equal(s.longest, 0);
  assert.equal(s.daysRecorded, 0);
});

test("single day = streak 1", () => {
  const s = stats([mk(today)], today);
  assert.equal(s.current, 1);
  assert.equal(s.longest, 1);
});

test("longest captured even if not current", () => {
  const entries = [
    mk("2026-04-01"), mk("2026-04-02"), mk("2026-04-03"), mk("2026-04-04"),
    mk("2026-04-10"),
  ];
  const s = stats(entries, today);
  assert.equal(s.longest, 4);
});

test("currentStreak counts back to yesterday if today missing", () => {
  const entries = [mk("2026-04-13"), mk("2026-04-14")];
  const c = currentStreak(entries, today);
  assert.equal(c, 2);
});

test("currentStreak zero if last entry is older than yesterday", () => {
  const entries = [mk("2026-04-01")];
  const c = currentStreak(entries, today);
  assert.equal(c, 0);
});

test("distinctDays sorted asc", () => {
  const entries = [mk("2026-04-15"), mk("2026-04-15"), mk("2026-04-01")];
  assert.deepEqual(distinctDays(entries), ["2026-04-01", "2026-04-15"]);
});

test("longestStreak with all-distinct, all-consecutive", () => {
  const entries = [
    mk("2026-04-01"), mk("2026-04-02"), mk("2026-04-03"),
  ];
  assert.equal(longestStreak(entries), 3);
});

test("longestStreak with gaps", () => {
  const entries = [
    mk("2026-04-01"), mk("2026-04-02"),
    mk("2026-04-05"), mk("2026-04-06"), mk("2026-04-07"),
    mk("2026-04-12"),
  ];
  assert.equal(longestStreak(entries), 3);
});

test("format produces a string", () => {
  const out = format({ current: 3, longest: 9, daysRecorded: 30 });
  assert.match(out, /current: 3/);
});
