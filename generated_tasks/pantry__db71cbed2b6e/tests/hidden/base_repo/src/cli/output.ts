// Structured printers used across CLI commands.
// Centralises how we render success / warn / error lines.

import * as color from "../format/color.js";

export function ok(text: string): void {
  process.stdout.write(color.green("OK") + "  " + text + "\n");
}

export function warn(text: string): void {
  process.stderr.write(color.yellow("WARN") + " " + text + "\n");
}

export function err(text: string): void {
  process.stderr.write(color.red("ERR") + "  " + text + "\n");
}

export function info(text: string): void {
  process.stdout.write(color.dim("..") + "  " + text + "\n");
}

export function section(title: string): void {
  const bar = "=".repeat(Math.max(2, title.length + 2));
  process.stdout.write(color.bold(title) + "\n" + bar + "\n");
}

export function plain(text: string): void {
  process.stdout.write(text + "\n");
}

export function table(rows: string[][], headers?: string[]): void {
  if (rows.length === 0 && (!headers || headers.length === 0)) return;
  const widths: number[] = [];
  if (headers) {
    for (const [i, h] of headers.entries()) widths[i] = Math.max(widths[i] ?? 0, h.length);
  }
  for (const row of rows) {
    for (const [i, c] of row.entries()) widths[i] = Math.max(widths[i] ?? 0, c.length);
  }
  if (headers) {
    process.stdout.write(headers.map((h, i) => h.padEnd(widths[i] ?? h.length)).join("  ").trimEnd() + "\n");
    process.stdout.write(widths.map((w) => "-".repeat(w)).join("  ") + "\n");
  }
  for (const row of rows) {
    process.stdout.write(row.map((c, i) => c.padEnd(widths[i] ?? c.length)).join("  ").trimEnd() + "\n");
  }
}

export function bullet(items: string[]): void {
  for (const item of items) process.stdout.write("- " + item + "\n");
}

export function newline(): void {
  process.stdout.write("\n");
}
