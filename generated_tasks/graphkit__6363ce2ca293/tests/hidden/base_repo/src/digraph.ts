import { Graph } from './graph';
import { NodeId, EdgeData, GraphOptions } from './types';
import { InvalidOperationError } from './errors';

export class DiGraph<N = unknown, E = number> extends Graph<N, E> {
  protected _inAdj: Map<NodeId, Map<NodeId, string[]>> = new Map();

  constructor(options: GraphOptions = {}) { super(options); }

  addNode(id: NodeId, data?: N, label?: string, attributes?: Record<string, unknown>): this {
    super.addNode(id, data, label, attributes); this._inAdj.set(id, new Map()); return this;
  }

  removeNode(id: NodeId): this {
    super.removeNode(id); this._inAdj.delete(id);
    for (const [, inAdj] of this._inAdj) inAdj.delete(id);
    return this;
  }

  addEdge(source: NodeId, target: NodeId, weight?: E, data?: unknown, label?: string): string {
    this._assertNode(source); this._assertNode(target);
    if (!this._options.allowSelfLoops && source === target) throw new InvalidOperationError('Self-loops not allowed');
    if (!this._options.allowMultiEdges && this.hasEdge(source, target)) throw new InvalidOperationError(`Edge ${source}->${target} exists`);
    const id = `e${++this._edgeCounter}`;
    const w = weight ?? (1 as unknown as E);
    this._edges.set(id, { id, source, target, weight: w, data, label, directed: true });
    this._addAdj(source, target, id); this._addInAdj(target, source, id);
    return id;
  }

  removeEdge(source: NodeId, target: NodeId): boolean {
    const ids = this._adjacency.get(source)?.get(target);
    if (!ids || ids.length === 0) return false;
    const eid = ids[0];
    this._edges.delete(eid); this._removeAdj(source, target, eid); this._removeInAdj(target, source, eid);
    return true;
  }

  successors(id: NodeId): NodeId[] { this._assertNode(id); return [...(this._adjacency.get(id)?.keys() ?? [])]; }
  predecessors(id: NodeId): NodeId[] { this._assertNode(id); return [...(this._inAdj.get(id)?.keys() ?? [])]; }
  inDegree(id: NodeId): number { this._assertNode(id); let c = 0; for (const v of this._inAdj.get(id)!.values()) c += v.length; return c; }
  outDegree(id: NodeId): number { this._assertNode(id); let c = 0; for (const v of this._adjacency.get(id)!.values()) c += v.length; return c; }
  degree(id: NodeId): number { return this.inDegree(id) + this.outDegree(id); }

  reverse(): DiGraph<N, E> {
    const g = new DiGraph<N, E>(this._options);
    for (const n of this._nodes.values()) g.addNode(n.id, n.data, n.label);
    for (const e of this._edges.values()) g.addEdge(e.target, e.source, e.weight, e.data, e.label);
    return g;
  }

  isDAG(): boolean {
    const visited = new Set<NodeId>(); const inStack = new Set<NodeId>();
    const hasCycle = (u: NodeId): boolean => {
      visited.add(u); inStack.add(u);
      for (const v of this.successors(u)) { if (!visited.has(v) && hasCycle(v)) return true; if (inStack.has(v)) return true; }
      inStack.delete(u); return false;
    };
    for (const id of this.nodeIds()) if (!visited.has(id) && hasCycle(id)) return false;
    return true;
  }

  topoSort(): NodeId[] {
    if (!this.isDAG()) throw new Error('Cannot topoSort: graph has cycles');
    const inDeg = new Map(this.nodeIds().map(id => [id, this.inDegree(id)]));
    const queue = [...inDeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
    const result: NodeId[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!; result.push(u);
      for (const v of this.successors(u)) {
        const d = inDeg.get(v)! - 1; inDeg.set(v, d); if (d === 0) queue.push(v);
      }
    }
    return result;
  }

  stronglyConnectedComponents(): NodeId[][] {
    const visited = new Set<NodeId>(); const postOrder: NodeId[] = [];
    const dfs1 = (u: NodeId): void => { visited.add(u); for (const v of this.successors(u)) if (!visited.has(v)) dfs1(v); postOrder.push(u); };
    for (const id of this.nodeIds()) if (!visited.has(id)) dfs1(id);
    const rev = this.reverse(); const visited2 = new Set<NodeId>(); const components: NodeId[][] = [];
    const dfs2 = (u: NodeId, comp: NodeId[]): void => { visited2.add(u); comp.push(u); for (const v of rev.successors(u)) if (!visited2.has(v)) dfs2(v, comp); };
    for (let i = postOrder.length - 1; i >= 0; i--) {
      const node = postOrder[i];
      if (!visited2.has(node)) { const comp: NodeId[] = []; dfs2(node, comp); components.push(comp); }
    }
    return components;
  }

  weaklyConnectedComponents(): NodeId[][] {
    const visited = new Set<NodeId>(); const components: NodeId[][] = [];
    const dfs = (id: NodeId, comp: NodeId[]): void => {
      visited.add(id); comp.push(id);
      for (const nb of [...this.successors(id), ...this.predecessors(id)]) if (!visited.has(nb)) dfs(nb, comp);
    };
    for (const id of this.nodeIds()) if (!visited.has(id)) { const comp: NodeId[] = []; dfs(id, comp); components.push(comp); }
    return components;
  }

  density(): number { const n = this._nodes.size; return n < 2 ? 0 : this._edges.size / (n * (n - 1)); }

  clone(): DiGraph<N, E> {
    const g = new DiGraph<N, E>(this._options);
    for (const n of this._nodes.values()) g._nodes.set(n.id, { ...n });
    for (const e of this._edges.values()) g._edges.set(e.id, { ...e });
    for (const [id, adj] of this._adjacency) g._adjacency.set(id, new Map([...adj].map(([k, v]) => [k, [...v]])));
    for (const [id, adj] of this._inAdj) g._inAdj.set(id, new Map([...adj].map(([k, v]) => [k, [...v]])));
    g._edgeCounter = this._edgeCounter; return g;
  }

  private _addInAdj(to: NodeId, from: NodeId, eid: string): void {
    if (!this._inAdj.has(to)) this._inAdj.set(to, new Map());
    const adj = this._inAdj.get(to)!; if (!adj.has(from)) adj.set(from, []); adj.get(from)!.push(eid);
  }
  private _removeInAdj(to: NodeId, from: NodeId, eid: string): void {
    const adj = this._inAdj.get(to); if (!adj) return;
    const eids = adj.get(from); if (!eids) return;
    const idx = eids.indexOf(eid); if (idx !== -1) eids.splice(idx, 1); if (eids.length === 0) adj.delete(from);
  }
}
