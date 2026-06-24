// Plain ASCII table renderer. Output is friendly to logs and to
// terminal multiplexers that strip ANSI - we use it as the default
// for `pantry list`, `pantry shop`, etc.

export interface TableOptions {
  pad?: string;
}

const DEFAULT_PAD = "  ";

export class Table {
  private headers: string[] = [];
  private rows: string[][] = [];
  private pad: string;

  constructor(opts: TableOptions = {}) {
    this.pad = opts.pad ?? DEFAULT_PAD;
  }

  setHeader(headers: string[]): this {
    this.headers = [...headers];
    return this;
  }

  addRow(...cells: string[]): this {
    this.rows.push([...cells]);
    return this;
  }

  /** Returns column count, taking the larger of header / longest row. */
  width(): number {
    let w = this.headers.length;
    for (const row of this.rows) {
      if (row.length > w) w = row.length;
    }
    return w;
  }

  rowCount(): number {
    return this.rows.length;
  }

  toString(): string {
    const cols = this.width();
    if (cols === 0) return "";
    const widths = new Array<number>(cols).fill(0);
    if (this.headers.length > 0) {
      for (let i = 0; i < this.headers.length; i++) {
        widths[i] = Math.max(widths[i]!, this.headers[i]!.length);
      }
    }
    for (const row of this.rows) {
      for (let i = 0; i < cols && i < row.length; i++) {
        widths[i] = Math.max(widths[i]!, (row[i] ?? "").length);
      }
    }

    const lines: string[] = [];
    if (this.headers.length > 0) {
      lines.push(this.formatRow(this.headers, widths, cols));
      const sep = widths.map((w) => "-".repeat(w));
      lines.push(this.formatRow(sep, widths, cols));
    }
    for (const row of this.rows) {
      lines.push(this.formatRow(row, widths, cols));
    }
    return lines.join("\n") + "\n";
  }

  private formatRow(row: string[], widths: number[], cols: number): string {
    const parts: string[] = new Array(cols);
    for (let i = 0; i < cols; i++) {
      const v = row[i] ?? "";
      parts[i] = v.padEnd(widths[i] ?? v.length);
    }
    return parts.join(this.pad).trimEnd();
  }
}

export function newTable(opts: TableOptions = {}): Table {
  return new Table(opts);
}
