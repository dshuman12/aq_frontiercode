import { Graph } from '../src/graph';
import { kruskal, prim, boruvka, isMSTValid } from '../src/mst';

function makeGraph(): Graph {
  const g = new Graph();
  ['a','b','c','d','e'].forEach(n => g.addNode(n));
  g.addEdge('a','b',4); g.addEdge('a','c',2); g.addEdge('b','c',1);
  g.addEdge('b','d',5); g.addEdge('c','d',8); g.addEdge('c','e',10); g.addEdge('d','e',2);
  return g;
}

describe('kruskal', () => {
  it('returns n-1 edges', () => { expect(kruskal(makeGraph()).edges).toHaveLength(4); });
  it('MST is valid', () => { expect(isMSTValid(makeGraph(), kruskal(makeGraph()))).toBe(true); });
  it('minimum total weight is correct', () => { expect(kruskal(makeGraph()).totalWeight).toBeLessThanOrEqual(14); });
  it('single node returns 0 edges', () => { const g = new Graph(); g.addNode('a'); expect(kruskal(g).edges).toHaveLength(0); });
  it('edgeCount is n-1', () => { expect(kruskal(makeGraph()).edgeCount).toBe(4); });
  it('nodeCount is n', () => { expect(kruskal(makeGraph()).nodeCount).toBe(5); });
  it('totalWeight is a number', () => { expect(typeof kruskal(makeGraph()).totalWeight).toBe('number'); });
});

describe('prim', () => {
  it('returns n-1 edges', () => { expect(prim(makeGraph()).edges).toHaveLength(4); });
  it('MST is valid', () => { expect(isMSTValid(makeGraph(), prim(makeGraph()))).toBe(true); });
  it('prim same weight as kruskal', () => { expect(prim(makeGraph()).totalWeight).toBe(kruskal(makeGraph()).totalWeight); });
  it('single node returns 0 edges', () => { const g = new Graph(); g.addNode('a'); expect(prim(g).edges).toHaveLength(0); });
});

describe('boruvka', () => {
  it('returns n-1 edges', () => { expect(boruvka(makeGraph()).edges).toHaveLength(4); });
  it('MST is valid', () => { expect(isMSTValid(makeGraph(), boruvka(makeGraph()))).toBe(true); });
  it('boruvka same weight as kruskal', () => { expect(boruvka(makeGraph()).totalWeight).toBe(kruskal(makeGraph()).totalWeight); });
});

describe('isMSTValid', () => {
  it('true for valid MST', () => { expect(isMSTValid(makeGraph(), kruskal(makeGraph()))).toBe(true); });
  it('false for too few edges', () => { const mst = kruskal(makeGraph()); const partial = { ...mst, edges: mst.edges.slice(0,2), edgeCount: 2 }; expect(isMSTValid(makeGraph(), partial)).toBe(false); });
});

describe('MST advanced', () => {
  it('prim gives same total weight as kruskal', () => { const k = kruskal(makeGraph()).totalWeight; const p = prim(makeGraph()).totalWeight; expect(Math.abs(k-p)).toBeLessThan(0.01); });
  it('prim has n-1 edges', () => { expect(prim(makeGraph()).edges).toHaveLength(4); });
  it('boruvka has n-1 edges', () => { expect(boruvka(makeGraph()).edges).toHaveLength(4); });
  it('kruskal totalWeight is a number', () => { expect(typeof kruskal(makeGraph()).totalWeight).toBe('number'); });
  it('prim totalWeight is a number', () => { expect(typeof prim(makeGraph()).totalWeight).toBe('number'); });
  it('boruvka totalWeight <= kruskal total', () => { expect(boruvka(makeGraph()).totalWeight).toBeLessThanOrEqual(kruskal(makeGraph()).totalWeight + 1); });
  it('isMSTValid for prim', () => { expect(isMSTValid(makeGraph(), prim(makeGraph()))).toBe(true); });
  it('isMSTValid for boruvka', () => { expect(isMSTValid(makeGraph(), boruvka(makeGraph()))).toBe(true); });
  it('MST nodeCount equals graph nodeCount', () => { expect(kruskal(makeGraph()).nodeCount).toBe(5); });
})

describe('MST extended', () => {
  it('prim single node', () => { const g = new Graph(); g.addNode('x'); const r = prim(g,'x'); expect(r.edgeCount).toBe(0); });
  it('kruskal two nodes connected', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',5); const r = kruskal(g); expect(r.totalWeight).toBe(5); });
  it('boruvka two nodes', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',3); const r = boruvka(g); expect(r.totalWeight).toBe(3); });
  it('kruskal returns edges sorted by weight', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b',2); g.addEdge('b','c',1); g.addEdge('a','c',4); const r = kruskal(g); expect(r.totalWeight).toBe(3); });
  it('prim returns same total weight regardless of start', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b',2); g.addEdge('b','c',1); g.addEdge('a','c',4); const r1 = prim(g,'a'); const r2 = prim(g,'c'); expect(r1.totalWeight).toBe(r2.totalWeight); });
})

