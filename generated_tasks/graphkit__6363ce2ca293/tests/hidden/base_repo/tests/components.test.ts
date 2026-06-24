import { Graph } from '../src/graph';
import { DiGraph } from '../src/digraph';
import { connectedComponents, stronglyConnectedComponents, articulationPoints, bridges, isConnected, biconnectedComponents, isBipartite } from '../src/components';

function makePath(): Graph { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); return g; }
function makeDisconnected(): Graph { const g = new Graph(); ['a','b','c','x','y'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('x','y'); return g; }
function makeBipartite(): Graph { const g = new Graph(); ['l1','l2','r1','r2'].forEach(n=>g.addNode(n)); g.addEdge('l1','r1'); g.addEdge('l1','r2'); g.addEdge('l2','r1'); return g; }
function makeTriangle(): Graph { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); return g; }

describe('connectedComponents', () => {
  it('path has 1 component', () => { expect(connectedComponents(makePath()).count).toBe(1); });
  it('disconnected has 2 components', () => { expect(connectedComponents(makeDisconnected()).count).toBe(2); });
  it('largestComponent has 3 nodes', () => { expect(connectedComponents(makeDisconnected()).largestComponent).toHaveLength(3); });
  it('all nodes covered', () => { const r = connectedComponents(makeDisconnected()); const total = r.components.reduce((s,c)=>s+c.length,0); expect(total).toBe(5); });
  it('single node is 1 component', () => { const g = new Graph(); g.addNode('x'); expect(connectedComponents(g).count).toBe(1); });
  it('componentOf map populated', () => { expect(connectedComponents(makePath()).componentOf.size).toBe(4); });
});

describe('stronglyConnectedComponents', () => {
  it('cyclic digraph 1 SCC', () => { const g = new DiGraph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(stronglyConnectedComponents(g).count).toBe(1); });
  it('DAG has n SCCs', () => { const g = new DiGraph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); expect(stronglyConnectedComponents(g).count).toBe(3); });
  it('all nodes in componentOf', () => { const g = new DiGraph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); expect(stronglyConnectedComponents(g).componentOf.size).toBe(3); });
  it('components array not empty', () => { const g = new DiGraph(); ['a','b'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); expect(stronglyConnectedComponents(g).components.length).toBeGreaterThan(0); });
});

describe('articulationPoints', () => {
  it('path interior nodes are APs', () => { const aps = articulationPoints(makePath()); expect(aps).toContain('b'); expect(aps).toContain('c'); });
  it('triangle has no APs', () => { expect(articulationPoints(makeTriangle())).toHaveLength(0); });
  it('returns array', () => { expect(Array.isArray(articulationPoints(makePath()))).toBe(true); });
  it('endpoints not APs in path', () => { expect(articulationPoints(makePath())).not.toContain('a'); });
});

describe('bridges', () => {
  it('path edges are bridges', () => { expect(bridges(makePath()).length).toBe(3); });
  it('triangle has no bridges', () => { expect(bridges(makeTriangle())).toHaveLength(0); });
  it('returns array', () => { expect(Array.isArray(bridges(makePath()))).toBe(true); });
});

describe('isBipartite', () => {
  it('bipartite graph detected', () => { expect(isBipartite(makeBipartite()).bipartite).toBe(true); });
  it('triangle not bipartite', () => { expect(isBipartite(makeTriangle()).bipartite).toBe(false); });
  it('path is bipartite', () => { expect(isBipartite(makePath()).bipartite).toBe(true); });
  it('empty graph is bipartite', () => { expect(isBipartite(new Graph()).bipartite).toBe(true); });
});

describe('isConnected', () => {
  it('path is connected', () => { expect(isConnected(makePath())).toBe(true); });
  it('disconnected is false', () => { expect(isConnected(makeDisconnected())).toBe(false); });
  it('single node is connected', () => { const g = new Graph(); g.addNode('x'); expect(isConnected(g)).toBe(true); });
});

describe('components advanced', () => {
  it('connected graph has 1 component', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); expect(connectedComponents(g).count).toBe(1); });
  it('two isolated components', () => { const g = new Graph(); ['a','b','x','y'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('x','y'); expect(connectedComponents(g).count).toBe(2); });
  it('articulation points in path', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); expect(articulationPoints(g)).toContain('b'); });
  it('bridges in path', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); const br = bridges(g); expect(br.length).toBeGreaterThan(0); });
  it('empty graph has 0 components', () => { expect(connectedComponents(new Graph()).count).toBe(0); });
  it('single node is one component', () => { const g = new Graph(); g.addNode('x'); expect(connectedComponents(g).count).toBe(1); });
  it('triangle has no articulation points', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(articulationPoints(g)).toHaveLength(0); });
  it('triangle has no bridges', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(bridges(g)).toHaveLength(0); });
  it('isBipartite true for path', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); expect(isBipartite(g).bipartite).toBe(true); });
  it('isBipartite false for triangle', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(isBipartite(g).bipartite).toBe(false); });
})

describe('components extended', () => {
  it('biconnectedComponents returns array', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); g.addEdge('c','d'); expect(Array.isArray(biconnectedComponents(g))).toBe(true); });
  it('stronglyConnectedComponents cycle has 1 scc', () => { const g = new DiGraph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(stronglyConnectedComponents(g).count).toBe(1); });
  it('stronglyConnectedComponents path has 3 sccs', () => { const g = new DiGraph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); expect(stronglyConnectedComponents(g).count).toBe(3); });
  it('isConnected true for triangle', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(isConnected(g)).toBe(true); });
})

