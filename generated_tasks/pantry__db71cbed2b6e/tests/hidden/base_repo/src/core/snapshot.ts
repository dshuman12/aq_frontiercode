// Immutable point-in-time view of the pantry.

import type { Item } from "./item.js";

export class Snapshot {
  readonly takenAt: string;
  private readonly items: Item[];

  constructor(items: Item[], takenAt?: string) {
    this.items = JSON.parse(JSON.stringify(items)) as Item[];
    this.takenAt = takenAt ?? new Date().toISOString();
  }

  size(): number {
    return this.items.length;
  }

  all(): Item[] {
    return JSON.parse(JSON.stringify(this.items)) as Item[];
  }

  get(id: number): Item | null {
    const it = this.items.find((i) => i.id === id);
    return it ? (JSON.parse(JSON.stringify(it)) as Item) : null;
  }

  /** Total lots across all items. */
  countLots(): number {
    let n = 0;
    for (const i of this.items) n += i.lots.length;
    return n;
  }

  /** items present in this snapshot but not in `other` (matched by slug). */
  itemsAddedSince(other: Snapshot): Item[] {
    const otherSlugs = new Set(other.items.map((i) => i.slug));
    return this.items.filter((i) => !otherSlugs.has(i.slug)).map(clone);
  }

  /** items in `other` but not here. */
  itemsRemovedSince(other: Snapshot): Item[] {
    const ours = new Set(this.items.map((i) => i.slug));
    return other.items.filter((i) => !ours.has(i.slug)).map(clone);
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
