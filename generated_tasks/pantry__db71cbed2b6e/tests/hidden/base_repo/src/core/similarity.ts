// Cosine similarity between recipes based on ingredient overlap.

import type { Recipe } from "./recipe.js";

export function similarity(a: Recipe, b: Recipe): number {
  const va = bagOfWords(a);
  const vb = bagOfWords(b);
  return cosine(va, vb);
}

export function findSimilar(
  target: Recipe,
  others: Recipe[],
  n: number,
): Array<{ slug: string; score: number }> {
  const out = others
    .filter((r) => r.slug !== target.slug)
    .map((r) => ({ slug: r.slug, score: similarity(target, r) }));
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, Math.max(0, n));
}

function bagOfWords(r: Recipe): Map<string, number> {
  const out = new Map<string, number>();
  for (const ing of r.ingredients) {
    out.set(ing.slug, (out.get(ing.slug) ?? 0) + 1);
  }
  return out;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb !== undefined) dot += va * vb;
  }
  const na = magnitude(a);
  const nb = magnitude(b);
  if (na === 0 || nb === 0) return 0;
  return dot / (na * nb);
}

function magnitude(m: Map<string, number>): number {
  let s = 0;
  for (const v of m.values()) s += v * v;
  return Math.sqrt(s);
}

export function buildClusters(recipes: Recipe[], threshold = 0.5): string[][] {
  const seen = new Set<string>();
  const clusters: string[][] = [];
  for (const r of recipes) {
    if (seen.has(r.slug)) continue;
    const group = [r.slug];
    seen.add(r.slug);
    for (const other of recipes) {
      if (seen.has(other.slug)) continue;
      if (similarity(r, other) >= threshold) {
        group.push(other.slug);
        seen.add(other.slug);
      }
    }
    clusters.push(group);
  }
  return clusters;
}
