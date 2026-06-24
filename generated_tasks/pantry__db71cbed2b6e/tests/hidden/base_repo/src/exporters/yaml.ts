// Render each pantry item as an Obsidian-style YAML frontmatter block
// + body. Useful for vault-style note-keeping.

import type { Item } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";
import { lotsByExpiry } from "../core/item.js";

export function renderItem(item: Item): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: ${item.slug}`);
  lines.push(`name: ${quote(item.name)}`);
  if (item.category) lines.push(`category: ${item.category}`);
  if (item.barcode) lines.push(`barcode: ${item.barcode}`);
  lines.push(`created: ${item.createdAt}`);
  lines.push(`updated: ${item.updatedAt}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${item.name}`);
  lines.push("");
  if (item.notes) {
    lines.push(item.notes);
    lines.push("");
  }
  lines.push("## Lots");
  for (const lot of lotsByExpiry(item)) {
    const bits = [
      `- lot ${lot.id}: ${fmtQ(lot.qty)} in ${lot.where}`,
    ];
    if (lot.bestBy) bits.push(`(best by ${lot.bestBy})`);
    if (lot.notes) bits.push(`/ ${lot.notes}`);
    lines.push(bits.join(" "));
  }
  return lines.join("\n") + "\n";
}

export function renderAll(items: Item[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    out[`${item.slug}.md`] = renderItem(item);
  }
  return out;
}

function quote(s: string): string {
  if (/[:#&*!|]|^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
