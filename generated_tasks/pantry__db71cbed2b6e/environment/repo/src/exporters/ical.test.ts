import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "./ical.js";

test("renders empty calendar", () => {
  const out = render([]);
  assert.match(out, /BEGIN:VCALENDAR/);
  assert.match(out, /END:VCALENDAR/);
  assert.equal(out.includes("VEVENT"), false);
});

test("renders one event per entry", () => {
  const out = render([
    { date: "2026-04-15", meal: "dinner", recipeSlug: "minestrone" },
    { date: "2026-04-16", meal: "lunch", recipeSlug: "rice-bowl" },
  ]);
  assert.equal((out.match(/BEGIN:VEVENT/g) ?? []).length, 2);
});

test("DTSTART uses YYYYMMDD form", () => {
  const out = render([{ date: "2026-04-15", meal: "dinner", recipeSlug: "x" }]);
  assert.match(out, /DTSTART;VALUE=DATE:20260415/);
});

test("escapes commas / semicolons in notes", () => {
  const out = render([{
    date: "2026-04-15", meal: "dinner", recipeSlug: "x", notes: "with, semis;",
  }]);
  assert.match(out, /with\\, semis\\;/);
});

test("UID stable for the same entry", () => {
  const a = render([{ date: "2026-04-15", meal: "dinner", recipeSlug: "x" }]);
  const b = render([{ date: "2026-04-15", meal: "dinner", recipeSlug: "x" }]);
  assert.equal(a, b);
});
