import { Graph } from '../src/graph';
import { DiGraph } from '../src/digraph';
import { toJSON, fromJSON, toDOT, fromDOT, toAdjacencyList, fromAdjacencyList, toEdgeList, fromEdgeList } from '../src/serializer';

function makeGraph(): Graph {
  const g = new Graph();
  ['a','b','c'].forEach(n => g.addNode(n));
  g.addEdge('a','b',1); g.addEdge('b','c',2);
  return g;
}

describe('JSON serialization', () => {
  it('toJSON returns serialized object', () => { expect(typeof toJSON(makeGraph())).toBe('object'); });
  it('fromJSON restores node count', () => { expect(fromJSON(toJSON(makeGraph())).nodeCount()).toBe(3); });
  it('fromJSON restores edge count', () => { expect(fromJSON(toJSON(makeGraph())).edgeCount()).toBe(2); });
  it('fromJSON has correct edges', () => { expect(fromJSON(toJSON(makeGraph())).hasEdge('a','b')).toBe(true); });
  it('empty graph roundtrip', () => { expect(fromJSON(toJSON(new Graph())).nodeCount()).toBe(0); });
  it('toJSON has nodes property', () => { expect(toJSON(makeGraph())).toHaveProperty('nodes'); });
  it('toJSON has edges property', () => { expect(toJSON(makeGraph())).toHaveProperty('edges'); });
});

describe('DOT serialization', () => {
  it('toDOT contains graph keyword', () => { expect(toDOT(makeGraph())).toContain('graph'); });
  it('toDOT contains node names', () => { const dot = toDOT(makeGraph()); expect(dot).toContain('a'); expect(dot).toContain('b'); });
  it('fromDOT restores node count', () => { const g2 = fromDOT(toDOT(makeGraph())); expect(g2.nodeCount()).toBe(3); });
  it('fromDOT restores edges', () => { expect(fromDOT(toDOT(makeGraph())).hasEdge('a','b')).toBe(true); });
  it('directed graph uses digraph keyword', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(toDOT(g)).toContain('digraph'); });
  it('toDOT returns string', () => { expect(typeof toDOT(makeGraph())).toBe('string'); });
});

describe('adjacency list', () => {
  it('toAdjacencyList returns object', () => { expect(typeof toAdjacencyList(makeGraph())).toBe('object'); });
  it('has all nodes as keys', () => { const al = toAdjacencyList(makeGraph()); expect('a' in al).toBe(true); });
  it('correct neighbors for a', () => { expect(toAdjacencyList(makeGraph())['a']).toContain('b'); });
  it('fromAdjacencyList restores nodes', () => { const al = toAdjacencyList(makeGraph()); expect(fromAdjacencyList(al).nodeCount()).toBe(3); });
  it('fromAdjacencyList restores edges', () => { const al = toAdjacencyList(makeGraph()); expect(fromAdjacencyList(al).edgeCount()).toBeGreaterThan(0); });
});

describe('edge list', () => {
  it('toEdgeList returns array', () => { expect(Array.isArray(toEdgeList(makeGraph()))).toBe(true); });
  it('correct edge count', () => { expect(toEdgeList(makeGraph())).toHaveLength(2); });
  it('fromEdgeList restores nodes', () => { expect(fromEdgeList(toEdgeList(makeGraph())).nodeCount()).toBe(3); });
  it('fromEdgeList restores edges', () => { expect(fromEdgeList(toEdgeList(makeGraph())).edgeCount()).toBe(2); });
  it('edge tuples have 3 elements', () => { for (const e of toEdgeList(makeGraph())) expect(e).toHaveLength(3); });
});

describe('serializer advanced', () => {
  it('toDOT returns string', () => { expect(typeof toDOT(makeGraph())).toBe('string'); });
  it('toDOT contains graph keyword', () => { expect(toDOT(makeGraph())).toContain('graph'); });
  it('fromJSON restores node count', () => { const json = toJSON(makeGraph()); const g2 = fromJSON(json); expect(g2.nodeCount()).toBe(makeGraph().nodeCount()); });
  it('fromJSON restores edge count', () => { const json = toJSON(makeGraph()); const g2 = fromJSON(json); expect(g2.edgeCount()).toBe(makeGraph().edgeCount()); });
  it('fromAdjacencyList restores graph', () => { const adj = toAdjacencyList(makeGraph()); const g2 = fromAdjacencyList(adj); expect(g2.nodeCount()).toBe(makeGraph().nodeCount()); });
  it('fromEdgeList restores edges', () => { const el = toEdgeList(makeGraph()) as [string,string,number][]; const g2 = fromEdgeList(el); expect(g2.edgeCount()).toBe(makeGraph().edgeCount()); });
  it('toEdgeList each entry has 3 elements', () => { for (const e of toEdgeList(makeGraph())) expect(e).toHaveLength(3); });
  it('toAdjacencyList has all nodes as keys', () => { const adj = toAdjacencyList(makeGraph()); for (const n of makeGraph().nodeIds()) expect(adj).toHaveProperty(String(n)); });
  it('toJSON has nodes array', () => { expect(toJSON(makeGraph())).toHaveProperty('nodes'); });
  it('toJSON has edges array', () => { expect(toJSON(makeGraph())).toHaveProperty('edges'); });
})

