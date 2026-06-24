import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId, ShortestPathResult, AllPairsResult, HeuristicFn, WeightFn, DEFAULT_WEIGHT, INFINITY } from './types';
import { NodeNotFoundError, NegativeCycleError } from './errors';

type AnyGraph = Graph | DiGraph;
function nbrs(g: AnyGraph, id: NodeId): NodeId[] { return g instanceof DiGraph ? g.successors(id) : g.neighbors(id); }
function buildPath(pred: Map<NodeId, NodeId | null>, target: NodeId): NodeId[] {
  const p: NodeId[] = []; let c: NodeId | null = target;
  while (c !== null) { p.push(c); c = pred.get(c) ?? null; }
  return p.reverse();
}

class MinHeap {
  private h: [number, NodeId][] = [];
  push(p: number, id: NodeId): void { this.h.push([p, id]); this._up(this.h.length - 1); }
  pop(): [number, NodeId] | null {
    if (this.h.length === 0) return null;
    const min = this.h[0]; const last = this.h.pop()!;
    if (this.h.length > 0) { this.h[0] = last; this._down(0); }
    return min;
  }
  size(): number { return this.h.length; }
  private _up(i: number): void { while (i > 0) { const p = Math.floor((i - 1) / 2); if (this.h[p][0] <= this.h[i][0]) break; [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p; } }
  private _down(i: number): void { const n = this.h.length; while (true) { let m = i; const l = 2*i+1, r = 2*i+2; if (l < n && this.h[l][0] < this.h[m][0]) m = l; if (r < n && this.h[r][0] < this.h[m][0]) m = r; if (m === i) break; [this.h[m], this.h[i]] = [this.h[i], this.h[m]]; i = m; } }
}

export function dijkstra(g: AnyGraph, source: NodeId, wFn: WeightFn = DEFAULT_WEIGHT): ShortestPathResult {
  if (!g.hasNode(source)) throw new NodeNotFoundError(source);
  const dist = new Map(g.nodeIds().map(id => [id, INFINITY]));
  const pred = new Map<NodeId, NodeId | null>(); dist.set(source, 0); pred.set(source, null);
  const pq = new MinHeap(); pq.push(0, source);
  while (pq.size() > 0) {
    const [d, u] = pq.pop()!; if (d > dist.get(u)!) continue;
    for (const v of nbrs(g, u)) { const w = wFn(g.getEdge(u, v)); const nd = dist.get(u)! + w; if (nd < dist.get(v)!) { dist.set(v, nd); pred.set(v, u); pq.push(nd, v); } }
  }
  return { distances: dist, predecessors: pred, path: (t: NodeId) => dist.get(t) === INFINITY ? [] : buildPath(pred, t) };
}

export function bellmanFord(g: AnyGraph, source: NodeId, wFn: WeightFn = DEFAULT_WEIGHT): ShortestPathResult {
  if (!g.hasNode(source)) throw new NodeNotFoundError(source);
  const dist = new Map(g.nodeIds().map(id => [id, INFINITY]));
  const pred = new Map<NodeId, NodeId | null>(); dist.set(source, 0); pred.set(source, null);
  const edges = g.edges(); const n = g.nodeCount();
  for (let i = 0; i < n - 1; i++) {
    let upd = false;
    for (const edge of edges) {
      const pairs: [NodeId, NodeId][] = g instanceof DiGraph ? [[edge.source, edge.target]] : [[edge.source, edge.target], [edge.target, edge.source]];
      for (const [u, v] of pairs) { const du = dist.get(u)!; if (du === INFINITY) continue; const nd = du + wFn(edge); if (nd < dist.get(v)!) { dist.set(v, nd); pred.set(v, u); upd = true; } }
    }
    if (!upd) break;
  }
  for (const edge of edges) {
    const pairs: [NodeId, NodeId][] = g instanceof DiGraph ? [[edge.source, edge.target]] : [[edge.source, edge.target], [edge.target, edge.source]];
    for (const [u, v] of pairs) { if (dist.get(u)! !== INFINITY && dist.get(u)! + wFn(edge) < dist.get(v)!) throw new NegativeCycleError(); }
  }
  return { distances: dist, predecessors: pred, hasNegativeCycle: false, path: (t: NodeId) => dist.get(t) === INFINITY ? [] : buildPath(pred, t) };
}

export function floydWarshall(g: AnyGraph, wFn: WeightFn = DEFAULT_WEIGHT): AllPairsResult {
  const ids = g.nodeIds(); const n = ids.length;
  const idx = new Map(ids.map((id, i) => [id, i]));
  const dist: number[][] = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 0 : INFINITY));
  const next: (number | null)[][] = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? i : null));
  for (const e of g.edges()) {
    const si = idx.get(e.source)!, ti = idx.get(e.target)!, w = wFn(e);
    if (w < dist[si][ti]) { dist[si][ti] = w; next[si][ti] = ti; }
    if (!(g instanceof DiGraph) && w < dist[ti][si]) { dist[ti][si] = w; next[ti][si] = si; }
  }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (dist[i][k] !== INFINITY && dist[k][j] !== INFINITY && dist[i][k] + dist[k][j] < dist[i][j]) { dist[i][j] = dist[i][k] + dist[k][j]; next[i][j] = next[i][k]; }
  }
  let hasNeg = false; for (let i = 0; i < n; i++) if (dist[i][i] < 0) { hasNeg = true; break; }
  const distances = new Map(ids.map((id, i) => [id, new Map(ids.map((id2, j) => [id2, dist[i][j]]))]));
  const nextMap = new Map(ids.map((id, i) => [id, new Map(ids.map((id2, j) => [id2, next[i][j] !== null ? ids[next[i][j]!] : null]))]));
  return { distances, next: nextMap, hasNegativeCycle: hasNeg, path: (s: NodeId, t: NodeId) => {
    if (nextMap.get(s)?.get(t) === null) return s === t ? [s] : [];
    const p: NodeId[] = [s]; let c: NodeId = s;
    while (c !== t) { const nx = nextMap.get(c)?.get(t) ?? null; if (nx === null) return []; c = nx; p.push(c); if (p.length > g.nodeCount() + 1) return []; }
    return p;
  }};
}

export function aStar(g: Graph, source: NodeId, target: NodeId, heuristic: HeuristicFn, wFn: WeightFn = DEFAULT_WEIGHT): NodeId[] {
  if (!g.hasNode(source)) throw new NodeNotFoundError(source);
  if (!g.hasNode(target)) throw new NodeNotFoundError(target);
  const gScore = new Map(g.nodeIds().map(id => [id, INFINITY]));
  const fScore = new Map(g.nodeIds().map(id => [id, INFINITY]));
  const pred = new Map<NodeId, NodeId | null>();
  gScore.set(source, 0); fScore.set(source, heuristic(source, target)); pred.set(source, null);
  const open = new MinHeap(); open.push(fScore.get(source)!, source); const inOpen = new Set<NodeId>([source]);
  while (open.size() > 0) {
    const [, u] = open.pop()!; inOpen.delete(u);
    if (u === target) return buildPath(pred, target);
    for (const v of g.neighbors(u)) {
      const w = wFn(g.getEdge(u, v)); const tg = gScore.get(u)! + w;
      if (tg < gScore.get(v)!) { pred.set(v, u); gScore.set(v, tg); fScore.set(v, tg + heuristic(v, target)); if (!inOpen.has(v)) { open.push(fScore.get(v)!, v); inOpen.add(v); } }
    }
  }
  return [];
}

