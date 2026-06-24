// Diff two snapshots and pretty-print the result.
// (Wraps core/diff in something more report-shaped.)

import type { Item } from "../core/item.js";
import { changedSlugs, diff } from "../core/diff.js";
import { totalQuantity } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";

export interface CompareReport {
  added: Item[];
  removed: Item[];
  changed: Array<{ before: Item; after: Item; reason: string }>;
}

export function compare(before: Item[], after: Item[]): CompareReport {
  const d = diff(before, after);
  const changed = d.changed.map(({ before, after }) => ({
    before, after, reason: changeReason(before, after),
  }));
  return { added: d.added, removed: d.removed, changed };
}

function changeReason(before: Item, after: Item): string {
  if (before.name !== after.name) return "renamed";
  if ((before.category ?? "") !== (after.category ?? "")) return "recategorised";
  if (before.lots.length < after.lots.length) return "lot-added";
  if (before.lots.length > after.lots.length) return "lot-removed";
  if (before.lots.length === after.lots.length) {
    for (let i = 0; i < before.lots.length; i++) {
      const a = before.lots[i]!;
      const b = after.lots[i]!;
      if (a.qty.value !== b.qty.value) return "qty-changed";
      if (a.where !== b.where) return "moved";
      if ((a.bestBy ?? "") !== (b.bestBy ?? "")) return "best-by-changed";
    }
  }
  return "other";
}

export function format(r: CompareReport): string {
  const lines: string[] = [];
  lines.push(`# pantry diff`);
  lines.push("");
  if (r.added.length > 0) {
    lines.push(`## added (${r.added.length})`);
    for (const item of r.added) {
      const total = totalQuantity(item);
      lines.push(`- ${item.slug}${total ? "  " + fmtQ(total) : ""}`);
    }
    lines.push("");
  }
  if (r.removed.length > 0) {
    lines.push(`## removed (${r.removed.length})`);
    for (const item of r.removed) lines.push(`- ${item.slug}`);
    lines.push("");
  }
  if (r.changed.length > 0) {
    lines.push(`## changed (${r.changed.length})`);
    for (const { after, reason } of r.changed) {
      const total = totalQuantity(after);
      lines.push(`- ${after.slug} [${reason}]${total ? "  " + fmtQ(total) : ""}`);
    }
    lines.push("");
  }
  if (lines.length === 2) lines.push("(no changes)");
  return lines.join("\n") + "\n";
}

export function summary(r: CompareReport): string {
  return `+${r.added.length} -${r.removed.length} ~${r.changed.length}`;
}

export function affectedSlugs(r: CompareReport): string[] {
  const set = new Set<string>();
  for (const i of r.added) set.add(i.slug);
  for (const i of r.removed) set.add(i.slug);
  for (const c of r.changed) set.add(c.after.slug);
  return [...set].sort();
}

void changedSlugs;
