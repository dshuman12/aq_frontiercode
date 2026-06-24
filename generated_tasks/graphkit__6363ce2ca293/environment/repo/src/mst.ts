import { Graph } from './graph';
import { EdgeData, MSTResult, WeightFn, DEFAULT_WEIGHT, NodeId } from './types';
import { DisconnectedGraphError } from './errors';

class UF {
  private p: Map<NodeId, NodeId>; private r: Map<NodeId, number>;
  constructor(ids: NodeId[]) { this.p = new Map(ids.map(id => [id, id])); this.r = new Map(ids.map(id => [id, 0])); }
  find(x: NodeId): NodeId { if (this.p.get(x) !== x) this.p.set(x, this.find(this.p.get(x)!)); return this.p.get(x)!; }
  union(x: NodeId, y: NodeId): boolean {
    const rx = this.find(x), ry = this.find(y); if (rx === ry) return false;
    if ((this.r.get(rx)??0) < (this.r.get(ry)??0)) this.p.set(rx, ry);
    else if ((this.r.get(rx)??0) > (this.r.get(ry)??0)) this.p.set(ry, rx);
    else { this.p.set(ry, rx); this.r.set(rx, (this.r.get(rx)??0) + 1); }
    return true;
  }
}

export function kruskal(g: Graph, wFn: WeightFn = DEFAULT_WEIGHT): MSTResult {
  const sorted = [...g.edges()].sort((a, b) => wFn(a) - wFn(b));
  const uf = new UF(g.nodeIds()); const mst: EdgeData[] = []; let total = 0;
  for (const e of sorted) { if (uf.union(e.source, e.target)) { mst.push(e); total += wFn(e); if (mst.length === g.nodeCount() - 1) break; } }
  if (mst.length < g.nodeCount() - 1 && g.nodeCount() > 1) throw new DisconnectedGraphError('kruskal');
  return { edges: mst, totalWeight: total, nodeCount: g.nodeCount(), edgeCount: mst.length };
}

export function prim(g: Graph, startNode?: NodeId, wFn: WeightFn = DEFAULT_WEIGHT): MSTResult {
  if (g.nodeCount() === 0) return { edges: [], totalWeight: 0, nodeCount: 0, edgeCount: 0 };
  const start = startNode ?? g.nodeIds()[0]; const inMST = new Set<NodeId>([start]); const mst: EdgeData[] = []; let total = 0;
  while (inMST.size < g.nodeCount()) {
    let best: EdgeData | null = null; let bw = Infinity;
    for (const u of inMST) for (const v of g.neighbors(u)) if (!inMST.has(v)) { const e = g.getEdge(u, v); const w = wFn(e); if (w < bw) { bw = w; best = e; } }
    if (!best) throw new DisconnectedGraphError('prim');
    mst.push(best); total += bw; inMST.add(inMST.has(best.source) ? best.target : best.source);
  }
  return { edges: mst, totalWeight: total, nodeCount: g.nodeCount(), edgeCount: mst.length };
}

export function boruvka(g: Graph, wFn: WeightFn = DEFAULT_WEIGHT): MSTResult {
  if (g.nodeCount() === 0) return { edges: [], totalWeight: 0, nodeCount: 0, edgeCount: 0 };
  const uf = new UF(g.nodeIds()); const mst: EdgeData[] = []; let total = 0; let numComp = g.nodeCount();
  while (numComp > 1) {
    const cheapest = new Map<NodeId, EdgeData | null>();
    for (const id of g.nodeIds()) cheapest.set(uf.find(id), null);
    for (const e of g.edges()) {
      const cu = uf.find(e.source), cv = uf.find(e.target); if (cu === cv) continue;
      const w = wFn(e);
      if (!cheapest.get(cu) || w < wFn(cheapest.get(cu)!)) cheapest.set(cu, e);
      if (!cheapest.get(cv) || w < wFn(cheapest.get(cv)!)) cheapest.set(cv, e);
    }
    let added = false; const seen = new Set<string>();
    for (const e of cheapest.values()) { if (!e || seen.has(e.id)) continue; if (uf.union(e.source, e.target)) { mst.push(e); total += wFn(e); numComp--; added = true; seen.add(e.id); } }
    if (!added) break;
  }
  if (numComp > 1 && g.nodeCount() > 1) throw new DisconnectedGraphError('boruvka');
  return { edges: mst, totalWeight: total, nodeCount: g.nodeCount(), edgeCount: mst.length };
}

export function isMSTValid(g: Graph, mst: MSTResult): boolean {
  if (mst.edgeCount !== g.nodeCount() - 1) return false;
  const uf = new UF(g.nodeIds());
  for (const e of mst.edges) { if (!uf.union(e.source, e.target)) return false; }
  return true;
}

