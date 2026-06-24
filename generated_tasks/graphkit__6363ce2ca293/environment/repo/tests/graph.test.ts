import { Graph } from '../src/graph';

function makeCycle(): Graph {
  const g = new Graph();
  ['a','b','c','d'].forEach(n => g.addNode(n));
  g.addEdge('a','b',1); g.addEdge('b','c',2); g.addEdge('c','d',3); g.addEdge('d','a',4);
  return g;
}
function makeStar(): Graph {
  const g = new Graph();
  g.addNode('hub');
  ['a','b','c','d'].forEach(n => { g.addNode(n); g.addEdge('hub',n,1); });
  return g;
}

describe('Graph construction', () => {
  it('starts empty', () => { const g = new Graph(); expect(g.nodeCount()).toBe(0); expect(g.edgeCount()).toBe(0); });
  it('addNode increases count', () => { const g = new Graph(); g.addNode('x'); expect(g.nodeCount()).toBe(1); });
  it('addEdge increases count', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.edgeCount()).toBe(1); });
  it('hasNode true for added node', () => { const g = new Graph(); g.addNode('a'); expect(g.hasNode('a')).toBe(true); });
  it('hasNode false for missing', () => { expect(new Graph().hasNode('x')).toBe(false); });
  it('hasEdge true for added edge', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.hasEdge('a','b')).toBe(true); });
  it('hasEdge symmetric for undirected', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.hasEdge('b','a')).toBe(true); });
  it('hasEdge false for missing', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); expect(g.hasEdge('a','b')).toBe(false); });
  it('nodeIds returns all nodes', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); expect(g.nodeIds()).toHaveLength(3); });
  it('edges returns all edges', () => { expect(makeCycle().edges()).toHaveLength(4); });
  it('addNode with label stores label', () => { const g = new Graph(); g.addNode('a', undefined, 'Alpha'); expect(g.getNode('a').label).toBe('Alpha'); });
  it('addEdge with weight stores weight', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',5); expect(g.getEdge('a','b').weight).toBe(5); });
});

describe('Graph degree', () => {
  it('isolated node degree 0', () => { const g = new Graph(); g.addNode('a'); expect(g.degree('a')).toBe(0); });
  it('hub degree in star', () => { expect(makeStar().degree('hub')).toBe(4); });
  it('leaf degree in star', () => { expect(makeStar().degree('a')).toBe(1); });
  it('cycle node degree 2', () => { expect(makeCycle().degree('a')).toBe(2); });
  it('maxDegree correct', () => { expect(makeStar().maxDegree()).toBe(4); });
  it('minDegree correct', () => { expect(makeStar().minDegree()).toBe(1); });
  it('avgDegree correct for cycle', () => { expect(makeCycle().avgDegree()).toBe(2); });
  it('neighbors returns adjacent', () => { expect(makeCycle().neighbors('a').sort()).toEqual(['b','d'].sort()); });
  it('neighbors of isolated empty', () => { const g = new Graph(); g.addNode('x'); expect(g.neighbors('x')).toHaveLength(0); });
});

describe('Graph properties', () => {
  it('density of K4 is 1', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('a','c'); g.addEdge('a','d'); g.addEdge('b','c'); g.addEdge('b','d'); g.addEdge('c','d'); expect(g.density()).toBeCloseTo(1); });
  it('density of empty is 0', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); expect(g.density()).toBe(0); });
  it('isEmpty on fresh graph', () => { expect(new Graph().isEmpty()).toBe(true); });
  it('isEmpty after node', () => { const g = new Graph(); g.addNode('a'); expect(g.isEmpty()).toBe(false); });
  it('clone is independent', () => { const c = makeCycle().clone(); c.addNode('z'); expect(makeCycle().hasNode('z')).toBe(false); });
  it('clone same edges', () => { expect(makeCycle().clone().edgeCount()).toBe(4); });
  it('removeNode removes', () => { const g = makeCycle(); g.removeNode('a'); expect(g.hasNode('a')).toBe(false); });
  it('removeNode removes edges', () => { const g = makeCycle(); g.removeNode('a'); expect(g.edgeCount()).toBe(2); });
  it('removeEdge removes', () => { const g = makeCycle(); g.removeEdge('a','b'); expect(g.hasEdge('a','b')).toBe(false); });
  it('removeEdge preserves others', () => { const g = makeCycle(); g.removeEdge('a','b'); expect(g.edgeCount()).toBe(3); });
  it('complement has no original edges', () => { const comp = makeCycle().complement(); for (const e of makeCycle().edges()) expect(comp.hasEdge(e.source,e.target)).toBe(false); });
  it('subgraph has correct nodes', () => { expect(makeCycle().subgraph(['a','b']).nodeCount()).toBe(2); });
  it('nodes() returns objects', () => { const g = new Graph(); g.addNode('a', undefined, 'A'); expect(g.nodes()[0].label).toBe('A'); });
  it('getNode throws for missing', () => { expect(()=>new Graph().getNode('x')).toThrow(); });
  it('getEdge throws for missing', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); expect(()=>g.getEdge('a','b')).toThrow(); });
});

describe('Graph advanced', () => {
  it('clone creates independent copy', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); const c = g.clone(); c.addNode('x'); expect(g.hasNode('x')).toBe(false); });
  it('subgraph returns induced subgraph', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); const s = g.subgraph(['a','b']); expect(s.nodeCount()).toBe(2); expect(s.hasEdge('a','b')).toBe(true); });
  it('removeEdge decreases edgeCount', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); g.removeEdge('a','b'); expect(g.edgeCount()).toBe(0); });
  it('removeNode also removes edges', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); g.removeNode('a'); expect(g.edgeCount()).toBe(0); });
  it('nodeIds returns array of ids', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); expect(g.nodeIds().sort()).toEqual(['a','b']); });
  it('edges returns edge array', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',3); expect(g.edges()[0].weight).toBe(3); });
  it('getEdge returns edge data', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',5); expect(g.getEdge('a','b').weight).toBe(5); });
  it('maxDegree returns highest degree', () => { const g = new Graph(); g.addNode('hub'); ['a','b','c'].forEach(n=>{g.addNode(n);g.addEdge('hub',n);}); expect(g.maxDegree()).toBe(3); });
  it('minDegree returns lowest degree', () => { const g = new Graph(); g.addNode('hub'); ['a','b','c'].forEach(n=>{g.addNode(n);g.addEdge('hub',n);}); expect(g.minDegree()).toBe(1); });
  it('density of complete graph is 1', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(g.density()).toBeCloseTo(1); });
  it('density of empty edges is 0', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); expect(g.density()).toBe(0); });
  it('neighbors of isolated node is empty', () => { const g = new Graph(); g.addNode('x'); expect(g.neighbors('x')).toHaveLength(0); });
  it('hasEdge is symmetric', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.hasEdge('b','a')).toBe(true); });
  it('degree of hub in star', () => { const g = new Graph(); g.addNode('hub'); ['a','b','c'].forEach(n=>{g.addNode(n);g.addEdge('hub',n);}); expect(g.degree('hub')).toBe(3); });
  it('nodes() returns all nodes', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); expect(g.nodes()).toHaveLength(3); });
})

