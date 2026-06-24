// Read / write newline-delimited JSON. Useful for streaming exports
// and for piping pantry data into unix tools.

export function readJSONL<T>(text: string): T[] {
  const out: T[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) continue;
    out.push(JSON.parse(line) as T);
  }
  return out;
}

export function writeJSONL<T>(items: T[]): string {
  return items.map((item) => JSON.stringify(item)).join("\n") + "\n";
}

export function countJSONL(text: string): number {
  let n = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim().length > 0) n++;
  }
  return n;
}

/** Validate that the text parses as JSONL and return error count. */
export function validateJSONL(text: string): { ok: number; errors: string[] } {
  let ok = 0;
  const errors: string[] = [];
  let line = 0;
  for (const raw of text.split(/\r?\n/)) {
    line++;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    try {
      JSON.parse(trimmed);
      ok++;
    } catch (err) {
      errors.push(`line ${line}: ${(err as Error).message}`);
    }
  }
  return { ok, errors };
}
