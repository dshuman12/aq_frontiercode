import { Graph } from '../src/graph';
import { DiGraph } from '../src/digraph';
import { degreeCentrality, closenessCentrality, betweennessCentrality, clusteringCoefficient, pageRank, diameter, radius } from '../src/metrics';

function makeStar(): Graph { const g = new Graph(); g.addNode('hub'); ['a','b','c','d'].forEach(n => { g.addNode(n); g.addEdge('hub',n,1); }); return g; }
function makePath(): Graph { const g = new Graph(); ['a','b','c','d','e'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); g.addEdge('d','e'); return g; }
function makeTriangle(): Graph { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); return g; }
function makeDigraph(): DiGraph { const g = new DiGraph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('a','c'); g.addEdge('c','d'); return g; }

describe('degreeCentrality', () => {
  it('hub highest degree centrality', () => { const dc = degreeCentrality(makeStar()); expect(dc.get('hub')).toBeGreaterThan(dc.get('a')!); });
  it('all values in [0,1]', () => { for (const v of degreeCentrality(makeStar()).values()) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); } });
  it('empty graph empty map', () => { expect(degreeCentrality(new Graph()).size).toBe(0); });
  it('isolated has 0 centrality', () => { const g = new Graph(); g.addNode('x'); g.addNode('y'); expect(degreeCentrality(g).get('x')).toBe(0); });
  it('returns Map', () => { expect(degreeCentrality(makeStar()) instanceof Map).toBe(true); });
});

describe('closenessCentrality', () => {
  it('center of path has higher closeness', () => { const cc = closenessCentrality(makePath()); expect(cc.get('c')).toBeGreaterThan(cc.get('a')!); });
  it('hub has high closeness', () => { expect(closenessCentrality(makeStar()).get('hub')).toBeGreaterThan(closenessCentrality(makeStar()).get('a')!); });
  it('all values >= 0', () => { for (const v of closenessCentrality(makePath()).values()) expect(v).toBeGreaterThanOrEqual(0); });
  it('returns Map', () => { expect(closenessCentrality(makePath()) instanceof Map).toBe(true); });
});

describe('betweennessCentrality', () => {
  it('interior nodes higher betweenness', () => { const bc = betweennessCentrality(makePath()); expect(bc.get('c')).toBeGreaterThan(bc.get('a')!); });
  it('endpoints have 0 betweenness', () => { expect(betweennessCentrality(makePath()).get('a')).toBe(0); });
  it('all values >= 0', () => { for (const v of betweennessCentrality(makePath()).values()) expect(v).toBeGreaterThanOrEqual(0); });
  it('returns Map', () => { expect(betweennessCentrality(makePath()) instanceof Map).toBe(true); });
});

describe('clusteringCoefficient', () => {
  it('triangle coefficient is 1', () => { for (const v of clusteringCoefficient(makeTriangle()).values()) expect(v).toBeCloseTo(1); });
  it('path coefficient is 0', () => { for (const v of clusteringCoefficient(makePath()).values()) expect(v).toBe(0); });
  it('returns Map', () => { expect(clusteringCoefficient(makePath()) instanceof Map).toBe(true); });
  it('empty graph returns empty map', () => { expect(clusteringCoefficient(new Graph()).size).toBe(0); });
});

describe('pageRank on DiGraph', () => {
  it('all nodes have rank', () => { const pr = pageRank(makeDigraph()); for (const id of makeDigraph().nodeIds()) expect(pr.has(id)).toBe(true); });
  it('sums to ~1', () => { const sum = [...pageRank(makeDigraph()).values()].reduce((s,v)=>s+v,0); expect(Math.abs(sum-1)).toBeLessThan(0.01); });
  it('all positive', () => { for (const v of pageRank(makeDigraph()).values()) expect(v).toBeGreaterThan(0); });
  it('returns Map', () => { expect(pageRank(makeDigraph()) instanceof Map).toBe(true); });
});

describe('diameter and radius', () => {
  it('path diameter is 4', () => { expect(diameter(makePath())).toBe(4); });
  it('triangle diameter is 1', () => { expect(diameter(makeTriangle())).toBe(1); });
  it('diameter >= radius', () => { expect(diameter(makePath())).toBeGreaterThanOrEqual(radius(makePath())); });
  it('diameter returns number', () => { expect(typeof diameter(makeStar())).toBe('number'); });
  it('radius returns number', () => { expect(typeof radius(makeStar())).toBe('number'); });
});

describe('metrics advanced', () => {
  it('betweennessCentrality returns Map', () => { expect(betweennessCentrality(makeStar()) instanceof Map).toBe(true); });
  it('betweenness all nodes covered', () => { const bc = betweennessCentrality(makeStar()); for (const n of makeStar().nodeIds()) expect(bc.has(n)).toBe(true); });
  it('betweenness non-negative', () => { for (const v of betweennessCentrality(makeStar()).values()) expect(v).toBeGreaterThanOrEqual(0); });
  it('degreeCentrality all nodes covered', () => { const dc = degreeCentrality(makeStar()); for (const n of makeStar().nodeIds()) expect(dc.has(n)).toBe(true); });
  it('degreeCentrality in [0,1]', () => { for (const v of degreeCentrality(makeStar()).values()) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); } });
  it('closenessCentrality all nodes covered', () => { const cc = closenessCentrality(makeStar()); for (const n of makeStar().nodeIds()) expect(cc.has(n)).toBe(true); });
  it('closenessCentrality non-negative', () => { for (const v of closenessCentrality(makeStar()).values()) expect(v).toBeGreaterThanOrEqual(0); });
  it('pageRank sums to ~1', () => { const pr = pageRank(makeDigraph()); const sum = [...pr.values()].reduce((s,v)=>s+v,0); expect(Math.abs(sum-1)).toBeLessThan(0.01); });
  it('clusteringCoefficient all nodes covered', () => { const cc = clusteringCoefficient(makeStar()); for (const n of makeStar().nodeIds()) expect(cc.has(n)).toBe(true); });
  it('clusteringCoefficient in [0,1]', () => { for (const v of clusteringCoefficient(makeStar()).values()) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); } });
})

