import { test } from "node:test";
import assert from "node:assert/strict";
import { html, render } from "./review.js";

test("renders monthly title", () => {
  const out = render({ yyyymm: "2026-04", items: [], meals: [], waste: [] });
  assert.match(out, /# 2026-04 in review/);
});

test("counts meals in month, ignoring others", () => {
  const out = render({
    yyyymm: "2026-04",
    items: [],
    meals: [
      { date: "2026-04-01", meal: "x", recipeSlug: "a", servings: 1 },
      { date: "2026-05-01", meal: "x", recipeSlug: "a", servings: 1 },
    ],
    waste: [],
  });
  assert.match(out, /meals cooked:  \*\*1\*\*/);
});

test("includes top-recipes section when meals present", () => {
  const out = render({
    yyyymm: "2026-04",
    items: [],
    meals: [
      { date: "2026-04-01", meal: "x", recipeSlug: "a", servings: 1 },
      { date: "2026-04-02", meal: "x", recipeSlug: "a", servings: 1 },
      { date: "2026-04-03", meal: "x", recipeSlug: "b", servings: 1 },
    ],
    waste: [],
  });
  assert.match(out, /Most-cooked recipes/);
  assert.match(out, /a \(2x\)/);
});

test("includes waste section when waste present", () => {
  const out = render({
    yyyymm: "2026-04",
    items: [],
    meals: [],
    waste: [{
      date: "2026-04-15", slug: "milk",
      qty: { value: 1, kind: "count" }, reason: "expired",
    }],
  });
  assert.match(out, /## Waste/);
});

test("waste section lists per-reason counts", () => {
  const out = render({
    yyyymm: "2026-04",
    items: [],
    meals: [],
    waste: [
      { date: "2026-04-15", slug: "x", qty: { value: 1, kind: "count" }, reason: "expired" },
      { date: "2026-04-16", slug: "x", qty: { value: 1, kind: "count" }, reason: "expired" },
      { date: "2026-04-17", slug: "x", qty: { value: 1, kind: "count" }, reason: "spoiled" },
    ],
  });
  assert.match(out, /expired: 2/);
  assert.match(out, /spoiled: 1/);
});

test("html wraps headings + bold", () => {
  const out = html({ yyyymm: "2026-04", items: [], meals: [], waste: [] });
  assert.match(out, /<h1>/);
  assert.match(out, /<h2>/);
  assert.match(out, /<strong>/);
});

test("empty inputs render the at-glance section only", () => {
  const out = render({ yyyymm: "2026-04", items: [], meals: [], waste: [] });
  assert.match(out, /At a glance/);
});
