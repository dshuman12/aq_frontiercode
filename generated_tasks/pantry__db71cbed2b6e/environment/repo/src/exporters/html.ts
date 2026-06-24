// Single-file static HTML view of the pantry. No JS, inline CSS.

import type { Item } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";
import { lotsByExpiry } from "../core/item.js";

const STYLE = `body { font: 14px/1.5 -apple-system, sans-serif; max-width: 64em; margin: 2em auto; padding: 0 1em; color: #222; }
h1, h2 { font-weight: 600; }
h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { padding: 0.4em 0.6em; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f5f5f5; }
.metric { font-variant-numeric: tabular-nums; }
.notes { color: #666; }
.expired { color: #b22; }
footer { color: #888; font-size: 0.85em; margin-top: 3em; }`;

export function render(items: Item[], today: string): string {
  const out: string[] = [];
  out.push("<!DOCTYPE html>");
  out.push(`<html lang="en"><head><meta charset="utf-8"><title>pantry</title>`);
  out.push(`<style>${STYLE}</style></head><body>`);
  out.push("<h1>pantry</h1>");
  out.push(`<p>${items.length} items, ${countLots(items)} lots.</p>`);
  if (items.length > 0) {
    out.push("<table>");
    out.push(
      "<tr><th>slug</th><th>name</th><th>category</th>" +
        "<th>lot</th><th>qty</th><th>where</th><th>best by</th><th>notes</th></tr>",
    );
    for (const item of items) {
      const lots = lotsByExpiry(item);
      if (lots.length === 0) {
        out.push(row(escapeHtml(item.slug), escapeHtml(item.name), escapeHtml(item.category ?? "")));
        continue;
      }
      for (const lot of lots) {
        const exp = lot.bestBy && lot.bestBy <= today ? ` class="expired"` : "";
        out.push(
          `<tr><td>${escapeHtml(item.slug)}</td>` +
            `<td>${escapeHtml(item.name)}</td>` +
            `<td>${escapeHtml(item.category ?? "")}</td>` +
            `<td>${lot.id}</td>` +
            `<td class="metric">${escapeHtml(fmtQ(lot.qty))}</td>` +
            `<td>${lot.where}</td>` +
            `<td${exp}>${escapeHtml(lot.bestBy ?? "")}</td>` +
            `<td class="notes">${escapeHtml(lot.notes ?? "")}</td></tr>`,
        );
      }
    }
    out.push("</table>");
  }
  out.push(`<footer>generated ${today}.</footer></body></html>`);
  return out.join("\n") + "\n";
}

function row(...cells: string[]): string {
  return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
}

function countLots(items: Item[]): number {
  let n = 0;
  for (const item of items) n += item.lots.length;
  return n;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
