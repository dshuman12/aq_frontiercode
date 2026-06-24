import { generateComplete, generatePath, generateCycle, generateStar, generateGrid, generatePetersen, generateBipartite, generateRandom, generateRandomDAG, generateLadder, generateWheel, generateBarabasiAlbert } from '../src/generator';

describe('generateComplete', () => {
  it('K4 has 6 edges', () => { expect(generateComplete(4).edgeCount()).toBe(6); });
  it('K4 has 4 nodes', () => { expect(generateComplete(4).nodeCount()).toBe(4); });
  it('K1 has 0 edges', () => { expect(generateComplete(1).edgeCount()).toBe(0); });
  it('K5 has 10 edges', () => { expect(generateComplete(5).edgeCount()).toBe(10); });
  it('K0 has 0 nodes', () => { expect(generateComplete(0).nodeCount()).toBe(0); });
  it('all nodes connected', () => { const g = generateComplete(4); for (const n1 of g.nodeIds()) for (const n2 of g.nodeIds()) if (n1!==n2) expect(g.hasEdge(n1,n2)).toBe(true); });
});

describe('generatePath', () => {
  it('path n has n nodes', () => { expect(generatePath(5).nodeCount()).toBe(5); });
  it('path n has n-1 edges', () => { expect(generatePath(5).edgeCount()).toBe(4); });
  it('path 1 has 0 edges', () => { expect(generatePath(1).edgeCount()).toBe(0); });
  it('path 2 has 1 edge', () => { expect(generatePath(2).edgeCount()).toBe(1); });
  it('endpoints have degree 1', () => { const g = generatePath(5); const ids = g.nodeIds(); expect(g.degree(ids[0])).toBe(1); });
});

describe('generateCycle', () => {
  it('cycle n has n nodes', () => { expect(generateCycle(5).nodeCount()).toBe(5); });
  it('cycle n has n edges', () => { expect(generateCycle(5).edgeCount()).toBe(5); });
  it('all nodes have degree 2', () => { const g = generateCycle(5); for (const n of g.nodeIds()) expect(g.degree(n)).toBe(2); });
  it('cycle 3 is triangle', () => { expect(generateCycle(3).edgeCount()).toBe(3); });
});

describe('generateStar', () => {
  it('star n has n+1 nodes', () => { expect(generateStar(4).nodeCount()).toBe(5); });
  it('star n has n edges', () => { expect(generateStar(4).edgeCount()).toBe(4); });
  it('max degree is n', () => { expect(generateStar(4).maxDegree()).toBe(4); });
  it('min degree is 1', () => { expect(generateStar(4).minDegree()).toBe(1); });
});

describe('generateGrid', () => {
  it('2x3 has 6 nodes', () => { expect(generateGrid(2,3).nodeCount()).toBe(6); });
  it('2x3 has 7 edges', () => { expect(generateGrid(2,3).edgeCount()).toBe(7); });
  it('3x3 has 9 nodes', () => { expect(generateGrid(3,3).nodeCount()).toBe(9); });
  it('1x1 has 0 edges', () => { expect(generateGrid(1,1).edgeCount()).toBe(0); });
});

describe('generatePetersen', () => {
  it('has 10 nodes', () => { expect(generatePetersen().nodeCount()).toBe(10); });
  it('has 15 edges', () => { expect(generatePetersen().edgeCount()).toBe(15); });
  it('all nodes degree 3', () => { const g = generatePetersen(); for (const n of g.nodeIds()) expect(g.degree(n)).toBe(3); });
});

describe('generateBipartite', () => {
  it('has correct node count', () => { expect(generateBipartite(3,4).nodeCount()).toBe(7); });
  it('complete=true gives full edges', () => { expect(generateBipartite(2,3,true).edgeCount()).toBe(6); });
  it('complete=false gives 0 edges', () => { expect(generateBipartite(2,3,false).edgeCount()).toBe(0); });
  it('complete 3x4 has 12 edges', () => { expect(generateBipartite(3,4,true).edgeCount()).toBe(12); });
});

describe('generateRandom', () => {
  it('has correct node count', () => { expect(generateRandom(5,0.5).nodeCount()).toBe(5); });
  it('p=0 has 0 edges', () => { expect(generateRandom(5,0).edgeCount()).toBe(0); });
  it('p=1 has max edges', () => { expect(generateRandom(5,1).edgeCount()).toBe(10); });
  it('returns graph', () => { expect(typeof generateRandom(3,0.5).nodeCount).toBe('function'); });
});

describe('generateRandomDAG', () => {
  it('has correct node count', () => { expect(generateRandomDAG(5,0.5).nodeCount()).toBe(5); });
  it('is a DAG', () => { expect(generateRandomDAG(5,0.5).isDAG()).toBe(true); });
  it('p=0 has 0 edges', () => { expect(generateRandomDAG(5,0).edgeCount()).toBe(0); });
  it('p=1 still acyclic', () => { expect(generateRandomDAG(4,1).isDAG()).toBe(true); });
});

describe('generateLadder', () => {
  it('ladder n has 2n nodes', () => { expect(generateLadder(4).nodeCount()).toBe(8); });
  it('ladder n has 3n-2 edges', () => { expect(generateLadder(4).edgeCount()).toBe(10); });
  it('ladder 1 has 2 nodes', () => { expect(generateLadder(1).nodeCount()).toBe(2); });
});

describe('generateWheel', () => {
  it('wheel n has n+1 nodes', () => { expect(generateWheel(5).nodeCount()).toBe(6); });
  it('wheel n has 2n edges', () => { expect(generateWheel(5).edgeCount()).toBe(10); });
  it('hub has degree n', () => { expect(generateWheel(5).maxDegree()).toBe(5); });
});

describe('generateBarabasiAlbert', () => {
  it('has correct node count', () => { expect(generateBarabasiAlbert(10,2).nodeCount()).toBe(10); });
  it('has edges', () => { expect(generateBarabasiAlbert(10,2).edgeCount()).toBeGreaterThan(0); });
  it('m=1 has edges', () => { expect(generateBarabasiAlbert(5,1).edgeCount()).toBeGreaterThan(0); });
});

describe('generator advanced', () => {
  it('complete K6 has 15 edges', () => { expect(generateComplete(6).edgeCount()).toBe(15); });
  it('complete K7 has 21 edges', () => { expect(generateComplete(7).edgeCount()).toBe(21); });
  it('path 10 has 9 edges', () => { expect(generatePath(10).edgeCount()).toBe(9); });
  it('cycle 6 has 6 edges', () => { expect(generateCycle(6).edgeCount()).toBe(6); });
  it('star 10 has 10 edges', () => { expect(generateStar(10).edgeCount()).toBe(10); });
  it('grid 4x4 has 16 nodes', () => { expect(generateGrid(4,4).nodeCount()).toBe(16); });
  it('grid 4x4 has 24 edges', () => { expect(generateGrid(4,4).edgeCount()).toBe(24); });
  it('bipartite 4x5 complete has 20 edges', () => { expect(generateBipartite(4,5,true).edgeCount()).toBe(20); });
  it('barabasi 20 nodes has 20 nodes', () => { expect(generateBarabasiAlbert(20,2).nodeCount()).toBe(20); });
  it('ladder 6 has 12 nodes', () => { expect(generateLadder(6).nodeCount()).toBe(12); });
  it('ladder 6 has 16 edges', () => { expect(generateLadder(6).edgeCount()).toBe(16); });
  it('wheel 6 has 7 nodes', () => { expect(generateWheel(6).nodeCount()).toBe(7); });
  it('wheel 6 has 12 edges', () => { expect(generateWheel(6).edgeCount()).toBe(12); });
  it('random p=1 n=4 has 6 edges', () => { expect(generateRandom(4,1).edgeCount()).toBe(6); });
  it('DAG p=1 n=5 is still DAG', () => { expect(generateRandomDAG(5,1).isDAG()).toBe(true); });
})

