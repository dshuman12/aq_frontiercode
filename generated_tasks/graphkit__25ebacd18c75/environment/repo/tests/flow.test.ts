import { Graph } from '../src/graph';
import { DiGraph } from '../src/digraph';
import { fordFulkerson, maxBipartiteMatching, minCutEdges } from '../src/flow';

function makeFlowGraph(): DiGraph {
  const g = new DiGraph();
  ['s','a','b','c','t'].forEach(n => g.addNode(n));
  g.addEdge('s','a',10); g.addEdge('s','b',10);
  g.addEdge('a','c',10); g.addEdge('b','c',10);
  g.addEdge('a','t',10); g.addEdge('c','t',10);
  return g;
}
function makeSimpleFlow(): DiGraph { const g = new DiGraph(); ['s','a','t'].forEach(n=>g.addNode(n)); g.addEdge('s','a',5); g.addEdge('a','t',3); return g; }
function makeDirectEdge(): DiGraph { const g = new DiGraph(); g.addNode('s'); g.addNode('t'); g.addEdge('s','t',7); return g; }
function makeBipartite(): Graph {
  const g = new Graph();
  ['l1','l2','l3','r1','r2','r3'].forEach(n => g.addNode(n));
  g.addEdge('l1','r1'); g.addEdge('l1','r2'); g.addEdge('l2','r2'); g.addEdge('l2','r3'); g.addEdge('l3','r3');
  return g;
}

describe('fordFulkerson', () => {
  it('max flow is non-negative', () => { expect(fordFulkerson(makeFlowGraph(),'s','t').maxFlow).toBeGreaterThanOrEqual(0); });
  it('simple flow bottlenecked by min edge', () => { expect(fordFulkerson(makeSimpleFlow(),'s','t').maxFlow).toBe(3); });
  it('returns FlowResult with maxFlow', () => { expect(typeof fordFulkerson(makeFlowGraph(),'s','t').maxFlow).toBe('number'); });
  it('no path returns 0', () => { const g = new DiGraph(); g.addNode('s'); g.addNode('t'); expect(fordFulkerson(g,'s','t').maxFlow).toBe(0); });
  it('direct edge flow equals capacity', () => { expect(fordFulkerson(makeDirectEdge(),'s','t').maxFlow).toBe(7); });
  it('parallel paths sum correctly', () => { const g = new DiGraph(); ['s','a','b','t'].forEach(n=>g.addNode(n)); g.addEdge('s','a',3); g.addEdge('s','b',3); g.addEdge('a','t',3); g.addEdge('b','t',3); expect(fordFulkerson(g,'s','t').maxFlow).toBe(6); });
  it('has flowOnEdge map', () => { expect(fordFulkerson(makeFlowGraph(),'s','t').flowOnEdge instanceof Map).toBe(true); });
  it('has minCut', () => { expect(fordFulkerson(makeFlowGraph(),'s','t').minCut).toBeDefined(); });
  it('minCut has sourceSet', () => { expect(fordFulkerson(makeFlowGraph(),'s','t').minCut.sourceSet).toBeDefined(); });
});

describe('maxBipartiteMatching', () => {
  it('returns non-negative', () => { expect(maxBipartiteMatching(makeBipartite())).toBeGreaterThanOrEqual(0); });
  it('matching <= 3', () => { expect(maxBipartiteMatching(makeBipartite())).toBeLessThanOrEqual(3); });
  it('returns number', () => { expect(typeof maxBipartiteMatching(makeBipartite())).toBe('number'); });
  it('empty graph returns 0', () => { expect(maxBipartiteMatching(new Graph())).toBe(0); });
  it('single edge returns 1', () => { const g = new Graph(); g.addNode('l'); g.addNode('r'); g.addEdge('l','r'); expect(maxBipartiteMatching(g)).toBe(1); });
  it('no edges returns 0', () => { const g = new Graph(); g.addNode('l'); g.addNode('r'); expect(maxBipartiteMatching(g)).toBe(0); });
  it('perfect balanced bipartite', () => { const g = new Graph(); ['l1','l2','r1','r2'].forEach(n=>g.addNode(n)); g.addEdge('l1','r1'); g.addEdge('l2','r2'); expect(maxBipartiteMatching(g)).toBe(2); });
});

describe('minCutEdges', () => {
  it('returns array', () => { expect(Array.isArray(minCutEdges(makeFlowGraph(),'s','t'))).toBe(true); });
  it('non-empty for connected', () => { expect(minCutEdges(makeFlowGraph(),'s','t').length).toBeGreaterThan(0); });
  it('each entry is tuple', () => { for (const e of minCutEdges(makeFlowGraph(),'s','t')) { expect(e).toHaveLength(2); } });
  it('no path returns empty', () => { const g = new DiGraph(); g.addNode('s'); g.addNode('t'); expect(minCutEdges(g,'s','t')).toHaveLength(0); });
  it('direct edge in cut', () => { expect(minCutEdges(makeDirectEdge(),'s','t').length).toBeGreaterThan(0); });
  it('strings in tuples', () => { for (const e of minCutEdges(makeFlowGraph(),'s','t')) { expect(typeof e[0]).toBe('string'); expect(typeof e[1]).toBe('string'); } });
});

describe('flow extended', () => {
  it('fordFulkerson large network', () => { const g = new DiGraph(); ['s','a','b','c','d','t'].forEach(n=>g.addNode(n)); g.addEdge('s','a',15); g.addEdge('s','b',10); g.addEdge('a','c',12); g.addEdge('b','c',5); g.addEdge('b','d',8); g.addEdge('c','t',15); g.addEdge('d','t',10); expect(fordFulkerson(g,'s','t').maxFlow).toBeGreaterThan(0); });
  it('minCutEdges large network non-empty', () => { const g = new DiGraph(); ['s','a','b','t'].forEach(n=>g.addNode(n)); g.addEdge('s','a',10); g.addEdge('s','b',5); g.addEdge('a','t',8); g.addEdge('b','t',6); expect(minCutEdges(g,'s','t').length).toBeGreaterThan(0); });
  it('maxBipartiteMatching 3x3 complete is 3', () => { const g = new Graph(); ['l1','l2','l3','r1','r2','r3'].forEach(n=>g.addNode(n)); [['l1','r1'],['l1','r2'],['l1','r3'],['l2','r1'],['l2','r2'],['l2','r3'],['l3','r1'],['l3','r2'],['l3','r3']].forEach(([u,v])=>g.addEdge(u,v)); expect(maxBipartiteMatching(g)).toBe(3); });
})

