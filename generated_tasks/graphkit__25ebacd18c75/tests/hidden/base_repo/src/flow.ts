import { DiGraph } from './digraph';
import { Graph } from './graph';
import { NodeId } from './types';
import { NodeNotFoundError } from './errors';

export interface FlowResult {
  maxFlow: number;
  flowOnEdge: Map<string, number>;
  minCut: { sourceSet: NodeId[]; sinkSet: NodeId[] };
}

function bfsPath(
  capacity: Map<string, Map<NodeId, number>>,
  source: NodeId,
  sink: NodeId,
  parent: Map<NodeId, NodeId | null>,
  nodes: NodeId[]
): boolean {
  const visited = new Set<NodeId>([source]);
  const queue: NodeId[] = [source];

  while (queue.length > 0) {
    const u = queue.shift()!;
    const caps = capacity.get(String(u));
    if (!caps) continue;

    for (const [v, cap] of caps) {
      if (!visited.has(v) && cap > 0) {
        visited.add(v);
        parent.set(v, u);
        if (v === sink) return true;
        queue.push(v);
      }
    }
  }
  return false;
}

export function fordFulkerson(
  g: DiGraph,
  source: NodeId,
  sink: NodeId
): FlowResult {
  if (!g.hasNode(source)) throw new NodeNotFoundError(source);
  if (!g.hasNode(sink)) throw new NodeNotFoundError(sink);

  const capacity = new Map<string, Map<NodeId, number>>();
  const flowOnEdge = new Map<string, number>();
  const nodes = g.nodeIds();

  for (const id of nodes) capacity.set(String(id), new Map());

  for (const edge of g.edges()) {
    const w = typeof edge.weight === 'number' ? edge.weight : 1;
    const src = String(edge.source);
    const tgt = edge.target;
    const fwdKey = `${edge.source}->${edge.target}`;
    const revKey = `${edge.target}->${edge.source}`;

    if (!capacity.has(src)) capacity.set(src, new Map());
    capacity.get(src)!.set(tgt, (capacity.get(src)!.get(tgt) ?? 0) + w);
    flowOnEdge.set(fwdKey, 0);
    flowOnEdge.set(revKey, 0);

    const tgtStr = String(edge.target);
    if (!capacity.has(tgtStr)) capacity.set(tgtStr, new Map());
    if (!capacity.get(tgtStr)!.has(edge.source)) {
      capacity.get(tgtStr)!.set(edge.source, 0);
    }
  }

  let maxFlow = 0;

  while (true) {
    const parent = new Map<NodeId, NodeId | null>();
    if (!bfsPath(capacity, source, sink, parent, nodes)) break;

    let pathFlow = Infinity;
    let v = sink;
    while (v !== source) {
      const u = parent.get(v)!;
      const cap = capacity.get(String(u))?.get(v) ?? 0;
      pathFlow = Math.min(pathFlow, cap);
      v = u;
    }

    v = sink;
    while (v !== source) {
      const u = parent.get(v)!;
      capacity.get(String(u))!.set(v, (capacity.get(String(u))!.get(v) ?? 0) - pathFlow);
      capacity.get(String(v))!.set(u, (capacity.get(String(v))!.get(u) ?? 0) + pathFlow);
      const fwdKey = `${u}->${v}`;
      flowOnEdge.set(fwdKey, (flowOnEdge.get(fwdKey) ?? 0) + pathFlow);
      v = u;
    }

    maxFlow += pathFlow;
  }

  const visited = new Set<NodeId>([source]);
  const queue: NodeId[] = [source];
  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const [v, cap] of (capacity.get(String(u)) ?? new Map())) {
      if (!visited.has(v) && cap > 0) { visited.add(v); queue.push(v); }
    }
  }

  const sourceSet = [...visited];
  const sinkSet = nodes.filter(n => !visited.has(n));

  return { maxFlow, flowOnEdge, minCut: { sourceSet, sinkSet } };
}

export function maxBipartiteMatching(g: Graph): number {
  const { bipartite, partition } = (() => {
    const color = new Map<NodeId, 0 | 1>();
    const p0: NodeId[] = [], p1: NodeId[] = [];
    for (const start of g.nodeIds()) {
      if (color.has(start)) continue;
      color.set(start, 0); p0.push(start);
      const q = [start];
      while (q.length > 0) {
        const u = q.shift()!;
        for (const v of g.neighbors(u)) {
          if (!color.has(v)) {
            const c = (1 - color.get(u)!) as 0 | 1;
            color.set(v, c); (c === 0 ? p0 : p1).push(v); q.push(v);
          } else if (color.get(v) === color.get(u)) return { bipartite: false, partition: undefined };
        }
      }
    }
    return { bipartite: true, partition: [p0, p1] as [NodeId[], NodeId[]] };
  })();

  if (!bipartite || !partition) return 0;

  const [left, right] = partition;
  const matchL = new Map<NodeId, NodeId | null>(left.map(id => [id, null]));
  const matchR = new Map<NodeId, NodeId | null>(right.map(id => [id, null]));

  const dfs = (u: NodeId, visited: Set<NodeId>): boolean => {
    for (const v of g.neighbors(u)) {
      if (visited.has(v)) continue;
      visited.add(v);
      if (matchR.get(v) === null || matchR.get(v) === undefined || dfs(matchR.get(v)!, visited)) {
        matchL.set(u, v);
        matchR.set(v, u);
        return true;
      }
    }
    return false;
  };

  let count = 0;
  for (const u of left) {
    const visited = new Set<NodeId>();
    if (dfs(u, visited)) count++;
  }
  return count;
}

export function minCutEdges(g: DiGraph, source: NodeId, sink: NodeId): [NodeId, NodeId][] {
  const result = fordFulkerson(g, source, sink);
  const { sourceSet, sinkSet } = result.minCut;
  const sinkSet2 = new Set(sinkSet);
  const cuts: [NodeId, NodeId][] = [];
  for (const edge of g.edges()) {
    if (sourceSet.includes(edge.source) && sinkSet2.has(edge.target)) {
      cuts.push([edge.source, edge.target]);
    }
  }
  return cuts;
}

