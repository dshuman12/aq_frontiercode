import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId } from './types';

type AnyGraph = Graph | DiGraph;

export interface AdjacencyMatrix {
  nodes: NodeId[];
  matrix: number[][];
  get(i: number, j: number): number;
  indexOf(id: NodeId): number;
}

export interface IncidenceMatrix {
  nodes: NodeId[];
  edges: string[];
  matrix: number[][];
}

export function toAdjacencyMatrix(g: AnyGraph): AdjacencyMatrix {
  const nodes = g.nodeIds();
  const n = nodes.length;
  const idx = new Map(nodes.map((id, i) => [id, i]));
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const edge of g.edges()) {
    const si = idx.get(edge.source)!, ti = idx.get(edge.target)!;
    const w = typeof edge.weight === 'number' ? edge.weight : 1;
    matrix[si][ti] = w;
    if (!(g instanceof DiGraph)) matrix[ti][si] = w;
  }

  return {
    nodes,
    matrix,
    get(i: number, j: number): number { return matrix[i][j]; },
    indexOf(id: NodeId): number { return idx.get(id) ?? -1; },
  };
}

export function fromAdjacencyMatrix(matrix: number[][], nodeIds?: NodeId[]): Graph {
  const n = matrix.length;
  const ids: NodeId[] = nodeIds ?? Array.from({ length: n }, (_, i) => i);
  const g = new Graph({ allowMultiEdges: false });
  for (const id of ids) g.addNode(id);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] !== 0) g.addEdge(ids[i], ids[j], matrix[i][j]);
    }
  }
  return g;
}

export function toLaplacianMatrix(g: Graph): number[][] {
  const nodes = g.nodeIds();
  const n = nodes.length;
  const adj = toAdjacencyMatrix(g);
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let degree = 0;
    for (let j = 0; j < n; j++) { if (i !== j && adj.matrix[i][j] !== 0) { L[i][j] = -adj.matrix[i][j]; degree += adj.matrix[i][j]; } }
    L[i][i] = degree;
  }
  return L;
}

export function toIncidenceMatrix(g: Graph): IncidenceMatrix {
  const nodes = g.nodeIds();
  const edges = g.edges();
  const n = nodes.length;
  const m = edges.length;
  const nodeIdx = new Map(nodes.map((id, i) => [id, i]));
  const matrix: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));

  edges.forEach((edge, j) => {
    const si = nodeIdx.get(edge.source)!, ti = nodeIdx.get(edge.target)!;
    matrix[si][j] = 1;
    matrix[ti][j] = 1;
  });

  return { nodes, edges: edges.map(e => e.id), matrix };
}

export function matrixMultiply(a: number[][], b: number[][]): number[][] {
  const n = a.length, m = b[0].length, k = b.length;
  const result: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) for (let l = 0; l < k; l++) result[i][j] += a[i][l] * b[l][j];
  return result;
}

export function matrixPower(m: number[][], p: number): number[][] {
  const n = m.length;
  let result: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  let base = m.map(row => [...row]);
  let exp = p;
  while (exp > 0) {
    if (exp % 2 === 1) result = matrixMultiply(result, base);
    base = matrixMultiply(base, base);
    exp = Math.floor(exp / 2);
  }
  return result;
}

export function countPathsOfLength(g: AnyGraph, length: number): Map<string, number> {
  const nodes = g.nodeIds();
  const adj = toAdjacencyMatrix(g);
  const powered = matrixPower(adj.matrix, length);
  const result = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (powered[i][j] > 0) result.set(`${nodes[i]}->${nodes[j]}`, powered[i][j]);
    }
  }
  return result;
}

export function spectralRadius(g: Graph): number {
  const adj = toAdjacencyMatrix(g);
  const n = adj.nodes.length;
  if (n === 0) return 0;
  let v = new Array(n).fill(1 / Math.sqrt(n));
  for (let iter = 0; iter < 100; iter++) {
    const nv = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nv[i] += adj.matrix[i][j] * v[j];
    const norm = Math.sqrt(nv.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-10) break;
    for (let i = 0; i < n; i++) v[i] = nv[i] / norm;
    const eigenvalue = v.reduce((s, x, i) => s + x * nv[i], 0);
    if (iter > 50 && Math.abs(eigenvalue - eigenvalue) < 1e-8) return eigenvalue;
  }
  const Av = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Av[i] += adj.matrix[i][j] * v[j];
  return v.reduce((s, x, i) => s + x * Av[i], 0);
}

