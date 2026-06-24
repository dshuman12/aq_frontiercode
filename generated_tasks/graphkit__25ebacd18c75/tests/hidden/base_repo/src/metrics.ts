import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId, INFINITY } from './types';
import { dijkstra } from './shortest_path';

type AnyGraph = Graph | DiGraph;

export function degreeCentrality(g: AnyGraph): Map<NodeId, number> {
  const n = g.nodeCount(); if (n <= 1) return new Map(g.nodeIds().map(id => [id, 0]));
  return new Map(g.nodeIds().map(id => [id, g.degree(id) / (n - 1)]));
}

export function closenessCentrality(g: Graph): Map<NodeId, number> {
  const n = g.nodeCount(); const result = new Map<NodeId, number>();
  for (const id of g.nodeIds()) {
    const { distances } = dijkstra(g, id); let total = 0, reach = 0;
    for (const [nid, d] of distances) { if (nid !== id && d < INFINITY) { total += d; reach++; } }
    result.set(id, reach === 0 ? 0 : (reach / total) * (reach / (n - 1)));
  }
  return result;
}

export function betweennessCentrality(g: Graph, normalized = true): Map<NodeId, number> {
  const ids = g.nodeIds(); const btw = new Map(ids.map(id => [id, 0]));
  for (const s of ids) {
    const stack: NodeId[] = []; const pred = new Map(ids.map(id => [id, [] as NodeId[]]));
    const sigma = new Map(ids.map(id => [id, 0])); const dist = new Map(ids.map(id => [id, -1]));
    sigma.set(s, 1); dist.set(s, 0); const queue: NodeId[] = [s];
    while (queue.length > 0) {
      const v = queue.shift()!; stack.push(v);
      for (const w of g.neighbors(v)) {
        if (dist.get(w) === -1) { queue.push(w); dist.set(w, dist.get(v)! + 1); }
        if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); pred.get(w)!.push(v); }
      }
    }
    const delta = new Map(ids.map(id => [id, 0]));
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      if (w !== s) btw.set(w, btw.get(w)! + delta.get(w)!);
    }
  }
  if (normalized) { const n = g.nodeCount(); const f = n > 2 ? 2 / ((n - 1) * (n - 2)) : 1; for (const [id, v] of btw) btw.set(id, v * f); }
  return btw;
}

export function clusteringCoefficient(g: Graph): Map<NodeId, number> {
  const result = new Map<NodeId, number>();
  for (const u of g.nodeIds()) {
    const nbs = g.neighbors(u); const k = nbs.length; if (k < 2) { result.set(u, 0); continue; }
    let tri = 0; for (let i = 0; i < nbs.length; i++) for (let j = i + 1; j < nbs.length; j++) if (g.hasEdge(nbs[i], nbs[j])) tri++;
    result.set(u, (2 * tri) / (k * (k - 1)));
  }
  return result;
}

export function pageRank(g: DiGraph, d = 0.85, maxIter = 100, tol = 1e-6): Map<NodeId, number> {
  const ids = g.nodeIds(); const n = ids.length; if (n === 0) return new Map();
  let rank = new Map(ids.map(id => [id, 1 / n]));
  for (let iter = 0; iter < maxIter; iter++) {
    let dangling = 0; for (const id of ids) if (g.outDegree(id) === 0) dangling += rank.get(id)!;
    const nr = new Map<NodeId, number>();
    for (const id of ids) {
      let inc = 0; for (const p of g.predecessors(id)) { const od = g.outDegree(p); if (od > 0) inc += rank.get(p)! / od; }
      nr.set(id, (1 - d) / n + d * (inc + dangling / n));
    }
    let diff = 0; for (const id of ids) diff += Math.abs(nr.get(id)! - rank.get(id)!);
    rank = nr; if (diff < tol) break;
  }
  return rank;
}

export function diameter(g: Graph): number {
  let max = 0;
  for (const id of g.nodeIds()) { const { distances } = dijkstra(g, id); for (const d of distances.values()) if (d < INFINITY) max = Math.max(max, d); }
  return max;
}

export function radius(g: Graph): number {
  let minEcc = INFINITY;
  for (const id of g.nodeIds()) { const { distances } = dijkstra(g, id); let ecc = 0; for (const d of distances.values()) if (d < INFINITY) ecc = Math.max(ecc, d); minEcc = Math.min(minEcc, ecc); }
  return minEcc === INFINITY ? 0 : minEcc;
}

