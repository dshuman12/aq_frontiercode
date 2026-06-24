// Per-recipe JSON file storage. Mirrors core/store.ts but with the
// recipe directory.

import fs from "node:fs/promises";
import path from "node:path";
import { ensureAll, recipeDir } from "./paths.js";
import type { Recipe } from "./recipe.js";

export class RecipeNotFound extends Error {
  override readonly name = "RecipeNotFound";
  constructor(id: number) {
    super(`recipe ${id} not found`);
  }
}

let counter: number | null = null;

async function readCounter(): Promise<number> {
  if (counter !== null) return counter;
  try {
    const raw = await fs.readFile(counterFile(), "utf8");
    const n = Number.parseInt(raw.trim(), 10);
    counter = Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    counter = 0;
  }
  return counter;
}

async function writeCounter(n: number): Promise<void> {
  counter = n;
  await fs.writeFile(counterFile(), `${n}\n`, "utf8");
}

function counterFile(): string {
  return path.join(recipeDir(), ".counter");
}

function pathFor(id: number): string {
  return path.join(recipeDir(), `${String(id).padStart(5, "0")}.json`);
}

async function nextId(): Promise<number> {
  const cur = await readCounter();
  await writeCounter(cur + 1);
  return cur + 1;
}

export async function open(): Promise<void> {
  await ensureAll();
  await fs.mkdir(recipeDir(), { recursive: true });
}

export async function insert(
  partial: Omit<Recipe, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<Recipe> {
  await open();
  const id = await nextId();
  const today = new Date().toISOString().slice(0, 10);
  const r: Recipe = {
    ...partial,
    id,
    createdAt: partial.createdAt ?? today,
    updatedAt: partial.updatedAt ?? today,
  };
  validate(r);
  await write(r);
  return r;
}

export async function update(r: Recipe): Promise<void> {
  await open();
  const cur = await get(r.id);
  if (!cur) throw new RecipeNotFound(r.id);
  validate(r);
  const next = { ...r, updatedAt: new Date().toISOString().slice(0, 10) };
  await write(next);
}

export async function get(id: number): Promise<Recipe | null> {
  try {
    return JSON.parse(await fs.readFile(pathFor(id), "utf8")) as Recipe;
  } catch (err) {
    if (isENOENT(err)) return null;
    throw err;
  }
}

export async function findBySlug(slug: string): Promise<Recipe | null> {
  const items = await list();
  return items.find((r) => r.slug === slug) ?? null;
}

export async function remove(id: number): Promise<void> {
  await open();
  try {
    await fs.unlink(pathFor(id));
  } catch (err) {
    if (isENOENT(err)) throw new RecipeNotFound(id);
    throw err;
  }
}

export async function list(): Promise<Recipe[]> {
  await open();
  let entries: string[];
  try {
    entries = await fs.readdir(recipeDir());
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
  const out: Recipe[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const id = Number.parseInt(name.slice(0, -5), 10);
    if (!Number.isFinite(id)) continue;
    const r = await get(id);
    if (r) out.push(r);
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

function validate(r: Recipe): void {
  if (!r.slug) throw new Error("recipe: slug required");
  if (!r.name) throw new Error("recipe: name required");
  if (r.servings <= 0) throw new Error("recipe: servings must be > 0");
  if (!Array.isArray(r.ingredients)) {
    throw new Error("recipe: ingredients must be array");
  }
}

async function write(r: Recipe): Promise<void> {
  await fs.mkdir(recipeDir(), { recursive: true });
  const tmp = pathFor(r.id) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(r, null, 2), "utf8");
  await fs.rename(tmp, pathFor(r.id));
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}

export function _resetCounter(): void {
  counter = null;
}
