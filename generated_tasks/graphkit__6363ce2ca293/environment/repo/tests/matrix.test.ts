import { Graph } from '../src/graph';
import { toAdjacencyMatrix, fromAdjacencyMatrix, toLaplacianMatrix, toIncidenceMatrix, matrixMultiply, matrixPower, spectralRadius } from '../src/matrix';

function makeTriangle(): Graph { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); g.addEdge('b','c',1); g.addEdge('c','a',1); return g; }
function makePath(): Graph { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); g.addEdge('b','c',1); return g; }

describe('toAdjacencyMatrix', () => {
  it('triangle matrix is 3x3', () => { const r = toAdjacencyMatrix(makeTriangle()); expect(r.matrix).toHaveLength(3); expect(r.matrix[0]).toHaveLength(3); });
  it('diagonal is 0', () => { const {matrix} = toAdjacencyMatrix(makeTriangle()); for (let i=0;i<3;i++) expect(matrix[i][i]).toBe(0); });
  it('symmetric for undirected', () => { const {matrix} = toAdjacencyMatrix(makeTriangle()); expect(matrix[0][1]).toBe(matrix[1][0]); });
  it('has nodes array', () => { expect(toAdjacencyMatrix(makeTriangle()).nodes).toHaveLength(3); });
  it('row sum equals degree', () => { const {matrix} = toAdjacencyMatrix(makeTriangle()); const rowSum = matrix[0].reduce((s,v)=>s+v,0); expect(rowSum).toBe(2); });
  it('single node is 1x1 zero', () => { const g = new Graph(); g.addNode('x'); expect(toAdjacencyMatrix(g).matrix[0][0]).toBe(0); });
});

describe('fromAdjacencyMatrix', () => {
  it('roundtrip node count', () => { const am = toAdjacencyMatrix(makeTriangle()); expect(fromAdjacencyMatrix(am.matrix, am.nodes).nodeCount()).toBe(3); });
  it('roundtrip has edges', () => { const am = toAdjacencyMatrix(makeTriangle()); expect(fromAdjacencyMatrix(am.matrix, am.nodes).edgeCount()).toBeGreaterThan(0); });
});

describe('toLaplacianMatrix', () => {
  it('triangle laplacian is 3x3', () => { expect(toLaplacianMatrix(makeTriangle())).toHaveLength(3); });
  it('row sums are 0', () => { const L = toLaplacianMatrix(makeTriangle()); for (const row of L) expect(row.reduce((s,v)=>s+v,0)).toBeCloseTo(0); });
  it('off-diagonal non-positive', () => { const L = toLaplacianMatrix(makeTriangle()); for (let i=0;i<3;i++) for (let j=0;j<3;j++) if (i!==j) expect(L[i][j]).toBeLessThanOrEqual(0); });
  it('diagonal is degree', () => { const L = toLaplacianMatrix(makeTriangle()); for (let i=0;i<3;i++) expect(L[i][i]).toBe(2); });
});

describe('toIncidenceMatrix', () => {
  it('triangle incidence correct shape', () => { const r = toIncidenceMatrix(makeTriangle()); expect(r.matrix).toHaveLength(3); });
  it('has edges array', () => { expect(toIncidenceMatrix(makeTriangle()).edges).toHaveLength(3); });
  it('each column 2 entries', () => { const {matrix} = toIncidenceMatrix(makeTriangle()); for (let j=0;j<3;j++) { const sum = matrix.reduce((s,row)=>s+Math.abs(row[j]),0); expect(sum).toBe(2); } });
});

describe('matrixMultiply', () => {
  it('identity times matrix equals matrix', () => { const I=[[1,0],[0,1]], A=[[1,2],[3,4]]; const r = matrixMultiply(I,A); expect(r[0]).toEqual([1,2]); });
  it('2x2 multiplication', () => { const r = matrixMultiply([[1,2],[3,4]],[[2,0],[1,3]]); expect(r[0][0]).toBe(4); expect(r[0][1]).toBe(6); });
  it('result dimensions', () => { expect(matrixMultiply([[1,2,3],[4,5,6]],[[1,2],[3,4],[5,6]])).toHaveLength(2); });
  it('zero matrix result', () => { expect(matrixMultiply([[1,0],[0,1]],[[0,0],[0,0]])[0]).toEqual([0,0]); });
});

describe('matrixPower', () => {
  it('power 0 is identity', () => { const r = matrixPower([[1,1],[1,0]], 0); expect(r[0][0]).toBe(1); expect(r[0][1]).toBe(0); });
  it('power 1 equals original', () => { const r = matrixPower([[1,2],[3,4]], 1); expect(r[0][0]).toBe(1); expect(r[1][1]).toBe(4); });
  it('power 2 is A*A for Fibonacci', () => { const r = matrixPower([[1,1],[1,0]], 2); expect(r[0][0]).toBe(2); });
});

describe('spectralRadius', () => {
  it('triangle spectral radius positive', () => { const {matrix} = toAdjacencyMatrix(makeTriangle()); expect(spectralRadius(makeTriangle())).toBeGreaterThan(0); });
  it('returns number', () => { expect(typeof spectralRadius(makePath())).toBe('number'); });
  it('path spectral radius ~sqrt(2)', () => { expect(spectralRadius(makePath())).toBeCloseTo(Math.sqrt(2), 0); });
});

describe('matrix advanced', () => {
  it('adjacency matrix has correct dimensions', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); const m = toAdjacencyMatrix(g); expect(m.matrix.length).toBe(3); });
  it('adjacency matrix is symmetric for undirected', () => { const g = new Graph(); ['a','b'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); const m = toAdjacencyMatrix(g); expect(m.matrix[0][1]).toBe(m.matrix[1][0]); });
  it('laplacian has correct dimensions', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); const L = toLaplacianMatrix(g); expect(L.length).toBe(3); expect(L[0].length).toBe(3); });
  it('spectralRadius is non-negative', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','a'); expect(spectralRadius(g)).toBeGreaterThanOrEqual(0); });
  it('matrixMultiply identity preserves matrix', () => { const id = [[1,0],[0,1]]; const m = [[2,3],[4,5]]; const result = matrixMultiply(m, id); expect(result[0][0]).toBe(2); expect(result[1][1]).toBe(5); });
  it('matrixPower 0 gives identity', () => { const m = [[1,2],[3,4]]; const p = matrixPower(m, 0); expect(p[0][0]).toBe(1); expect(p[1][1]).toBe(1); expect(p[0][1]).toBe(0); });
  it('incidence matrix has correct column count', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); const inc = toIncidenceMatrix(g); expect(inc.matrix[0].length).toBe(2); });
})

