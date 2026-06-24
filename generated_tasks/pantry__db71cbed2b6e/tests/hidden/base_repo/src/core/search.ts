// Tiny query language for the `pantry search` command.
//
// Syntax (everything is AND-joined):
//   slug:olive
//   category:oils
//   where:fridge
//   expiring:7              - lot best-by in next 7 days
//   tag:foo                 - tag on the item (placeholder for future)
//   notes:"morning loop"    - substring (case-insensitive)
//
// Bare words become notes substrings.

import type { Item } from "./item.js";
import { expiringSoon } from "./item.js";

export interface Filter {
  slug?: string;
  category?: string;
  where?: string;
  expiring?: number;
  notes?: string;
}

export function parse(q: string): Filter {
  const filter: Filter = {};
  for (const term of tokenize(q)) {
    if (!term.includes(":")) {
      filter.notes = term.toLowerCase();
      continue;
    }
    const eq = term.indexOf(":");
    const key = term.slice(0, eq).toLowerCase();
    const val = term.slice(eq + 1);
    switch (key) {
      case "slug":
        filter.slug = val.toLowerCase();
        break;
      case "category":
        filter.category = val;
        break;
      case "where":
        filter.where = val.toLowerCase();
        break;
      case "expiring": {
        const n = Number.parseInt(val, 10);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error(`search: bad expiring value "${val}"`);
        }
        filter.expiring = n;
        break;
      }
      case "notes":
        filter.notes = val.toLowerCase();
        break;
      default:
        throw new Error(`search: unknown key "${key}"`);
    }
  }
  return filter;
}

function tokenize(q: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of q) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === " " && !quoted) {
      if (cur.length > 0) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

export function apply(items: Item[], filter: Filter, today: string): Item[] {
  return items.filter((item) => matches(item, filter, today));
}

function matches(item: Item, f: Filter, today: string): boolean {
  if (f.slug && !item.slug.toLowerCase().includes(f.slug)) return false;
  if (f.category && (item.category ?? "") !== f.category) return false;
  if (f.where) {
    if (!item.lots.some((l) => l.where === f.where)) return false;
  }
  if (f.expiring !== undefined) {
    if (expiringSoon(item, today, f.expiring).length === 0) return false;
  }
  if (f.notes) {
    const haystack = (
      (item.notes ?? "") + " " +
      item.lots.map((l) => l.notes ?? "").join(" ")
    ).toLowerCase();
    if (!haystack.includes(f.notes)) return false;
  }
  return true;
}
