import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId } from './types';

type AnyGraph = Graph | DiGraph;
function nbrs(g: AnyGraph, id: NodeId): NodeId[] { return g instanceof DiGraph ? g.successors(id) : g.neighbors(id); }

export function isEulerian(g: Graph): boolean {
  for (const id of g.nodeIds()) if (g.degree(id) % 2 !== 0) return false;
  if (g.nodeCount() === 0) return true;
  const start = g.nodeIds().find(id => g.degree(id) > 0); if (!start) return true;
  const visited = new Set<NodeId>(); const stack = [start];
  while (stack.length > 0) { const u = stack.pop()!; if (!visited.has(u)) { visited.add(u); for (const v of g.neighbors(u)) if (!visited.has(v)) stack.push(v); } }
  return visited.size === g.nodeCount();
}

export function eulerianCircuit(g: Graph): NodeId[] {
  if (!isEulerian(g)) return [];
  const gc = g.clone(); const start = gc.nodeIds().find(id => gc.degree(id) > 0) ?? gc.nodeIds()[0];
  const circuit: NodeId[] = []; const stack: NodeId[] = [start];
  while (stack.length > 0) { const u = stack[stack.length - 1]; const nbs = gc.neighbors(u); if (nbs.length === 0) { circuit.push(stack.pop()!); } else { const v = nbs[0]; stack.push(v); gc.removeEdge(u, v); } }
  return circuit.reverse();
}

export function eulerianPath(g: Graph): NodeId[] {
  const odd = g.nodeIds().filter(id => g.degree(id) % 2 !== 0);
  if (odd.length !== 0 && odd.length !== 2) return [];
  const gc = g.clone(); const start = odd.length === 2 ? odd[0] : (g.nodeIds().find(id => g.degree(id) > 0) ?? g.nodeIds()[0]);
  const path: NodeId[] = []; const stack: NodeId[] = [start];
  while (stack.length > 0) { const u = stack[stack.length - 1]; const nbs = gc.neighbors(u); if (nbs.length === 0) { path.push(stack.pop()!); } else { const v = nbs[0]; stack.push(v); gc.removeEdge(u, v); } }
  return path.reverse();
}

export function hamiltonianPath(g: Graph): NodeId[] | null {
  const ids = g.nodeIds(); const n = ids.length; if (n === 0) return []; if (n === 1) return [ids[0]];
  const solve = (path: NodeId[], visited: Set<NodeId>): NodeId[] | null => {
    if (path.length === n) return path; const last = path[path.length - 1];
    for (const nb of g.neighbors(last)) { if (!visited.has(nb)) { visited.add(nb); path.push(nb); const r = solve(path, visited); if (r) return r; path.pop(); visited.delete(nb); } }
    return null;
  };
  for (const s of ids) { const r = solve([s], new Set([s])); if (r) return r; }
  return null;
}

export function hasHamiltonianPath(g: Graph): boolean { return hamiltonianPath(g) !== null; }

export function pathLength(g: AnyGraph, path: NodeId[]): number {
  if (path.length < 2) return 0; let total = 0;
  for (let i = 0; i < path.length - 1; i++) { if (!g.hasEdge(path[i], path[i + 1])) return Infinity; const e = g.getEdge(path[i], path[i + 1]); total += typeof e.weight === 'number' ? e.weight : 1; }
  return total;
}

export function isSimplePath(path: NodeId[]): boolean { const seen = new Set<NodeId>(); for (const id of path) { if (seen.has(id)) return false; seen.add(id); } return true; }

export function isCycle(g: AnyGraph, path: NodeId[]): boolean { return path.length >= 3 && path[0] === path[path.length - 1] && isSimplePath(path.slice(0, -1)) && g.hasEdge(path[path.length - 2], path[0]); }

export function allPaths(g: AnyGraph, source: NodeId, target: NodeId, maxDepth = 10): NodeId[][] {
  const results: NodeId[][] = []; const visited = new Set<NodeId>([source]);
  const dfs = (cur: NodeId, path: NodeId[]): void => {
    if (path.length > maxDepth + 1) return; if (cur === target) { results.push([...path]); return; }
    for (const nb of nbrs(g, cur)) { if (!visited.has(nb)) { visited.add(nb); path.push(nb); dfs(nb, path); path.pop(); visited.delete(nb); } }
  };
  dfs(source, [source]); return results;
}

