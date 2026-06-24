// Programmatic builder for the search-query language.
//
// Useful for the web UI and the playlist editor: callers build a
// query as a chain of .by() / .with() calls, then print the final
// query as a single string for `pantry search`.

export class Query {
  private parts: string[] = [];

  static from(): Query {
    return new Query();
  }

  bySlug(s: string): this {
    this.parts.push(`slug:${quoteIfNeeded(s)}`);
    return this;
  }

  byCategory(c: string): this {
    this.parts.push(`category:${quoteIfNeeded(c)}`);
    return this;
  }

  byLocation(loc: string): this {
    this.parts.push(`where:${quoteIfNeeded(loc)}`);
    return this;
  }

  expiringWithin(days: number): this {
    if (days < 0) throw new Error("query: days must be >= 0");
    this.parts.push(`expiring:${days}`);
    return this;
  }

  withNotes(text: string): this {
    this.parts.push(`notes:${quoteIfNeeded(text)}`);
    return this;
  }

  bare(text: string): this {
    this.parts.push(quoteIfNeeded(text));
    return this;
  }

  build(): string {
    return this.parts.join(" ");
  }

  isEmpty(): boolean {
    return this.parts.length === 0;
  }

  reset(): this {
    this.parts = [];
    return this;
  }

  pop(): this {
    this.parts.pop();
    return this;
  }
}

function quoteIfNeeded(s: string): string {
  if (s.includes(" ") || s.includes('"')) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
