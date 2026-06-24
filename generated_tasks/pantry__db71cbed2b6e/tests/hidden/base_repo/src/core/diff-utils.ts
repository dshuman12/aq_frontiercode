// Tiny line + word diff helpers. Used by the audit log when showing
// "the recipe used to be X, now Y".

export interface DiffLine {
  kind: "+" | "-" | " ";
  text: string;
}

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const matrix = lcsMatrix(a, b);
  const out: DiffLine[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.unshift({ kind: " ", text: a[i - 1]! });
      i--; j--;
    } else if (j > 0 && (i === 0 || matrix[i]![j - 1]! >= matrix[i - 1]![j]!)) {
      out.unshift({ kind: "+", text: b[j - 1]! });
      j--;
    } else {
      out.unshift({ kind: "-", text: a[i - 1]! });
      i--;
    }
  }
  return out;
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = Array.from(
    { length: a.length + 1 },
    () => new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        m[i]![j] = m[i - 1]![j - 1]! + 1;
      } else {
        m[i]![j] = Math.max(m[i - 1]![j]!, m[i]![j - 1]!);
      }
    }
  }
  return m;
}

export function format(d: DiffLine[]): string {
  return d.map((l) => l.kind + " " + l.text).join("\n") + "\n";
}

export function added(d: DiffLine[]): string[] {
  return d.filter((l) => l.kind === "+").map((l) => l.text);
}

export function removed(d: DiffLine[]): string[] {
  return d.filter((l) => l.kind === "-").map((l) => l.text);
}

export function unified(before: string, after: string, contextLines = 3): string {
  const d = lineDiff(before, after);
  const out: DiffLine[] = [];
  for (let i = 0; i < d.length; i++) {
    const l = d[i]!;
    if (l.kind === " ") {
      const before = d.slice(Math.max(0, i - contextLines), i);
      const after = d.slice(i + 1, i + 1 + contextLines);
      const adjacentChange = before.some((x) => x.kind !== " ") ||
        after.some((x) => x.kind !== " ");
      if (adjacentChange) out.push(l);
    } else {
      out.push(l);
    }
  }
  return format(out);
}
