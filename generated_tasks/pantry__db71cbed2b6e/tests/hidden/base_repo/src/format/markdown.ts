// Tiny markdown writer for assembling reports without a dep.

export class Doc {
  private parts: string[] = [];

  h(level: number, text: string): this {
    const n = Math.min(6, Math.max(1, level));
    this.parts.push("#".repeat(n) + " " + text + "\n\n");
    return this;
  }

  p(text: string): this {
    this.parts.push(text + "\n\n");
    return this;
  }

  bullet(text: string): this {
    this.parts.push("- " + text + "\n");
    return this;
  }

  endList(): this {
    this.parts.push("\n");
    return this;
  }

  code(lang: string, body: string): this {
    this.parts.push("```" + lang + "\n" + body + "\n```\n\n");
    return this;
  }

  quote(text: string): this {
    for (const line of text.split("\n")) {
      this.parts.push("> " + line + "\n");
    }
    this.parts.push("\n");
    return this;
  }

  hr(): this {
    this.parts.push("---\n\n");
    return this;
  }

  table(headers: string[], rows: string[][]): this {
    if (headers.length === 0) return this;
    this.parts.push("| " + headers.join(" | ") + " |\n");
    this.parts.push("| " + headers.map(() => "---").join(" | ") + " |\n");
    for (const row of rows) {
      const cells = headers.map((_, i) => row[i] ?? "");
      this.parts.push("| " + cells.join(" | ") + " |\n");
    }
    this.parts.push("\n");
    return this;
  }

  raw(text: string): this {
    this.parts.push(text);
    return this;
  }

  blank(): this {
    this.parts.push("\n");
    return this;
  }

  toString(): string {
    return this.parts.join("");
  }
}

export function newDoc(): Doc {
  return new Doc();
}

/** Parse a markdown frontmatter block at the top of a string.
 *  Returns null if no frontmatter is present. */
export function readFrontmatter(text: string): {
  fields: Record<string, string>;
  body: string;
} | null {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return null;
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fields: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const c = line.indexOf(":");
    if (c < 0) continue;
    const k = line.slice(0, c).trim();
    const v = line.slice(c + 1).trim();
    if (k) fields[k] = stripQuotes(v);
  }
  return { fields, body };
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0]) {
    return s.slice(1, -1);
  }
  return s;
}
