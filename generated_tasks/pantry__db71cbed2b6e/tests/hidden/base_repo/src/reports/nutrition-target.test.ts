import { test } from "node:test";
import assert from "node:assert/strict";
import { defaults, evaluate, evaluateMany, format, violationCount } from "./nutrition-target.js";

test("hits ok when within bounds", () => {
  const r = evaluate("2026-04-15",
    { cal: 2000, protein: 90, carbs: 250, fat: 70 },
    defaults());
  assert.equal(violationCount(r), 0);
});

test("flags below calMin", () => {
  const r = evaluate("2026-04-15",
    { cal: 1000, protein: 90, carbs: 250, fat: 70 },
    defaults());
  assert.equal(r.hits["cal-min"], "below");
});

test("flags above carbsMax", () => {
  const r = evaluate("2026-04-15",
    { cal: 2000, protein: 90, carbs: 500, fat: 70 },
    defaults());
  assert.equal(r.hits["carbs-max"], "above");
});

test("evaluateMany returns one row per intake", () => {
  const out = evaluateMany([
    { date: "2026-04-15", intake: { cal: 1900, protein: 90, carbs: 250, fat: 70 } },
    { date: "2026-04-16", intake: { cal: 2200, protein: 90, carbs: 250, fat: 70 } },
  ], defaults());
  assert.equal(out.length, 2);
});

test("violationCount sums non-ok hits", () => {
  const r = evaluate("2026-04-15",
    { cal: 100, protein: 5, carbs: 999, fat: 999 },
    defaults());
  assert.ok(violationCount(r) > 1);
});

test("format string includes date", () => {
  const r = evaluate("2026-04-15",
    { cal: 2000, protein: 90, carbs: 250, fat: 70 },
    defaults());
  assert.match(format(r), /^2026-04-15/);
});

test("format ok day says ok", () => {
  const r = evaluate("2026-04-15",
    { cal: 2000, protein: 90, carbs: 250, fat: 70 },
    defaults());
  assert.match(format(r), /ok/);
});

test("targets with no fields skip evaluation", () => {
  const r = evaluate("2026-04-15",
    { cal: 0, protein: 0, carbs: 0, fat: 0 },
    {});
  assert.equal(violationCount(r), 0);
});
