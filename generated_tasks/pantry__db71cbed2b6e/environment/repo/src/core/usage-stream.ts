// Live tail consumer of the change log: walk events from a starting
// position and yield each one. Designed to support `pantry log -f`.

import type { Event } from "./event.js";
import { readAll } from "./event.js";

export interface Position {
  count: number;
}

export async function consume(
  position: Position,
): Promise<{ events: Event[]; nextPosition: Position }> {
  const all = await readAll();
  const fresh = all.slice(position.count);
  return { events: fresh, nextPosition: { count: all.length } };
}

export function startPosition(): Position {
  return { count: 0 };
}

export interface ConsumerOptions {
  intervalMs?: number;
  maxIterations?: number;
}

/** Repeatedly poll the log every intervalMs and call onEvent for new
 *  entries. Resolves after maxIterations polls. */
export async function pollLoop(
  startAt: Position,
  onEvent: (e: Event) => void,
  opts: ConsumerOptions = {},
): Promise<Position> {
  const interval = opts.intervalMs ?? 250;
  const max = opts.maxIterations ?? 1;
  let pos = startAt;
  for (let i = 0; i < max; i++) {
    const { events, nextPosition } = await consume(pos);
    for (const e of events) onEvent(e);
    pos = nextPosition;
    if (i < max - 1) await sleep(interval);
  }
  return pos;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function summary(events: Event[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
}
