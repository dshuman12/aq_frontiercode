import { DiGraph } from '../src/digraph';

function makeDAG(): DiGraph {
  const g = new DiGraph();
  ['a','b','c','d','e'].forEach(n => g.addNode(n));
  g.addEdge('a','b'); g.addEdge('a','c'); g.addEdge('b','d'); g.addEdge('c','d'); g.addEdge('d','e');
  return g;
}
function makeCyclic(): DiGraph {
  const g = new DiGraph();
  ['a','b','c'].forEach(n => g.addNode(n));
  g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a');
  return g;
}

describe('DiGraph basics', () => {
  it('addEdge is directional', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.hasEdge('a','b')).toBe(true); expect(g.hasEdge('b','a')).toBe(false); });
  it('successors returns out-neighbors', () => { expect(makeDAG().successors('a').sort()).toEqual(['b','c'].sort()); });
  it('predecessors returns in-neighbors', () => { expect(makeDAG().predecessors('d').sort()).toEqual(['b','c'].sort()); });
  it('inDegree is correct', () => { expect(makeDAG().inDegree('d')).toBe(2); });
  it('outDegree is correct', () => { expect(makeDAG().outDegree('a')).toBe(2); });
  it('source node has inDegree 0', () => { expect(makeDAG().inDegree('a')).toBe(0); });
  it('sink node has outDegree 0', () => { expect(makeDAG().outDegree('e')).toBe(0); });
  it('isDAG returns true for DAG', () => { expect(makeDAG().isDAG()).toBe(true); });
  it('isDAG returns false for cyclic', () => { expect(makeCyclic().isDAG()).toBe(false); });
  it('topoSort returns valid order for DAG', () => { const order = makeDAG().topoSort(); expect(order.indexOf('a')).toBeLessThan(order.indexOf('b')); expect(order.indexOf('b')).toBeLessThan(order.indexOf('d')); });
  it('topoSort throws for cyclic graph', () => { expect(() => makeCyclic().topoSort()).toThrow(); });
  it('edgeCount is correct', () => { expect(makeDAG().edgeCount()).toBe(5); });
  it('nodeCount is correct', () => { expect(makeDAG().nodeCount()).toBe(5); });
  it('reverse swaps direction', () => { const r = makeDAG().reverse(); expect(r.hasEdge('b','a')).toBe(true); expect(r.hasEdge('a','b')).toBe(false); });
  it('reverse preserves edge count', () => { expect(makeDAG().reverse().edgeCount()).toBe(makeDAG().edgeCount()); });
  it('density is non-negative', () => { expect(makeDAG().density()).toBeGreaterThanOrEqual(0); });
  it('clone is independent', () => { const c = makeDAG().clone(); c.addNode('z'); expect(makeDAG().hasNode('z')).toBe(false); });
});

describe('DiGraph SCC', () => {
  it('cyclic digraph has 1 SCC', () => { expect(makeCyclic().stronglyConnectedComponents().length).toBe(1); });
  it('DAG has n SCCs', () => { expect(makeDAG().stronglyConnectedComponents().length).toBe(makeDAG().nodeCount()); });
  it('SCC covers all nodes', () => { const sccs = makeDAG().stronglyConnectedComponents(); const total = sccs.reduce((s,c)=>s+c.length,0); expect(total).toBe(makeDAG().nodeCount()); });
});

describe('DiGraph weakly connected', () => {
  it('DAG is weakly connected', () => { expect(makeDAG().weaklyConnectedComponents().length).toBe(1); });
  it('two components when disconnected', () => { const g = new DiGraph(); ['a','b','x','y'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('x','y'); expect(g.weaklyConnectedComponents().length).toBe(2); });
});

describe('DiGraph topoSort', () => {
  it('a before b', () => { const t = makeDAG().topoSort(); expect(t.indexOf('a')).toBeLessThan(t.indexOf('b')); });
  it('a before c', () => { const t = makeDAG().topoSort(); expect(t.indexOf('a')).toBeLessThan(t.indexOf('c')); });
  it('d before e', () => { const t = makeDAG().topoSort(); expect(t.indexOf('d')).toBeLessThan(t.indexOf('e')); });
  it('all nodes in result', () => { expect(makeDAG().topoSort()).toHaveLength(5); });
});

describe('DiGraph advanced', () => {
  it('clone is independent', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); const c = g.clone(); c.addNode('x'); expect(g.hasNode('x')).toBe(false); });
  it('reverse of reverse equals original direction', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.reverse().reverse().hasEdge('a','b')).toBe(true); });
  it('nodeIds returns all nodes', () => { const g = new DiGraph(); ['a','b','c'].forEach(n=>g.addNode(n)); expect(g.nodeIds()).toHaveLength(3); });
  it('addNode returns this', () => { const g = new DiGraph(); expect(g.addNode('a')).toBe(g); });
  it('addEdge returns edge id string', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); expect(typeof g.addEdge('a','b')).toBe('string'); });
  it('edgeCount increments', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.edgeCount()).toBe(1); });
  it('outDegree of source in path is 1', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.outDegree('a')).toBe(1); });
  it('inDegree of source in path is 0', () => { const g = new DiGraph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(g.inDegree('a')).toBe(0); });
  it('single node DAG', () => { const g = new DiGraph(); g.addNode('x'); expect(g.isDAG()).toBe(true); });
  it('empty graph isDAG', () => { expect(new DiGraph().isDAG()).toBe(true); });
})

