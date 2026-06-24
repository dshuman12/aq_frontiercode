import { Graph } from '../src/graph';
import { DiGraph } from '../src/digraph';
import { dijkstra, bellmanFord, floydWarshall, aStar } from '../src/shortest_path';

function makeWeighted(): Graph {
  const g = new Graph();
  ['a','b','c','d'].forEach(n => g.addNode(n));
  g.addEdge('a','b',1); g.addEdge('b','c',2); g.addEdge('a','c',10); g.addEdge('c','d',1);
  return g;
}

describe('dijkstra', () => {
  it('distance to self is 0', () => { expect(dijkstra(makeWeighted(),'a').distances.get('a')).toBe(0); });
  it('finds shortest path distance', () => { expect(dijkstra(makeWeighted(),'a').distances.get('c')).toBe(3); });
  it('longer direct edge is not taken', () => { expect(dijkstra(makeWeighted(),'a').distances.get('c')).toBeLessThan(10); });
  it('path through multiple nodes', () => { expect(dijkstra(makeWeighted(),'a').distances.get('d')).toBe(4); });
  it('reconstructs path a to d', () => { expect(dijkstra(makeWeighted(),'a').path('d')).toEqual(['a','b','c','d']); });
  it('reconstructs path a to c', () => { expect(dijkstra(makeWeighted(),'a').path('c')).toEqual(['a','b','c']); });
  it('unreachable node has Infinity distance', () => { const g = new Graph(); g.addNode('x'); g.addNode('y'); expect(dijkstra(g,'x').distances.get('y')).toBe(Infinity); });
  it('throws for missing start node', () => { expect(() => dijkstra(makeWeighted(),'z')).toThrow(); });
  it('all nodes have a distance', () => { const d = dijkstra(makeWeighted(),'a').distances; for (const id of makeWeighted().nodeIds()) expect(d.has(id)).toBe(true); });
});

describe('bellmanFord', () => {
  it('distance to self is 0', () => { expect(bellmanFord(makeWeighted(),'a').distances.get('a')).toBe(0); });
  it('matches dijkstra for non-negative weights', () => {
    const bf = bellmanFord(makeWeighted(),'a').distances.get('d');
    const dj = dijkstra(makeWeighted(),'a').distances.get('d');
    expect(bf).toBe(dj);
  });
  it('detects negative cycle', () => {
    const g = new DiGraph();
    ['a','b','c'].forEach(n => g.addNode(n));
    g.addEdge('a','b',1); g.addEdge('b','c',-2); g.addEdge('c','a',-1);
    expect(() => bellmanFord(g,'a')).toThrow();
  });
  it('returns correct path', () => { expect(bellmanFord(makeWeighted(),'a').path('c')).toEqual(['a','b','c']); });
  it('finds distance to d', () => { expect(bellmanFord(makeWeighted(),'a').distances.get('d')).toBe(4); });
});

describe('floydWarshall', () => {
  it('distance to self is 0', () => { const fw = floydWarshall(makeWeighted()); expect(fw.distances.get('a')!.get('a')).toBe(0); });
  it('shortest a to d', () => { const fw = floydWarshall(makeWeighted()); expect(fw.distances.get('a')!.get('d')).toBe(4); });
  it('shortest a to c via b', () => { const fw = floydWarshall(makeWeighted()); expect(fw.distances.get('a')!.get('c')).toBe(3); });
  it('no negative cycle', () => { expect(floydWarshall(makeWeighted()).hasNegativeCycle).toBe(false); });
  it('path function returns array', () => { expect(Array.isArray(floydWarshall(makeWeighted()).path('a','d'))).toBe(true); });
});

describe('aStar', () => {
  it('finds path in weighted graph', () => { const r = aStar(makeWeighted(),'a','d',()=>0); expect(r).not.toBeNull(); expect(r![r!.length-1]).toBe('d'); });
  it('returns empty for disconnected', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); const r = aStar(g,'a','b',()=>0); expect(!r || r.length === 0).toBe(true); });
  it('path starts at source', () => { const r = aStar(makeWeighted(),'a','d',()=>0)!; expect(r[0]).toBe('a'); });
  it('zero heuristic gives optimal path', () => { const r = aStar(makeWeighted(),'a','d',()=>0)!; expect(r).toEqual(['a','b','c','d']); });
});

describe('shortestPath advanced', () => {
  it('dijkstra returns empty distances for isolated node', () => { const g = new Graph(); g.addNode('x'); g.addNode('y'); const r = dijkstra(g,'x'); expect(r.distances.get('y')).toBe(Infinity); });
  it('bellmanFord no negative cycle flag', () => { const g = new Graph(); ['a','b'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); const r = bellmanFord(g,'a'); expect(r.hasNegativeCycle).toBe(false); });
  it('floydWarshall all distances non-negative for non-negative weights', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b',1); g.addEdge('b','c',1); const fw = floydWarshall(g); for (const inner of fw.distances.values()) for (const d of inner.values()) expect(d).toBeGreaterThanOrEqual(0); });
  it('dijkstra path to adjacent is correct', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',3); const r = dijkstra(g,'a'); expect(r.path('b')).toEqual(['a','b']); });
  it('dijkstra distances Map type', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b',1); expect(dijkstra(g,'a').distances instanceof Map).toBe(true); });
})

