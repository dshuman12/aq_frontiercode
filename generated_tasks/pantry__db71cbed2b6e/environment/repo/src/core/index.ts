// In-memory inverted lookup. Built from a snapshot of items so a
// command does one read and many cheap lookups.

import type { Item, Lot } from "./item.js";

export class Index {
  private byID = new Map<number, Item>();
  private bySlug = new Map<string, Item>();
  private byCategory = new Map<string, Item[]>();
  private byLocation = new Map<string, Item[]>();
  private byBarcode = new Map<string, Item>();
  private allItems: Item[];

  constructor(items: Item[]) {
    this.allItems = items.slice();
    for (const item of items) {
      this.byID.set(item.id, item);
      if (item.slug) this.bySlug.set(item.slug, item);
      if (item.barcode) this.byBarcode.set(item.barcode, item);
      const cat = item.category ?? "(none)";
      if (!this.byCategory.has(cat)) this.byCategory.set(cat, []);
      this.byCategory.get(cat)!.push(item);
      const seenLocs = new Set<string>();
      for (const lot of item.lots) {
        if (seenLocs.has(lot.where)) continue;
        seenLocs.add(lot.where);
        if (!this.byLocation.has(lot.where)) this.byLocation.set(lot.where, []);
        this.byLocation.get(lot.where)!.push(item);
      }
    }
  }

  size(): number {
    return this.allItems.length;
  }

  all(): Item[] {
    return this.allItems.slice();
  }

  getByID(id: number): Item | undefined {
    return this.byID.get(id);
  }

  getBySlug(slug: string): Item | undefined {
    return this.bySlug.get(slug);
  }

  getByBarcode(barcode: string): Item | undefined {
    return this.byBarcode.get(barcode);
  }

  inCategory(cat: string): Item[] {
    return (this.byCategory.get(cat) ?? []).slice();
  }

  inLocation(loc: string): Item[] {
    return (this.byLocation.get(loc) ?? []).slice();
  }

  categories(): string[] {
    return [...this.byCategory.keys()].sort();
  }

  locations(): string[] {
    return [...this.byLocation.keys()].sort();
  }

  countLots(): number {
    let n = 0;
    for (const i of this.allItems) n += i.lots.length;
    return n;
  }

  countByLocation(): Map<string, number> {
    const out = new Map<string, number>();
    for (const item of this.allItems) {
      for (const lot of item.lots) {
        out.set(lot.where, (out.get(lot.where) ?? 0) + 1);
      }
    }
    return out;
  }

  /** Apply fn(item, lot) over every (item, lot) pair. */
  forEachLot(fn: (item: Item, lot: Lot) => void): void {
    for (const item of this.allItems) {
      for (const lot of item.lots) fn(item, lot);
    }
  }
}
