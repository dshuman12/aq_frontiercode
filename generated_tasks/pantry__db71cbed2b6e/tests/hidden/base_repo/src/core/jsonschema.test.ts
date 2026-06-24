import { test } from "node:test";
import assert from "node:assert/strict";
import { emit, itemSchema, recipeSchema } from "./jsonschema.js";

function asObj(v: unknown): Record<string, unknown> {
  return v as Record<string, unknown>;
}

test("itemSchema is well-formed object with required fields", () => {
  const s = asObj(itemSchema());
  assert.equal(s["title"], "pantry.Item");
  const req = s["required"] as string[];
  for (const f of ["id", "slug", "name", "lots"]) {
    assert.ok(req.includes(f));
  }
});

test("recipeSchema requires servings", () => {
  const s = asObj(recipeSchema());
  const req = s["required"] as string[];
  assert.ok(req.includes("servings"));
});

test("emit produces parseable strings", () => {
  const e = emit();
  assert.doesNotThrow(() => JSON.parse(e.item));
  assert.doesNotThrow(() => JSON.parse(e.recipe));
});

test("itemSchema has lot subschema", () => {
  const s = asObj(itemSchema());
  const lots = (s["properties"] as Record<string, unknown>)["lots"] as Record<string, unknown>;
  assert.equal((lots["type"] as string), "array");
});

test("recipeSchema has ingredients subschema", () => {
  const s = asObj(recipeSchema());
  const ing = (s["properties"] as Record<string, unknown>)["ingredients"] as Record<string, unknown>;
  assert.equal(ing["type"], "array");
});

test("itemSchema slug pattern matches valid slugs", () => {
  const s = asObj(itemSchema());
  const slug = ((s["properties"] as Record<string, unknown>)["slug"]) as Record<string, unknown>;
  const pattern = slug["pattern"] as string;
  const re = new RegExp(pattern);
  assert.ok(re.test("olive-oil"));
  assert.equal(re.test("Olive Oil"), false);
});
