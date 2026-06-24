// Look up tokens / API keys from env vars or the config file.
// Never logs the value, only its origin.

export interface Source {
  name: string;
  value: string;
  origin: string;
}

export type Getter = (field: string) => string | null;

export function fromEnv(name: string): string | null {
  const v = process.env[name];
  if (!v || !v.trim()) return null;
  return v.trim();
}

export function fromConfig(getter: Getter, field: string): string | null {
  const v = getter(field);
  if (!v || !v.trim()) return null;
  return v.trim();
}

/** Resolve a field, trying config first, then RUNLOG_<UPPER> env var. */
export function find(field: string, getters: Getter[]): Source | null {
  for (const g of getters) {
    const v = g(field);
    if (v && v.trim()) {
      return { name: field, value: v.trim(), origin: "config" };
    }
  }
  const env = fromEnv(envName(field));
  if (env) return { name: field, value: env, origin: `env:${envName(field)}` };
  return null;
}

export function envName(field: string): string {
  return `PANTRY_${field.toUpperCase().replace(/-/g, "_")}`;
}

export function mask(v: string): string {
  if (v.length <= 4) return "*".repeat(v.length);
  return v.slice(0, 4) + "...";
}

export function redact(v: string): string {
  return "*".repeat(v.length);
}

export function has(field: string, getters: Getter[]): boolean {
  return find(field, getters) !== null;
}
