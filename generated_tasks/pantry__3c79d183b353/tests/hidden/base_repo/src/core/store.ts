// JSON-file-per-item store with atomic writes.
//
// Same approach as in the runlog repo - one .json per item under the
// items/ dir. Cheap to back up with rsync, easy to grep, no migrations.

import fs from "node:fs/promises";
import path from "node:path";
import { ensureAll, counterFile, itemDir } from "./paths.js";
import type { Item } from "./item.js";

export class StoreError extends Error {
  override readonly name = "StoreError";
}

export class NotFound extends StoreError {
  constructor(id: number) {
    super(`item ${id} not found`);
  }
}

let cachedCounter: number | null = null;

async function readCounter(): Promise<number> {
  if (cachedCounter !== null) return cachedCounter;
  try {
    const raw = await fs.readFile(counterFile(), "utf8");
    const n = Number.parseInt(raw.trim(), 10);
    cachedCounter = Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    cachedCounter = 0;
  }
  return cachedCounter;
}

async function writeCounter(n: number): Promise<void> {
  cachedCounter = n;
  await atomicWrite(counterFile(), `${n}\n`);
}

async function nextId(): Promise<number> {
  const cur = await readCounter();
  const next = cur + 1;
  await writeCounter(next);
  return next;
}

function pathFor(id: number): string {
  return path.join(itemDir(), `${String(id).padStart(5, "0")}.json`);
}

export async function open(): Promise<void> {
  await ensureAll();
  await fs.mkdir(itemDir(), { recursive: true });
}

export async function insert(
  partial: Omit<Item, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<Item> {
  await open();
  const id = await nextId();
  const now = isoToday();
  const item: Item = {
    ...partial,
    id,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
  validate(item);
  await write(item);
  return item;
}

export async function update(item: Item): Promise<void> {
  await open();
  const cur = await get(item.id);
  if (!cur) throw new NotFound(item.id);
  validate(item);
  const next: Item = { ...item, updatedAt: isoToday() };
  await write(next);
}

export async function get(id: number): Promise<Item | null> {
  try {
    const raw = await fs.readFile(pathFor(id), "utf8");
    return JSON.parse(raw) as Item;
  } catch (err) {
    if (isENOENT(err)) return null;
    throw err;
  }
}

export async function remove(id: number): Promise<void> {
  await open();
  try {
    await fs.unlink(pathFor(id));
  } catch (err) {
    if (isENOENT(err)) throw new NotFound(id);
    throw err;
  }
}

export async function list(): Promise<Item[]> {
  await open();
  let entries: string[];
  try {
    entries = await fs.readdir(itemDir());
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
  const out: Item[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const idStr = name.slice(0, -5);
    const id = Number.parseInt(idStr, 10);
    if (!Number.isFinite(id)) continue;
    const item = await get(id);
    if (item) out.push(item);
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

export async function findBySlug(slug: string): Promise<Item | null> {
  const items = await list();
  return items.find((i) => i.slug === slug) ?? null;
}

function validate(item: Item): void {
  if (!item.slug) throw new StoreError("item: slug required");
  if (!item.name) throw new StoreError("item: name required");
  if (!Array.isArray(item.lots)) throw new StoreError("item: lots must be array");
  for (const lot of item.lots) {
    if (typeof lot.id !== "number" || lot.id <= 0) {
      throw new StoreError("lot: id must be positive integer");
    }
    if (lot.qty.value < 0) {
      throw new StoreError("lot: qty must be non-negative");
    }
  }
}

async function write(item: Item): Promise<void> {
  await atomicWrite(pathFor(item.id), JSON.stringify(item, null, 2));
}

async function atomicWrite(p: string, body: string): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, p);
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** For tests only. Resets the in-memory ID counter. */
export function _resetCounterCache(): void {
  cachedCounter = null;
}
