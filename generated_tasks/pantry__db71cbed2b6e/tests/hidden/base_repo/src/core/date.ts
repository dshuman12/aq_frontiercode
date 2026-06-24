// Tiny ISO-date helpers. We use UTC strings throughout the codebase
// so there's never any TZ confusion.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isISODate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

export function plusDays(iso: string, days: number): string {
  if (!isISODate(iso)) {
    throw new Error(`date: not an ISO date: "${iso}"`);
  }
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minusDays(iso: string, days: number): string {
  return plusDays(iso, -days);
}

export function diffDays(a: string, b: string): number {
  if (!isISODate(a) || !isISODate(b)) {
    throw new Error("date: not ISO");
  }
  const ms = new Date(`${a}T00:00:00Z`).getTime() -
    new Date(`${b}T00:00:00Z`).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function startOfMonth(iso: string): string {
  if (!isISODate(iso)) throw new Error("date: not ISO");
  return iso.slice(0, 7) + "-01";
}

export function endOfMonth(iso: string): string {
  const start = startOfMonth(iso);
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(iso: string): string {
  if (!isISODate(iso)) throw new Error("date: not ISO");
  const d = new Date(`${iso}T00:00:00Z`);
  // Monday-start ISO week
  let dow = d.getUTCDay(); // 0=Sun, 1=Mon ...
  if (dow === 0) dow = 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

export function isPast(iso: string, ref?: string): boolean {
  const t = ref ?? today();
  return iso < t;
}

export function isFuture(iso: string, ref?: string): boolean {
  const t = ref ?? today();
  return iso > t;
}
