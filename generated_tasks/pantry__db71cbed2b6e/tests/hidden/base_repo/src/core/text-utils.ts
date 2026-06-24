// String / text utility functions used in many places.

export function titleKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .trim();
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCase(s: string): string {
  const small = new Set(["a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "by", "with"]);
  const words = s.split(/\s+/);
  return words.map((w, i) => {
    if (i > 0 && small.has(w.toLowerCase())) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

export function oxfordJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural ?? singular + "s"}`;
}

export function truncate(s: string, max: number, ellipsis = "..."): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - ellipsis.length)) + ellipsis;
}

export function indent(s: string, prefix: string): string {
  return s.split("\n").map((l) => l.length > 0 ? prefix + l : l).join("\n");
}

export function dedent(s: string): string {
  const lines = s.split("\n");
  let min = Number.POSITIVE_INFINITY;
  for (const l of lines) {
    if (l.trim() === "") continue;
    const m = /^( *)/.exec(l);
    const len = m ? m[1]!.length : 0;
    if (len < min) min = len;
  }
  if (!Number.isFinite(min)) return s;
  return lines.map((l) => l.slice(min)).join("\n");
}

export function parseHumanDuration(s: string): number {
  const text = s.toLowerCase().trim();
  let total = 0;
  const re = /(\d+)\s*(h|m|s|hour|hours|min|mins|minute|minutes|sec|secs|second|seconds)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number.parseInt(m[1]!, 10);
    const unit = m[2]!;
    if (unit.startsWith("h")) total += n * 60;
    else if (unit.startsWith("m")) total += n;
    else total += n / 60;
  }
  if (total === 0 && /^\d+$/.test(text)) return Number.parseInt(text, 10);
  return total;
}

export function formatMinutes(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}
