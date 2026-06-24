// Per-user config persisted at <configDir>/config.json.

import fs from "node:fs/promises";
import path from "node:path";
import { configDir, configFile } from "./paths.js";

export interface Config {
  /** Default location for new lots. */
  defaultLocation?: string;
  /** Window in days for `pantry expiring`. */
  expiringWindowDays?: number;
  /** Editor for `pantry edit`. */
  editor?: string;
  /** Whether to suppress ANSI colors regardless of TERM. */
  noColor?: boolean;
  /** Free-form profile / household name. */
  household?: string;
}

export function defaults(): Config {
  return { defaultLocation: "pantry", expiringWindowDays: 7 };
}

export async function load(): Promise<Config> {
  try {
    const raw = await fs.readFile(configFile(), "utf8");
    const c = JSON.parse(raw) as Config;
    return { ...defaults(), ...c };
  } catch (err) {
    if (isENOENT(err)) return defaults();
    throw err;
  }
}

export async function save(c: Config): Promise<void> {
  validate(c);
  await fs.mkdir(configDir(), { recursive: true });
  const tmp = configFile() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(c, null, 2), "utf8");
  await fs.rename(tmp, configFile());
}

export async function set(field: string, value: string): Promise<void> {
  const c = await load();
  switch (field) {
    case "default_location":
      c.defaultLocation = value;
      break;
    case "expiring_window_days": {
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("expiring_window_days must be a non-negative integer");
      }
      c.expiringWindowDays = n;
      break;
    }
    case "editor":
      c.editor = value;
      break;
    case "no_color":
      c.noColor = value === "true" || value === "1" || value === "yes";
      break;
    case "household":
      c.household = value;
      break;
    default:
      throw new Error(`config: unknown field ${field}`);
  }
  await save(c);
}

export function validate(c: Config): void {
  if (c.expiringWindowDays !== undefined &&
      (!Number.isFinite(c.expiringWindowDays) || c.expiringWindowDays < 0)) {
    throw new Error("config: expiringWindowDays must be a non-negative integer");
  }
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}

void path;
