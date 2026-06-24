import { NodeId, NodeData, EdgeData, GraphOptions } from './types';
import { NodeNotFoundError, EdgeNotFoundError, DuplicateNodeError, InvalidOperationError } from './errors';

export class Graph<N = unknown, E = number> {
  protected _nodes: Map<NodeId, NodeData<N>> = new Map();
  protected _edges: Map<string, EdgeData<E>> = new Map();
  protected _adjacency: Map<NodeId, Map<NodeId, string[]>> = new Map();
  protected _options: Required<GraphOptions>;
  protected _edgeCounter = 0;

  constructor(options: GraphOptions = {}) {
    this._options = { allowSelfLoops: options.allowSelfLoops ?? false, allowMultiEdges: options.allowMultiEdges ?? false };
  }

  addNode(id: NodeId, data?: N, label?: string, attributes?: Record<string, unknown>): this {
    if (this._nodes.has(id)) throw new DuplicateNodeError(id);
    this._nodes.set(id, { id, data, label, attributes });
    this._adjacency.set(id, new Map());
    return this;
  }

  addNodeIfAbsent(id: NodeId, data?: N): this { if (!this._nodes.has(id)) this.addNode(id, data); return this; }

  removeNode(id: NodeId): this {
    if (!this._nodes.has(id)) throw new NodeNotFoundError(id);
    for (const [eid, edge] of this._edges) {
      if (edge.source === id || edge.target === id) {
        this._edges.delete(eid);
        this._removeAdj(edge.source, edge.target, eid);
        this._removeAdj(edge.target, edge.source, eid);
      }
    }
    this._nodes.delete(id); this._adjacency.delete(id); return this;
  }

  addEdge(source: NodeId, target: NodeId, weight?: E, data?: unknown, label?: string): string {
    this._assertNode(source); this._assertNode(target);
    if (!this._options.allowSelfLoops && source === target) throw new InvalidOperationError('Self-loops not allowed');
    if (!this._options.allowMultiEdges && this.hasEdge(source, target)) throw new InvalidOperationError(`Edge ${source}-${target} exists`);
    const id = `e${++this._edgeCounter}`;
    const w = weight ?? (1 as unknown as E);
    this._edges.set(id, { id, source, target, weight: w, data, label, directed: false });
    this._addAdj(source, target, id); this._addAdj(target, source, id);
    return id;
  }

  removeEdge(source: NodeId, target: NodeId): boolean {
    const ids = this._adjacency.get(source)?.get(target);
    if (!ids || ids.length === 0) return false;
    const eid = ids[0];
    this._edges.delete(eid); this._removeAdj(source, target, eid); this._removeAdj(target, source, eid);
    return true;
  }

  removeEdgeById(id: string): boolean {
    const e = this._edges.get(id);
    if (!e) return false;
    this._edges.delete(id); this._removeAdj(e.source, e.target, id); this._removeAdj(e.target, e.source, id);
    return true;
  }

  hasNode(id: NodeId): boolean { return this._nodes.has(id); }
  hasEdge(source: NodeId, target: NodeId): boolean { const ids = this._adjacency.get(source)?.get(target); return !!(ids && ids.length > 0); }

  getNode(id: NodeId): NodeData<N> { const n = this._nodes.get(id); if (!n) throw new NodeNotFoundError(id); return n; }
  getEdge(source: NodeId, target: NodeId): EdgeData<E> {
    const ids = this._adjacency.get(source)?.get(target);
    if (!ids || ids.length === 0) throw new EdgeNotFoundError(source, target);
    return this._edges.get(ids[0])!;
  }
  getEdgeById(id: string): EdgeData<E> { const e = this._edges.get(id); if (!e) throw new Error(`Edge '${id}' not found`); return e; }

  neighbors(id: NodeId): NodeId[] { this._assertNode(id); return [...(this._adjacency.get(id)?.keys() ?? [])]; }
  degree(id: NodeId): number {
    this._assertNode(id);
    let c = 0; for (const eids of this._adjacency.get(id)!.values()) c += eids.length; return c;
  }

  nodes(): NodeData<N>[] { return [...this._nodes.values()]; }
  nodeIds(): NodeId[] { return [...this._nodes.keys()]; }
  edges(): EdgeData<E>[] { return [...this._edges.values()]; }
  edgeCount(): number { return this._edges.size; }
  nodeCount(): number { return this._nodes.size; }
  isEmpty(): boolean { return this._nodes.size === 0; }
  clear(): void { this._nodes.clear(); this._edges.clear(); this._adjacency.clear(); this._edgeCounter = 0; }

  updateNodeData(id: NodeId, data: N): void { const n = this._nodes.get(id); if (!n) throw new NodeNotFoundError(id); n.data = data; }
  updateEdgeWeight(source: NodeId, target: NodeId, weight: E): void { this.getEdge(source, target).weight = weight; }

  density(): number { const n = this._nodes.size; return n < 2 ? 0 : this._edges.size / ((n * (n - 1)) / 2); }
  isComplete(): boolean { return Math.abs(this.density() - 1) < 1e-9; }
  isRegular(): boolean { const d = this.nodeIds().map(id => this.degree(id)); return d.length > 0 && d.every(x => x === d[0]); }
  minDegree(): number { return this.nodeIds().length ? Math.min(...this.nodeIds().map(id => this.degree(id))) : 0; }
  maxDegree(): number { return this.nodeIds().length ? Math.max(...this.nodeIds().map(id => this.degree(id))) : 0; }
  avgDegree(): number { const ids = this.nodeIds(); return ids.length ? ids.reduce((s: number, id) => s + this.degree(id), 0) / ids.length : 0; }

  clone(): Graph<N, E> {
    const g = new Graph<N, E>(this._options);
    for (const n of this._nodes.values()) g._nodes.set(n.id, { ...n });
    for (const e of this._edges.values()) g._edges.set(e.id, { ...e });
    for (const [id, adj] of this._adjacency) g._adjacency.set(id, new Map([...adj].map(([k, v]) => [k, [...v]])));
    g._edgeCounter = this._edgeCounter; return g;
  }

  subgraph(nodeIds: NodeId[]): Graph<N, E> {
    const set = new Set(nodeIds); const g = new Graph<N, E>(this._options);
    for (const id of nodeIds) if (this._nodes.has(id)) { g._nodes.set(id, { ...this._nodes.get(id)! }); g._adjacency.set(id, new Map()); }
    for (const edge of this._edges.values()) {
      if (set.has(edge.source) && set.has(edge.target)) {
        g._edges.set(edge.id, { ...edge }); g._addAdj(edge.source, edge.target, edge.id); g._addAdj(edge.target, edge.source, edge.id);
        g._edgeCounter = Math.max(g._edgeCounter, parseInt(edge.id.slice(1), 10));
      }
    }
    return g;
  }

  complement(): Graph<N, E> {
    const g = new Graph<N, E>(); const ids = this.nodeIds();
    for (const n of this._nodes.values()) g.addNode(n.id, n.data, n.label);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!this.hasEdge(ids[i], ids[j])) g.addEdge(ids[i], ids[j]);
    return g;
  }

  protected _assertNode(id: NodeId): void { if (!this._nodes.has(id)) throw new NodeNotFoundError(id); }
  protected _addAdj(from: NodeId, to: NodeId, eid: string): void {
    if (!this._adjacency.has(from)) this._adjacency.set(from, new Map());
    const adj = this._adjacency.get(from)!; if (!adj.has(to)) adj.set(to, []); adj.get(to)!.push(eid);
  }
  protected _removeAdj(from: NodeId, to: NodeId, eid: string): void {
    const adj = this._adjacency.get(from); if (!adj) return;
    const eids = adj.get(to); if (!eids) return;
    const idx = eids.indexOf(eid); if (idx !== -1) eids.splice(idx, 1); if (eids.length === 0) adj.delete(to);
  }
}

