import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId, ComponentResult } from './types';

export function connectedComponents(g: Graph): ComponentResult {
  const visited = new Set<NodeId>(); const components: NodeId[][] = []; const componentOf = new Map<NodeId, number>();
  for (const id of g.nodeIds()) {
    if (visited.has(id)) continue;
    const comp: NodeId[] = []; const stack = [id];
    while (stack.length > 0) { const u = stack.pop()!; if (visited.has(u)) continue; visited.add(u); comp.push(u); for (const v of g.neighbors(u)) if (!visited.has(v)) stack.push(v); }
    const idx = components.length; components.push(comp); for (const n of comp) componentOf.set(n, idx);
  }
  return { components, componentOf, count: components.length, largestComponent: components.reduce((a, b) => a.length >= b.length ? a : b, []) };
}

export function stronglyConnectedComponents(g: DiGraph): ComponentResult {
  const sccs = g.stronglyConnectedComponents(); const componentOf = new Map<NodeId, number>();
  sccs.forEach((c, i) => c.forEach(id => componentOf.set(id, i)));
  return { components: sccs, componentOf, count: sccs.length, largestComponent: sccs.reduce((a, b) => a.length >= b.length ? a : b, []) };
}

export function articulationPoints(g: Graph): NodeId[] {
  const visited = new Set<NodeId>(); const disc = new Map<NodeId, number>(); const low = new Map<NodeId, number>();
  const parent = new Map<NodeId, NodeId | null>(); const ap = new Set<NodeId>(); let timer = 0;
  const dfs = (u: NodeId): void => {
    visited.add(u); disc.set(u, timer); low.set(u, timer); timer++; let ch = 0;
    for (const v of g.neighbors(u)) {
      if (!visited.has(v)) {
        ch++; parent.set(v, u); dfs(v); low.set(u, Math.min(low.get(u)!, low.get(v)!));
        const isRoot = parent.get(u) === null || parent.get(u) === undefined;
        if (isRoot && ch > 1) ap.add(u);
        else if (!isRoot && low.get(v)! >= disc.get(u)!) ap.add(u);
      } else if (v !== parent.get(u)) { low.set(u, Math.min(low.get(u)!, disc.get(v)!)); }
    }
  };
  for (const id of g.nodeIds()) if (!visited.has(id)) { parent.set(id, null); dfs(id); }
  return [...ap];
}

export function bridges(g: Graph): [NodeId, NodeId][] {
  const visited = new Set<NodeId>(); const disc = new Map<NodeId, number>(); const low = new Map<NodeId, number>();
  const parent = new Map<NodeId, NodeId | null>(); const result: [NodeId, NodeId][] = []; let timer = 0;
  const dfs = (u: NodeId): void => {
    visited.add(u); disc.set(u, timer); low.set(u, timer); timer++;
    for (const v of g.neighbors(u)) {
      if (!visited.has(v)) { parent.set(v, u); dfs(v); low.set(u, Math.min(low.get(u)!, low.get(v)!)); if (low.get(v)! > disc.get(u)!) result.push([u, v]); }
      else if (v !== parent.get(u)) low.set(u, Math.min(low.get(u)!, disc.get(v)!));
    }
  };
  for (const id of g.nodeIds()) if (!visited.has(id)) { parent.set(id, null); dfs(id); }
  return result;
}

export function isConnected(g: Graph): boolean { if (g.nodeCount() === 0) return true; const visited = new Set<NodeId>(); const stack = [g.nodeIds()[0]]; while (stack.length > 0) { const u = stack.pop()!; if (!visited.has(u)) { visited.add(u); for (const v of g.neighbors(u)) if (!visited.has(v)) stack.push(v); } } return visited.size === g.nodeCount(); }

export function isBipartite(g: Graph): { bipartite: boolean; partition?: [NodeId[], NodeId[]] } {
  const color = new Map<NodeId, 0 | 1>(); const p0: NodeId[] = []; const p1: NodeId[] = [];
  for (const start of g.nodeIds()) {
    if (color.has(start)) continue; color.set(start, 0); p0.push(start); const q = [start];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const v of g.neighbors(u)) {
        if (!color.has(v)) { const c = (1 - color.get(u)!) as 0 | 1; color.set(v, c); (c === 0 ? p0 : p1).push(v); q.push(v); }
        else if (color.get(v) === color.get(u)) return { bipartite: false };
      }
    }
  }
  return { bipartite: true, partition: [p0, p1] };
}

export function biconnectedComponents(g: Graph): NodeId[][] {
  const visited = new Set<NodeId>(); const disc = new Map<NodeId, number>(); const low = new Map<NodeId, number>();
  const parent = new Map<NodeId, NodeId | null>(); const stack: [NodeId, NodeId][] = []; const comps: NodeId[][] = []; let timer = 0;
  const dfs = (u: NodeId): void => {
    visited.add(u); disc.set(u, timer); low.set(u, timer); timer++; let ch = 0;
    for (const v of g.neighbors(u)) {
      if (!visited.has(v)) {
        ch++; parent.set(v, u); stack.push([u, v]); dfs(v); low.set(u, Math.min(low.get(u)!, low.get(v)!));
        const isRoot = parent.get(u) === null || parent.get(u) === undefined;
        if ((isRoot && ch > 1) || (!isRoot && low.get(v)! >= disc.get(u)!)) {
          const comp = new Set<NodeId>();
          while (stack.length > 0) { const [a, b] = stack.pop()!; comp.add(a); comp.add(b); if (a === u && b === v) break; }
          comps.push([...comp]);
        }
      } else if (v !== parent.get(u) && disc.get(v)! < disc.get(u)!) { low.set(u, Math.min(low.get(u)!, disc.get(v)!)); stack.push([u, v]); }
    }
  };
  for (const id of g.nodeIds()) if (!visited.has(id)) { parent.set(id, null); dfs(id); }
  return comps;
}

