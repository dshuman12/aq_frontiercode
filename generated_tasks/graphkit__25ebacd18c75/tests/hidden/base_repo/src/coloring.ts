import { Graph } from './graph';
import { NodeId, ColoringResult } from './types';
import { isBipartite } from './components';

export function greedyColoring(g: Graph, order?: NodeId[]): ColoringResult {
  const nodeOrder = order ?? g.nodeIds(); const coloring = new Map<NodeId, number>();
  for (const u of nodeOrder) {
    const nbColors = new Set(g.neighbors(u).map(v => coloring.get(v)).filter(c => c !== undefined) as number[]);
    let c = 0; while (nbColors.has(c)) c++; coloring.set(u, c);
  }
  const cn = coloring.size > 0 ? Math.max(...coloring.values()) + 1 : 0;
  return { coloring, chromaticNumber: cn, isValid: validateColoring(g, coloring) };
}

export function dsaturColoring(g: Graph): ColoringResult {
  const coloring = new Map<NodeId, number>(); const sat = new Map(g.nodeIds().map(id => [id, 0])); const deg = new Map(g.nodeIds().map(id => [id, g.degree(id)]));
  const uncolored = new Set(g.nodeIds());
  while (uncolored.size > 0) {
    let ms = -1, md = -1, chosen: NodeId | null = null;
    for (const u of uncolored) { const s = sat.get(u)!, d = deg.get(u)!; if (s > ms || (s === ms && d > md)) { ms = s; md = d; chosen = u; } }
    if (!chosen) break; uncolored.delete(chosen);
    const nbColors = new Set(g.neighbors(chosen).map(v => coloring.get(v)).filter(c => c !== undefined) as number[]);
    let c = 0; while (nbColors.has(c)) c++; coloring.set(chosen, c);
    for (const v of g.neighbors(chosen)) if (uncolored.has(v)) sat.set(v, new Set(g.neighbors(v).map(n => coloring.get(n)).filter(c => c !== undefined) as number[]).size);
  }
  return { coloring, chromaticNumber: coloring.size > 0 ? Math.max(...coloring.values()) + 1 : 0, isValid: validateColoring(g, coloring) };
}

export function backtrackingColoring(g: Graph, maxColors?: number): ColoringResult | null {
  const ids = g.nodeIds(); const n = ids.length; const idxOf = new Map(ids.map((id, i) => [id, i]));
  const colors = new Array<number>(n).fill(-1); const kMax = maxColors ?? n;
  const isSafe = (idx: number, c: number): boolean => { for (const nb of g.neighbors(ids[idx])) { const ni = idxOf.get(nb)!; if (colors[ni] === c) return false; } return true; };
  const solve = (idx: number): boolean => { if (idx === n) return true; for (let c = 0; c < kMax; c++) { if (isSafe(idx, c)) { colors[idx] = c; if (solve(idx + 1)) return true; colors[idx] = -1; } } return false; };
  if (!solve(0)) return null;
  const coloring = new Map(ids.map((id, i) => [id, colors[i]]));
  return { coloring, chromaticNumber: Math.max(...colors) + 1, isValid: true };
}

export function twoColorBipartite(g: Graph): ColoringResult | null {
  const r = isBipartite(g); if (!r.bipartite) return null;
  const [p0, p1] = r.partition!; const coloring = new Map<NodeId, number>();
  for (const id of p0) coloring.set(id, 0); for (const id of p1) coloring.set(id, 1);
  return { coloring, chromaticNumber: 2, isValid: true };
}

export function validateColoring(g: Graph, coloring: Map<NodeId, number>): boolean {
  for (const e of g.edges()) { const cu = coloring.get(e.source), cv = coloring.get(e.target); if (cu === undefined || cv === undefined || cu === cv) return false; }
  return true;
}

