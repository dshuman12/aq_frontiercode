import { Graph } from './graph';
import { DiGraph } from './digraph';
import { NodeId } from './types';

export function generateComplete(n: number): Graph {
  const g = new Graph();
  for (let i = 0; i < n; i++) g.addNode(i);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) g.addEdge(i, j, 1);
  }
  return g;
}

export function generatePath(n: number): Graph {
  const g = new Graph();
  for (let i = 0; i < n; i++) g.addNode(i);
  for (let i = 0; i < n - 1; i++) g.addEdge(i, i + 1, 1);
  return g;
}

export function generateCycle(n: number): Graph {
  const g = generatePath(n);
  if (n > 2) g.addEdge(n - 1, 0, 1);
  return g;
}

export function generateStar(n: number): Graph {
  const g = new Graph();
  g.addNode(0);
  for (let i = 1; i <= n; i++) { g.addNode(i); g.addEdge(0, i, 1); }
  return g;
}

export function generateGrid(rows: number, cols: number): Graph {
  const g = new Graph();
  const id = (r: number, c: number): number => r * cols + c;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.addNode(id(r, c));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) g.addEdge(id(r, c), id(r, c + 1), 1);
      if (r + 1 < rows) g.addEdge(id(r, c), id(r + 1, c), 1);
    }
  }
  return g;
}

export function generatePetersen(): Graph {
  const g = new Graph();
  for (let i = 0; i < 10; i++) g.addNode(i);
  const outer = [[0,1],[1,2],[2,3],[3,4],[4,0]];
  const inner = [[5,7],[7,9],[9,6],[6,8],[8,5]];
  const spokes = [[0,5],[1,6],[2,7],[3,8],[4,9]];
  for (const [a, b] of [...outer, ...inner, ...spokes]) g.addEdge(a, b, 1);
  return g;
}

export function generateBipartite(n1: number, n2: number, complete = false): Graph {
  const g = new Graph();
  for (let i = 0; i < n1; i++) g.addNode(`l${i}`);
  for (let i = 0; i < n2; i++) g.addNode(`r${i}`);
  if (complete) {
    for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) g.addEdge(`l${i}`, `r${j}`, 1);
  }
  return g;
}

export function generateRandom(n: number, edgeProbability = 0.3, seed = 42): Graph {
  const g = new Graph({ allowMultiEdges: false });
  for (let i = 0; i < n; i++) g.addNode(i);
  let s = seed;
  const rng = (): number => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return Math.abs(s) / 0xFFFFFFFF; };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng() < edgeProbability) g.addEdge(i, j, Math.floor(rng() * 10) + 1);
    }
  }
  return g;
}

export function generateRandomDAG(n: number, edgeProbability = 0.3, seed = 42): DiGraph {
  const g = new DiGraph();
  for (let i = 0; i < n; i++) g.addNode(i);
  let s = seed;
  const rng = (): number => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return Math.abs(s) / 0xFFFFFFFF; };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng() < edgeProbability) g.addEdge(i, j, Math.floor(rng() * 10) + 1);
    }
  }
  return g;
}

export function generateBarabasiAlbert(n: number, m: number): Graph {
  const g = new Graph({ allowMultiEdges: false });
  if (n === 0) return g;
  const initial = Math.min(m + 1, n);
  for (let i = 0; i < initial; i++) {
    g.addNode(i);
    for (let j = 0; j < i; j++) if (!g.hasEdge(i, j)) g.addEdge(i, j, 1);
  }
  for (let i = initial; i < n; i++) {
    g.addNode(i);
    const degrees = g.nodeIds().filter(id => id !== i).map(id => ({ id, deg: g.degree(id) }));
    const totalDeg = degrees.reduce((s, d) => s + d.deg, 0) || 1;
    const targets = new Set<NodeId>();
    let attempts = 0;
    while (targets.size < Math.min(m, degrees.length) && attempts < 1000) {
      attempts++;
      let r = Math.random() * totalDeg, cum = 0;
      for (const { id, deg } of degrees) {
        cum += deg;
        if (r <= cum && !targets.has(id)) { targets.add(id); break; }
      }
    }
    for (const t of targets) if (!g.hasEdge(i, t)) g.addEdge(i, t, 1);
  }
  return g;
}

export function generateLadder(n: number): Graph {
  const g = new Graph();
  for (let i = 0; i < n; i++) { g.addNode(`t${i}`); g.addNode(`b${i}`); }
  for (let i = 0; i < n; i++) g.addEdge(`t${i}`, `b${i}`, 1);
  for (let i = 0; i < n - 1; i++) { g.addEdge(`t${i}`, `t${i+1}`, 1); g.addEdge(`b${i}`, `b${i+1}`, 1); }
  return g;
}

export function generateWheel(n: number): Graph {
  const g = new Graph();
  g.addNode('hub');
  for (let i = 0; i < n; i++) { g.addNode(i); g.addEdge('hub', i, 1); }
  for (let i = 0; i < n; i++) g.addEdge(i, (i + 1) % n, 1);
  return g;
}
