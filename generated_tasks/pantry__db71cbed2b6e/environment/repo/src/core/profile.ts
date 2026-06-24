// Household profile: per-slug "always-stock" minimums, dietary tags,
// and household-size scalar so recipe scaling is automatic.

import fs from "node:fs/promises";
import path from "node:path";
import { configDir, ensureAll } from "./paths.js";

export interface AlwaysStock {
  slug: string;
  minQty: number;
  unitKind: "mass" | "volume" | "count";
}

export interface Profile {
  householdName?: string;
  householdSize: number;
  diet: string[];
  alwaysStock: AlwaysStock[];
}

export function defaults(): Profile {
  return {
    householdName: "Household",
    householdSize: 2,
    diet: [],
    alwaysStock: [],
  };
}

export function file(): string {
  return path.join(configDir(), "profile.json");
}

export async function load(): Promise<Profile> {
  try {
    const raw = await fs.readFile(file(), "utf8");
    const p = JSON.parse(raw) as Partial<Profile>;
    return { ...defaults(), ...p };
  } catch (err) {
    if (isENOENT(err)) return defaults();
    throw err;
  }
}

export async function save(p: Profile): Promise<void> {
  validate(p);
  await ensureAll();
  const tmp = file() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(p, null, 2), "utf8");
  await fs.rename(tmp, file());
}

export function validate(p: Profile): void {
  if (p.householdSize <= 0) throw new Error("profile: householdSize must be > 0");
  if (!Number.isFinite(p.householdSize)) {
    throw new Error("profile: householdSize must be finite");
  }
  if (!Array.isArray(p.diet)) throw new Error("profile: diet must be array");
  if (!Array.isArray(p.alwaysStock)) {
    throw new Error("profile: alwaysStock must be array");
  }
  for (const s of p.alwaysStock) {
    if (!s.slug) throw new Error("profile: alwaysStock entry missing slug");
    if (s.minQty < 0) throw new Error("profile: minQty must be >= 0");
    if (!["mass", "volume", "count"].includes(s.unitKind)) {
      throw new Error("profile: bad unitKind");
    }
  }
}

export async function setHouseholdSize(n: number): Promise<void> {
  const p = await load();
  p.householdSize = n;
  await save(p);
}

export async function addAlwaysStock(s: AlwaysStock): Promise<void> {
  const p = await load();
  const existing = p.alwaysStock.findIndex((x) => x.slug === s.slug);
  if (existing >= 0) p.alwaysStock[existing] = s;
  else p.alwaysStock.push(s);
  await save(p);
}

export async function removeAlwaysStock(slug: string): Promise<boolean> {
  const p = await load();
  const before = p.alwaysStock.length;
  p.alwaysStock = p.alwaysStock.filter((x) => x.slug !== slug);
  await save(p);
  return p.alwaysStock.length < before;
}

export async function addDiet(tag: string): Promise<void> {
  const p = await load();
  if (!p.diet.includes(tag)) p.diet.push(tag);
  await save(p);
}

export function recipeScale(p: Profile): number {
  return p.householdSize / 2;
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
