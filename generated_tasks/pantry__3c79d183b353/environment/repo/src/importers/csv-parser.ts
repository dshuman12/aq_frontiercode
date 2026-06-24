// Tiny standards-compliant-ish CSV reader. Single quotes for strings.
// Handles quoted commas, escaped quotes, and BOM at the start of file.
//
// We deliberately don't support multiline quoted fields - none of our
// importers need them and supporting them complicates the state machine.

export interface CSVRow {
  values: string[];
  /** 1-based line number for error messages. */
  line: number;
}

export function parseCSV(text: string): CSVRow[] {
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  const rows: CSVRow[] = [];
  let line = 0;
  for (const raw of text.split(/\r?\n/)) {
    line++;
    if (raw.length === 0) continue;
    rows.push({ values: parseRow(raw, line), line });
  }
  return rows;
}

function parseRow(raw: string, line: number): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '"') {
      let end = i + 1;
      let value = "";
      while (end < raw.length) {
        const ch = raw[end];
        if (ch === '"') {
          if (raw[end + 1] === '"') {
            value += '"';
            end += 2;
            continue;
          }
          break;
        }
        value += ch;
        end++;
      }
      if (end >= raw.length) {
        throw new Error(`csv: line ${line}: unterminated quoted field`);
      }
      out.push(value);
      i = end + 1;
      if (raw[i] === ",") i++;
      continue;
    }
    let end = i;
    while (end < raw.length && raw[end] !== ",") end++;
    out.push(raw.slice(i, end));
    i = end;
    if (raw[i] === ",") i++;
  }
  // Trailing comma -> implicit empty cell.
  if (raw.endsWith(",")) out.push("");
  return out;
}

/** Map header-name to column index (case-insensitive). */
export function headerIndex(header: string[]): Map<string, number> {
  const m = new Map<string, number>();
  header.forEach((h, i) => m.set(h.toLowerCase().trim(), i));
  return m;
}

/** Helper: write a row of values out as CSV-encoded line. */
export function encodeRow(values: string[]): string {
  return values.map(encodeCell).join(",");
}

function encodeCell(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
