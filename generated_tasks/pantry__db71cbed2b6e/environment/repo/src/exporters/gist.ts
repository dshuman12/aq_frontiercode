// Export the pantry as a "GitHub Gist"-shaped JSON. Useful for the
// "share my pantry as a snapshot" feature.

import type { Item } from "../core/item.js";

export interface GistFile {
  filename: string;
  content: string;
}

export interface Gist {
  description: string;
  files: GistFile[];
  public: boolean;
}

export function build(
  items: Item[],
  description = "pantry snapshot",
): Gist {
  const inventory = items.map((item) => ({
    slug: item.slug,
    name: item.name,
    category: item.category ?? "(none)",
    lots: item.lots.length,
    totalValue: item.lots.reduce((acc, l) => acc + l.qty.value, 0),
  }));
  return {
    description,
    files: [
      {
        filename: "pantry.json",
        content: JSON.stringify({ generatedAt: today(), items }, null, 2),
      },
      {
        filename: "summary.md",
        content: renderSummary(inventory),
      },
    ],
    public: false,
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function renderSummary(inv: ReturnType<typeof build>["files"][number] extends never
  ? never
  : Array<{ slug: string; name: string; category: string; lots: number; totalValue: number }>): string {
  const byCat = new Map<string, number>();
  for (const i of inv) byCat.set(i.category, (byCat.get(i.category) ?? 0) + 1);
  const lines: string[] = ["# pantry summary", ""];
  for (const [cat, n] of [...byCat.entries()].sort()) {
    lines.push(`- ${cat}: ${n}`);
  }
  return lines.join("\n") + "\n";
}

export function asJSON(g: Gist): string {
  return JSON.stringify(g, null, 2);
}
