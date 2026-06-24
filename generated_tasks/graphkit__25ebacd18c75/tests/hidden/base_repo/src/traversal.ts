import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId, SearchResult } from './types';
import { NodeNotFoundError } from './errors';

type AnyGraph = Graph | DiGraph;
function nbrs(g: AnyGraph, id: NodeId): NodeId[] { return g instanceof DiGraph ? g.successors(id) : g.neighbors(id); }

function makeResult(): SearchResult {
  return { visited: [], order: [], parent: new Map(), depth: new Map(), discoveryTime: new Map(), finishTime: new Map() };
}

export function bfs(g: AnyGraph, start: NodeId): SearchResult {
  if (!g.hasNode(start)) throw new NodeNotFoundError(start);
  const r = makeResult(); const seen = new Set<NodeId>([start]);
  r.parent.set(start, null); r.depth.set(start, 0);
  const queue: NodeId[] = [start]; let time = 0;
  while (queue.length > 0) {
    const u = queue.shift()!; r.discoveryTime.set(u, time++); r.order.push(u); r.visited.push(u);
    for (const v of nbrs(g, u)) { if (!seen.has(v)) { seen.add(v); r.parent.set(v, u); r.depth.set(v, r.depth.get(u)! + 1); queue.push(v); } }
    r.finishTime.set(u, time++);
  }
  return r;
}

export function dfs(g: AnyGraph, start: NodeId): SearchResult {
  if (!g.hasNode(start)) throw new NodeNotFoundError(start);
  const r = makeResult(); const seen = new Set<NodeId>(); let time = 0;
  const visit = (u: NodeId, p: NodeId | null, d: number): void => {
    seen.add(u); r.parent.set(u, p); r.depth.set(u, d); r.discoveryTime.set(u, time++); r.order.push(u); r.visited.push(u);
    for (const v of nbrs(g, u)) if (!seen.has(v)) visit(v, u, d + 1);
    r.finishTime.set(u, time++);
  };
  visit(start, null, 0); return r;
}

export function dfsIterative(g: AnyGraph, start: NodeId): SearchResult {
  if (!g.hasNode(start)) throw new NodeNotFoundError(start);
  const r = makeResult(); const seen = new Set<NodeId>(); let time = 0;
  const stack: [NodeId, NodeId | null, number][] = [[start, null, 0]];
  while (stack.length > 0) {
    const [u, p, d] = stack.pop()!;
    if (seen.has(u)) continue;
    seen.add(u); r.parent.set(u, p); r.depth.set(u, d); r.discoveryTime.set(u, time++); r.order.push(u); r.visited.push(u);
    for (const v of [...nbrs(g, u)].reverse()) if (!seen.has(v)) stack.push([v, u, d + 1]);
    r.finishTime.set(u, time++);
  }
  return r;
}

export function bfsAll(g: AnyGraph): SearchResult[] {
  const results: SearchResult[] = []; const globalSeen = new Set<NodeId>();
  for (const id of g.nodeIds()) {
    if (!globalSeen.has(id)) { const r = bfs(g, id); for (const v of r.visited) globalSeen.add(v); results.push(r); }
  }
  return results;
}

export function dfsAll(g: AnyGraph): SearchResult[] {
  const results: SearchResult[] = []; const globalSeen = new Set<NodeId>();
  for (const id of g.nodeIds()) {
    if (!globalSeen.has(id)) { const r = dfs(g, id); for (const v of r.visited) globalSeen.add(v); results.push(r); }
  }
  return results;
}

export function bfsLevels(g: AnyGraph, start: NodeId): NodeId[][] {
  if (!g.hasNode(start)) throw new NodeNotFoundError(start);
  const levels: NodeId[][] = []; const seen = new Set<NodeId>([start]); let current = [start];
  while (current.length > 0) {
    levels.push(current); const next: NodeId[] = [];
    for (const u of current) for (const v of nbrs(g, u)) if (!seen.has(v)) { seen.add(v); next.push(v); }
    current = next;
  }
  return levels;
}

export function bidirectionalBFS(g: Graph, source: NodeId, target: NodeId): NodeId[] | null {
  if (!g.hasNode(source)) throw new NodeNotFoundError(source);
  if (!g.hasNode(target)) throw new NodeNotFoundError(target);
  if (source === target) return [source];
  const vS = new Map<NodeId, NodeId | null>([[source, null]]);
  const vT = new Map<NodeId, NodeId | null>([[target, null]]);
  let fS = new Map<NodeId, NodeId | null>([[source, null]]);
  let fT = new Map<NodeId, NodeId | null>([[target, null]]);

  const expand = (frontier: Map<NodeId, NodeId | null>, visited: Map<NodeId, NodeId | null>): Map<NodeId, NodeId | null> => {
    const next = new Map<NodeId, NodeId | null>();
    for (const u of frontier.keys()) for (const v of g.neighbors(u)) if (!visited.has(v)) { visited.set(v, u); next.set(v, u); }
    return next;
  };
  const intersect = (a: Map<NodeId, NodeId | null>, b: Map<NodeId, NodeId | null>): NodeId | null => { for (const id of a.keys()) if (b.has(id)) return id; return null; };
  const buildPath = (m: NodeId): NodeId[] => {
    const ps: NodeId[] = []; let c: NodeId | null = m;
    while (c !== null) { ps.push(c); c = vS.get(c) ?? null; } ps.reverse();
    let c2: NodeId | null = vT.get(m) ?? null;
    while (c2 !== null) { ps.push(c2); c2 = vT.get(c2) ?? null; }
    return ps;
  };

  for (let i = 0; i < g.nodeCount(); i++) {
    fS = expand(fS, vS); let m = intersect(vS, vT); if (m !== null) return buildPath(m);
    fT = expand(fT, vT); m = intersect(vS, vT); if (m !== null) return buildPath(m);
    if (fS.size === 0 && fT.size === 0) break;
  }
  return null;
}

export function isConnected(g: Graph): boolean {
  if (g.nodeCount() === 0) return true;
  return bfs(g, g.nodeIds()[0]).visited.length === g.nodeCount();
}

export function isReachable(g: AnyGraph, source: NodeId, target: NodeId): boolean {
  if (!g.hasNode(source) || !g.hasNode(target)) return false;
  return bfs(g, source).parent.has(target) || source === target;
}
