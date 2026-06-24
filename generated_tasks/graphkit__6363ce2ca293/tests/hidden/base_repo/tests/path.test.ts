import { Graph } from '../src/graph';
import { isEulerian, eulerianCircuit, eulerianPath, hamiltonianPath, hasHamiltonianPath, pathLength, isSimplePath, isCycle, allPaths } from '../src/path';

function makeEulerian(): Graph { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); g.addEdge('b','c',1); g.addEdge('c','a',1); return g; }
function makePath(): Graph { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); g.addEdge('b','c',1); g.addEdge('c','d',1); return g; }
function makeEulerPath(): Graph { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); g.addEdge('b','c',1); g.addEdge('c','d',1); g.addEdge('b','d',1); return g; }

describe('Eulerian', () => {
  it('triangle has Eulerian circuit', () => { expect(isEulerian(makeEulerian())).toBe(true); });
  it('path graph is not Eulerian', () => { expect(isEulerian(makePath())).toBe(false); });
  it('eulerianCircuit returns array', () => { expect(Array.isArray(eulerianCircuit(makeEulerian()))).toBe(true); });
  it('eulerianCircuit non-empty for eulerian', () => { expect(eulerianCircuit(makeEulerian()).length).toBeGreaterThan(0); });
  it('eulerianCircuit empty for non-eulerian', () => { expect(eulerianCircuit(makePath())).toHaveLength(0); });
  it('eulerianPath returns array', () => { expect(Array.isArray(eulerianPath(makeEulerPath()))).toBe(true); });
});

describe('Hamiltonian', () => {
  it('path graph has hamiltonian path', () => { expect(hasHamiltonianPath(makePath())).toBe(true); });
  it('hamiltonianPath length equals nodeCount', () => { const hp = hamiltonianPath(makePath())!; expect(hp.length).toBe(4); });
  it('hamiltonianPath not null for path graph', () => { expect(hamiltonianPath(makePath())).not.toBeNull(); });
  it('single node has hamiltonian path', () => { const g = new Graph(); g.addNode('a'); expect(hasHamiltonianPath(g)).toBe(true); });
});

describe('pathLength', () => {
  it('3-edge path has length 3', () => { expect(pathLength(makePath(), ['a','b','c','d'])).toBe(3); });
  it('empty path length 0', () => { expect(pathLength(makePath(), [])).toBe(0); });
  it('single node path length 0', () => { expect(pathLength(makePath(), ['a'])).toBe(0); });
  it('weighted path uses weights', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',5); expect(pathLength(g, ['a','b'])).toBe(5); });
});

describe('isSimplePath', () => {
  it('linear path is simple', () => { expect(isSimplePath(['a','b','c','d'])).toBe(true); });
  it('repeated node is not simple', () => { expect(isSimplePath(['a','b','a','c'])).toBe(false); });
  it('empty path is simple', () => { expect(isSimplePath([])).toBe(true); });
  it('single node is simple', () => { expect(isSimplePath(['a'])).toBe(true); });
});

describe('isCycle', () => {
  it('triangle path is a cycle', () => { expect(isCycle(makeEulerian(), ['a','b','c','a'])).toBe(true); });
  it('path without return is not cycle', () => { expect(isCycle(makePath(), ['a','b','c'])).toBe(false); });
});

describe('allPaths', () => {
  it('finds paths between connected nodes', () => { expect(allPaths(makePath(), 'a', 'd').length).toBeGreaterThan(0); });
  it('disconnected nodes have no paths', () => { const g = new Graph(); g.addNode('x'); g.addNode('y'); expect(allPaths(g,'x','y')).toHaveLength(0); });
  it('all paths start correctly', () => { for (const p of allPaths(makePath(),'a','d')) expect(p[0]).toBe('a'); });
  it('all paths end correctly', () => { for (const p of allPaths(makePath(),'a','d')) expect(p[p.length-1]).toBe('d'); });
});

describe('path advanced', () => {
  it('eulerianCircuit returns valid cycle', () => { const g = makeEulerian(); const c = eulerianCircuit(g); if (c && c.length > 0) { expect(c[0]).toBe(c[c.length-1]); } });
  it('pathLength returns number', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',5); expect(pathLength(g,['a','b'])).toBe(5); });
  it('isSimplePath true for path', () => { expect(isSimplePath(['a','b','c'])).toBe(true); });
  it('isSimplePath false with repeated node', () => { expect(isSimplePath(['a','b','a'])).toBe(false); });
  it('allPaths between adjacent returns at least 1 path', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); const paths = allPaths(g,'a','b',3); expect(paths.length).toBeGreaterThan(0); });
  it('allPaths on disconnected returns empty', () => { const g = new Graph(); g.addNode('x'); g.addNode('y'); expect(allPaths(g,'x','y',3)).toHaveLength(0); });
  it('hasHamiltonianPath true for path', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); expect(hasHamiltonianPath(g)).toBe(true); });
  it('isCycle true for closed walk', () => { expect(isCycle(makeEulerian(),['a','b','c','a'])).toBe(true); });
  it('pathLength of empty path is 0', () => { const g = new Graph(); g.addNode('a'); expect(pathLength(g,['a'])).toBe(0); });
  it('isEulerian returns boolean', () => { expect(typeof isEulerian(makeEulerian())).toBe('boolean'); });
})

