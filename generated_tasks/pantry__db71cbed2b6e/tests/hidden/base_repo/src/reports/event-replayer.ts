// Replay events back through the store to "rebuild" what the pantry
// looked like at a given timestamp. Useful for time-travel debugging.

import type { Item, Lot } from "../core/item.js";
import type { Event } from "../core/event.js";

export interface ReplayState {
  items: Map<string, Item>;
}

export function emptyState(): ReplayState {
  return { items: new Map() };
}

export function applyEvent(state: ReplayState, event: Event): ReplayState {
  if (!event.itemSlug) return state;
  const slug = event.itemSlug;
  const items = new Map(state.items);
  const cur = items.get(slug);
  switch (event.kind) {
    case "item.add":
      if (!cur) {
        items.set(slug, {
          id: 0, slug, name: slug, lots: [],
          createdAt: event.at, updatedAt: event.at,
        });
      }
      break;
    case "item.remove":
      items.delete(slug);
      break;
    case "lot.add":
      if (cur) {
        const next: Item = { ...cur, lots: [...cur.lots] };
        next.lots.push({
          id: event.lotId ?? next.lots.length + 1,
          qty: { value: 1, kind: "count" },
          addedAt: event.at,
          where: "pantry",
        });
        items.set(slug, next);
      }
      break;
    case "lot.discard":
      if (cur && event.lotId !== undefined) {
        const next: Item = {
          ...cur, lots: cur.lots.filter((l) => l.id !== event.lotId),
        };
        items.set(slug, next);
      }
      break;
  }
  return { items };
}

export function replayUntil(events: Event[], at: string): ReplayState {
  let state = emptyState();
  for (const e of events) {
    if (e.at > at) break;
    state = applyEvent(state, e);
  }
  return state;
}

export function asArray(state: ReplayState): Item[] {
  return [...state.items.values()];
}

export function summary(state: ReplayState): string {
  const items = asArray(state);
  let lots = 0;
  for (const i of items) lots += i.lots.length;
  return `${items.length} items, ${lots} lots`;
}

export function tracesBetween(
  events: Event[],
  startAt: string,
  endAt: string,
): Event[] {
  return events.filter((e) => e.at >= startAt && e.at <= endAt);
}
