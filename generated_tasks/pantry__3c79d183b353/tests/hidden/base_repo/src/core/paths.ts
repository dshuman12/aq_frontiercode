// File-system locations. Honors XDG vars + PANTRY_* overrides so
// containers and tests can redirect them.

import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

const APP = "pantry";

export function dataDir(): string {
  if (process.env.PANTRY_DATA_DIR) return process.env.PANTRY_DATA_DIR;
  if (process.env.XDG_DATA_HOME) {
    return path.join(process.env.XDG_DATA_HOME, APP);
  }
  return path.join(os.homedir(), ".local", "share", APP);
}

export function configDir(): string {
  if (process.env.PANTRY_CONFIG_DIR) return process.env.PANTRY_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, APP);
  }
  return path.join(os.homedir(), ".config", APP);
}

export function cacheDir(): string {
  if (process.env.PANTRY_CACHE_DIR) return process.env.PANTRY_CACHE_DIR;
  if (process.env.XDG_CACHE_HOME) {
    return path.join(process.env.XDG_CACHE_HOME, APP);
  }
  return path.join(os.homedir(), ".cache", APP);
}

export function itemDir(): string {
  return path.join(dataDir(), "items");
}

export function recipeDir(): string {
  return path.join(dataDir(), "recipes");
}

export function counterFile(): string {
  return path.join(dataDir(), "counter");
}

export function configFile(): string {
  return path.join(configDir(), "config.json");
}

export async function ensureAll(): Promise<void> {
  for (const d of [dataDir(), configDir(), cacheDir()]) {
    await fs.mkdir(d, { recursive: true });
  }
}
