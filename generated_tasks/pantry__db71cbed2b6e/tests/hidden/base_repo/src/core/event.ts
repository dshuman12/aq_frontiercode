// Append-only change log: every add/use/edit/remove gets a JSONL line.
// Useful for auditing "where did that lot go?" and a future undo.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "./paths.js";

export type EventKind =
  | "item.add"
  | "item.update"
  | "item.remove"
  | "lot.add"
  | "lot.use"
  | "lot.discard"
  | "recipe.add"
  | "recipe.update"
  | "recipe.remove"
  | "import"
  | "export";

export interface Event {
  at: string; // ISO datetime
  kind: EventKind;
  itemId?: number;
  itemSlug?: string;
  lotId?: number;
  detail?: string;
}

const FILE = "events.jsonl";

export function file(): string {
  return path.join(dataDir(), FILE);
}

export async function append(e: Omit<Event, "at"> & { at?: string }): Promise<void> {
  validate(e);
  await ensureAll();
  const event: Event = {
    at: e.at ?? new Date().toISOString(),
    kind: e.kind,
    ...(e.itemId !== undefined ? { itemId: e.itemId } : {}),
    ...(e.itemSlug !== undefined ? { itemSlug: e.itemSlug } : {}),
    ...(e.lotId !== undefined ? { lotId: e.lotId } : {}),
    ...(e.detail !== undefined ? { detail: e.detail } : {}),
  };
  await fs.appendFile(file(), JSON.stringify(event) + "\n", "utf8");
}

export async function readAll(): Promise<Event[]> {
  try {
    const text = await fs.readFile(file(), "utf8");
    const out: Event[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (trimmed.length === 0) continue;
      out.push(JSON.parse(trimmed) as Event);
    }
    return out;
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
}

export async function lastN(n: number): Promise<Event[]> {
  const all = await readAll();
  return all.slice(-n);
}

export function filterKind(events: Event[], kind: EventKind): Event[] {
  return events.filter((e) => e.kind === kind);
}

export function countByKind(events: Event[]): Map<EventKind, number> {
  const out = new Map<EventKind, number>();
  for (const e of events) {
    out.set(e.kind, (out.get(e.kind) ?? 0) + 1);
  }
  return out;
}

export function pretty(e: Event): string {
  const bits: string[] = [e.at, e.kind];
  if (e.itemSlug !== undefined) bits.push(`item=${e.itemSlug}`);
  if (e.lotId !== undefined) bits.push(`lot=${e.lotId}`);
  if (e.detail !== undefined) bits.push(`(${e.detail})`);
  return bits.join("  ");
}

export async function _truncate(): Promise<void> {
  await ensureAll();
  await fs.writeFile(file(), "", "utf8");
}

function validate(e: Omit<Event, "at"> & { at?: string }): void {
  if (!e.kind) throw new Error("event: kind required");
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
