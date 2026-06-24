import { test } from "node:test";
import assert from "node:assert/strict";
import { inSeason, knownTags, rulesForTag, suggestHoliday } from "./holiday.js";

test("turkey suggests thanksgiving", () => {
  const tags = suggestHoliday({ ingredients: [{ slug: "turkey-whole" }] });
  assert.ok(tags.includes("thanksgiving"));
});

test("matzo suggests passover", () => {
  const tags = suggestHoliday({ ingredients: [{ slug: "matzo" }] });
  assert.ok(tags.includes("passover"));
});

test("no triggers yields empty", () => {
  const tags = suggestHoliday({ ingredients: [{ slug: "tomato" }] });
  assert.deepEqual(tags, []);
});

test("inSeason for november includes thanksgiving", () => {
  assert.ok(inSeason("2026-11-15").includes("thanksgiving"));
});

test("inSeason for april includes easter + passover", () => {
  const got = inSeason("2026-04-10");
  assert.ok(got.includes("easter"));
  assert.ok(got.includes("passover"));
});

test("inSeason for may is empty", () => {
  assert.deepEqual(inSeason("2026-05-15"), []);
});

test("knownTags non-empty + sorted", () => {
  const t = knownTags();
  assert.ok(t.length > 0);
  for (let i = 1; i < t.length; i++) assert.ok(t[i - 1]! <= t[i]!);
});

test("rulesForTag returns rule or null", () => {
  const r = rulesForTag("thanksgiving");
  assert.equal(r?.tag, "thanksgiving");
  assert.equal(rulesForTag("nope"), null);
});
