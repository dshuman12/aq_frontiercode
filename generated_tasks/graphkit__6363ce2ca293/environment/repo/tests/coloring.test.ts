import { Graph } from '../src/graph';
import { greedyColoring, dsaturColoring, backtrackingColoring, twoColorBipartite, validateColoring } from '../src/coloring';

function makeTriangle(): Graph { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); return g; }
function makeK4(): Graph { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('a','c'); g.addEdge('a','d'); g.addEdge('b','c'); g.addEdge('b','d'); g.addEdge('c','d'); return g; }
function makePath(): Graph { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); return g; }

describe('greedyColoring', () => {
  it('triangle needs >=3 colors', () => { expect(greedyColoring(makeTriangle()).chromaticNumber).toBeGreaterThanOrEqual(3); });
  it('path needs 2 colors', () => { expect(greedyColoring(makePath()).chromaticNumber).toBe(2); });
  it('K4 needs 4 colors', () => { expect(greedyColoring(makeK4()).chromaticNumber).toBe(4); });
  it('coloring valid for triangle', () => { expect(greedyColoring(makeTriangle()).isValid).toBe(true); });
  it('coloring valid for K4', () => { expect(greedyColoring(makeK4()).isValid).toBe(true); });
  it('empty graph chromatic 0', () => { expect(greedyColoring(new Graph()).chromaticNumber).toBe(0); });
  it('single node needs 1 color', () => { const g = new Graph(); g.addNode('a'); expect(greedyColoring(g).chromaticNumber).toBe(1); });
  it('all nodes get a color', () => { const c = greedyColoring(makeK4()); for (const id of makeK4().nodeIds()) expect(c.coloring.has(id)).toBe(true); });
});

describe('dsaturColoring', () => {
  it('valid for triangle', () => { expect(dsaturColoring(makeTriangle()).isValid).toBe(true); });
  it('valid for K4', () => { expect(dsaturColoring(makeK4()).isValid).toBe(true); });
  it('chromatic >=3 for triangle', () => { expect(dsaturColoring(makeTriangle()).chromaticNumber).toBeGreaterThanOrEqual(3); });
  it('chromatic 2 for path', () => { expect(dsaturColoring(makePath()).chromaticNumber).toBe(2); });
});

describe('backtrackingColoring', () => {
  it('triangle feasible with 3 colors', () => { expect(backtrackingColoring(makeTriangle(), 3)).not.toBeNull(); });
  it('triangle infeasible with 2 colors', () => { expect(backtrackingColoring(makeTriangle(), 2)).toBeNull(); });
  it('K4 infeasible with 3 colors', () => { expect(backtrackingColoring(makeK4(), 3)).toBeNull(); });
  it('K4 feasible with 4 colors', () => { expect(backtrackingColoring(makeK4(), 4)).not.toBeNull(); });
  it('result has coloring map', () => { expect(backtrackingColoring(makeTriangle(), 3)!.coloring instanceof Map).toBe(true); });
});

describe('twoColorBipartite', () => {
  it('path gets 2-colored', () => { expect(twoColorBipartite(makePath())).not.toBeNull(); });
  it('triangle cannot be 2-colored', () => { expect(twoColorBipartite(makeTriangle())).toBeNull(); });
  it('result is valid', () => { expect(twoColorBipartite(makePath())!.isValid).toBe(true); });
  it('uses 2 colors for path', () => { expect(twoColorBipartite(makePath())!.chromaticNumber).toBe(2); });
});

describe('validateColoring', () => {
  it('valid coloring returns true', () => { expect(validateColoring(makeTriangle(), greedyColoring(makeTriangle()).coloring)).toBe(true); });
  it('adjacent same color returns false', () => { const bad = new Map([['a',0],['b',0],['c',1]]); expect(validateColoring(makeTriangle(), bad)).toBe(false); });
});

describe('coloring advanced', () => {
  it('greedyColoring empty graph', () => { expect(greedyColoring(new Graph()).chromaticNumber).toBe(0); });
  it('greedyColoring single node has chromatic 1', () => { const g = new Graph(); g.addNode('x'); expect(greedyColoring(g).chromaticNumber).toBe(1); });
  it('dsaturColoring chromatic <= n', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); const r = dsaturColoring(g); expect(r.chromaticNumber).toBeLessThanOrEqual(3); });
  it('greedyColoring path needs 2 colors', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); expect(greedyColoring(g).chromaticNumber).toBe(2); });
  it('twoColorBipartite returns result', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('c','d'); const r = twoColorBipartite(g); expect(r).not.toBeNull(); });
  it('backtrackingColoring triangle needs 3', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); const r = backtrackingColoring(g,3); expect(r).not.toBeNull(); if (r) expect(r.chromaticNumber).toBeLessThanOrEqual(3); });
})

describe('coloring extended', () => {
  it('greedyColoring complete K5 needs 5', () => { const g = new Graph(); ['a','b','c','d','e'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('a','c'); g.addEdge('a','d'); g.addEdge('a','e'); g.addEdge('b','c'); g.addEdge('b','d'); g.addEdge('b','e'); g.addEdge('c','d'); g.addEdge('c','e'); g.addEdge('d','e'); expect(greedyColoring(g).chromaticNumber).toBe(5); });
  it('dsaturColoring even cycle needs 2', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); g.addEdge('d','a'); expect(dsaturColoring(g).chromaticNumber).toBe(2); });
  it('twoColorBipartite even path is bipartite', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); const r = twoColorBipartite(g); expect(r).not.toBeNull(); if (r) expect(r.isValid).toBe(true); });
  it('twoColorBipartite odd cycle is null', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(twoColorBipartite(g)).toBeNull(); });
  it('greedyColoring isValid', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); expect(greedyColoring(g).isValid).toBe(true); });
})

