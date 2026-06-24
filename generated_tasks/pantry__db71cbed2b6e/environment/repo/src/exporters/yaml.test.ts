import { test } from "node:test";
import assert from "node:assert/strict";
import { renderAll, renderItem } from "./yaml.js";
import type { Item } from "../core/item.js";

const today = "2026-04-15";

const sample: Item = {
  id: 1, slug: "olive-oil", name: "Olive Oil", category: "oils",
  lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
  createdAt: today, updatedAt: today,
};

test("renderItem produces YAML frontmatter", () => {
  const out = renderItem(sample);
  assert.match(out, /^---/);
  assert.match(out, /slug: olive-oil/);
  assert.match(out, /name: Olive Oil/);
});

test("renderItem includes lots heading", () => {
  const out = renderItem(sample);
  assert.match(out, /## Lots/);
});

test("renderItem skips category/barcode when missing", () => {
  const minimal: Item = { ...sample, lots: [] };
  delete minimal.category;
  const out = renderItem(minimal);
  assert.equal(out.includes("category"), false);
});

test("renderAll keys files by slug.md", () => {
  const files = renderAll([sample]);
  assert.ok("olive-oil.md" in files);
});

test("quote escapes special-character names", () => {
  const item: Item = {
    ...sample, name: "Has: a colon",
  };
  const out = renderItem(item);
  assert.match(out, /name: "Has: a colon"/);
});

test("renderItem includes lot lines", () => {
  const out = renderItem(sample);
  assert.match(out, /lot 1.*pantry/);
});

test("renderItem includes notes when present", () => {
  const out = renderItem({ ...sample, notes: "from the deli" });
  assert.match(out, /from the deli/);
});
