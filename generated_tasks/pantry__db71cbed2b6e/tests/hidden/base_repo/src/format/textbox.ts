// Boxed text and column primitives.

export interface Box {
  width: number;
  body: string[];
}

export function box(text: string, width = 60): Box {
  const lines: string[] = [];
  for (const para of text.split("\n\n")) {
    lines.push(...wrap(para, width - 4));
    lines.push("");
  }
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return { width, body: lines };
}

export function render(box: Box): string {
  const inner = box.width - 2;
  const hr = "+" + "-".repeat(inner) + "+";
  const out: string[] = [hr];
  for (const line of box.body) {
    const trimmed = line.length > inner - 2 ? line.slice(0, inner - 2) : line;
    out.push(`| ${trimmed.padEnd(inner - 2)} |`);
  }
  out.push(hr);
  return out.join("\n") + "\n";
}

export function columns(left: string, right: string, sep = "  "): string {
  const ls = left.split("\n");
  const rs = right.split("\n");
  const max = Math.max(ls.length, rs.length);
  const lw = Math.max(0, ...ls.map((l) => l.length));
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const l = (ls[i] ?? "").padEnd(lw);
    const r = rs[i] ?? "";
    out.push(l + sep + r);
  }
  return out.join("\n");
}

export function wrap(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length === 0) {
      cur = w;
      continue;
    }
    if (cur.length + 1 + w.length <= width) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

export function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}

export function rightAlign(text: string, width: number): string {
  if (text.length >= width) return text;
  return " ".repeat(width - text.length) + text;
}
