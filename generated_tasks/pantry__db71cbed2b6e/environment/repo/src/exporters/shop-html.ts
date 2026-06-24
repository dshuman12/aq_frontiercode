// Shopping list as a tiny printable HTML page.

import type { ShoppingList } from "../core/shopping.js";
import { isZero } from "../core/units.js";

const STYLE = `body { font: 14px/1.5 sans-serif; max-width: 36em; margin: 1em auto; padding: 0 1em; color: #222; }
h1 { font-size: 1.4em; }
ul { list-style: none; padding: 0; }
li { border-bottom: 1px solid #eee; padding: 0.4em 0; }
li input[type=checkbox] { margin-right: 0.6em; }
.notes { color: #666; font-size: 0.85em; }`;

export function render(list: ShoppingList): string {
  const out: string[] = [];
  out.push("<!DOCTYPE html>");
  out.push(`<html lang="en"><head><meta charset="utf-8"><title>shopping list</title>`);
  out.push(`<style>${STYLE}</style></head><body>`);
  out.push(`<h1>Shopping list (${escapeHtml(list.generatedAt)})</h1>`);
  out.push("<ul>");
  for (const e of list.entries) {
    if (isZero(e.shortfall)) continue;
    const recipes = e.recipes.length > 0
      ? `<div class="notes">for ${escapeHtml(e.recipes.join(", "))}</div>`
      : "";
    out.push(
      `<li><input type="checkbox"> <strong>${escapeHtml(e.slug)}</strong>` +
      ` ${e.shortfall.value.toFixed(1)} ${e.shortfall.kind}${recipes}</li>`,
    );
  }
  out.push("</ul></body></html>");
  return out.join("\n") + "\n";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
