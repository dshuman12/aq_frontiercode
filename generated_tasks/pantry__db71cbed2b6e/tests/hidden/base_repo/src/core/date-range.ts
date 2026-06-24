// Date-range iteration helpers. Useful for "for each day in this
// month, do X".

import { isISODate, plusDays } from "./date.js";

export function* days(from: string, to: string): Generator<string> {
  if (!isISODate(from) || !isISODate(to)) {
    throw new Error(`date-range: not ISO: ${from} ${to}`);
  }
  if (from > to) return;
  let cur = from;
  while (cur <= to) {
    yield cur;
    cur = plusDays(cur, 1);
  }
}

export function listDays(from: string, to: string): string[] {
  return [...days(from, to)];
}

export function daysInMonth(yyyymm: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(yyyymm)) {
    throw new Error("date-range: yyyymm must be YYYY-MM");
  }
  const start = `${yyyymm}-01`;
  const next = plusDays(start, 31);
  // Trim back to the actual end of the month
  const startNext = plusMonths(start, 1);
  const end = plusDays(startNext, -1);
  return listDays(start, end);
}

function plusMonths(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function* weeks(from: string, to: string): Generator<string> {
  if (!isISODate(from) || !isISODate(to)) {
    throw new Error("date-range: not ISO");
  }
  let cur = from;
  while (cur <= to) {
    yield cur;
    cur = plusDays(cur, 7);
  }
}

export function listWeeks(from: string, to: string): string[] {
  return [...weeks(from, to)];
}

export function* months(fromYM: string, toYM: string): Generator<string> {
  if (!/^\d{4}-\d{2}$/.test(fromYM) || !/^\d{4}-\d{2}$/.test(toYM)) {
    throw new Error("date-range: yyyymm form required");
  }
  let cur = fromYM;
  while (cur <= toYM) {
    yield cur;
    cur = plusYearMonth(cur, 1);
  }
}

function plusYearMonth(yyyymm: string, n: number): string {
  const start = `${yyyymm}-01`;
  return plusMonths(start, n).slice(0, 7);
}
