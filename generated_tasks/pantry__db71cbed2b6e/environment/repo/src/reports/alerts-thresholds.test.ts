import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOptionsFor, knownCategories, thresholdFor } from "./alerts-thresholds.js";

test("produce has tight expiring window", () => {
  assert.equal(thresholdFor("produce").expiringWindowDays, 5);
});

test("alcohol has loose expiring window", () => {
  assert.ok(thresholdFor("alcohol").expiringWindowDays > 30);
});

test("unknown category falls back to default", () => {
  const t = thresholdFor("zzzz");
  assert.equal(t.expiringWindowDays, 7);
  assert.equal(t.staleAfterDays, 90);
});

test("buildOptionsFor includes today", () => {
  const opts = buildOptionsFor("produce", "2026-04-15");
  assert.equal(opts.today, "2026-04-15");
});

test("buildOptionsFor uses category-specific window", () => {
  const opts = buildOptionsFor("dairy", "2026-04-15");
  assert.equal(opts.expiringWindowDays, 7);
});

test("knownCategories sorted distinct", () => {
  const c = knownCategories();
  for (let i = 1; i < c.length; i++) assert.ok(c[i - 1]! < c[i]!);
});
