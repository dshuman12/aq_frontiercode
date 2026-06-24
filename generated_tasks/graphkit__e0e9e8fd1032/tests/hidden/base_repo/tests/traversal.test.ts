import { Graph } from '../src/graph';
import { bfs, dfs, dfsIterative, bfsAll, dfsAll, bfsLevels, bidirectionalBFS, isConnected, isReachable } from '../src/traversal';

function makeGraph(): Graph {
  const g = new Graph();
  ['a','b','c','d','e'].forEach(n => g.addNode(n));
  g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); g.addEdge('d','e');
  return g;
}
function makeDisconnected(): Graph {
  const g = new Graph();
  ['a','b','c','x','y'].forEach(n => g.addNode(n));
  g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('x','y');
  return g;
}

describe('BFS', () => {
  it('visits all reachable nodes', () => { expect(bfs(makeGraph(),'a').visited.length).toBe(5); });
  it('level of start is 0', () => { expect(bfs(makeGraph(),'a').depth.get('a')).toBe(0); });
  it('adjacent node at level 1', () => { expect(bfs(makeGraph(),'a').depth.get('b')).toBe(1); });
  it('end of path at correct level', () => { expect(bfs(makeGraph(),'a').depth.get('e')).toBe(4); });
  it('parent of b is a', () => { expect(bfs(makeGraph(),'a').parent.get('b')).toBe('a'); });
  it('unreachable node not in visited', () => { expect(bfs(makeDisconnected(),'a').visited.includes('x')).toBe(false); });
  it('order array not empty', () => { expect(bfs(makeGraph(),'a').order.length).toBeGreaterThan(0); });
  it('first in order is start', () => { expect(bfs(makeGraph(),'a').order[0]).toBe('a'); });
});

describe('DFS', () => {
  it('visits all reachable nodes', () => { expect(dfs(makeGraph(),'a').visited.length).toBe(5); });
  it('start node in visited', () => { expect(dfs(makeGraph(),'a').visited.includes('a')).toBe(true); });
  it('unreachable not visited', () => { expect(dfs(makeDisconnected(),'a').visited.includes('x')).toBe(false); });
  it('iterative dfs same count', () => { expect(dfsIterative(makeGraph(),'a').visited.length).toBe(dfs(makeGraph(),'a').visited.length); });
  it('parent map populated', () => { expect(dfs(makeGraph(),'a').parent.size).toBeGreaterThan(0); });
});

describe('BFS levels', () => {
  it('level 0 contains start', () => { expect(bfsLevels(makeGraph(),'a')[0]).toContain('a'); });
  it('level 1 contains neighbors', () => { expect(bfsLevels(makeGraph(),'a')[1]).toContain('b'); });
  it('correct number of levels for path', () => { expect(bfsLevels(makeGraph(),'a')).toHaveLength(5); });
  it('all levels non-empty', () => { for (const l of bfsLevels(makeGraph(),'a')) expect(l.length).toBeGreaterThan(0); });
});

describe('BFS all / DFS all', () => {
  it('bfsAll covers all nodes', () => { const total = bfsAll(makeDisconnected()).reduce((s,r)=>s+r.visited.length,0); expect(total).toBe(5); });
  it('dfsAll covers all nodes', () => { const total = dfsAll(makeDisconnected()).reduce((s,r)=>s+r.visited.length,0); expect(total).toBe(5); });
  it('bfsAll returns multiple results for disconnected', () => { expect(bfsAll(makeDisconnected()).length).toBeGreaterThan(1); });
});

describe('bidirectionalBFS', () => {
  it('finds path between connected nodes', () => { expect(bidirectionalBFS(makeGraph(),'a','e')).not.toBeNull(); });
  it('returns null for disconnected', () => { expect(bidirectionalBFS(makeDisconnected(),'a','x')).toBeNull(); });
  it('path starts and ends correctly', () => { const p = bidirectionalBFS(makeGraph(),'a','e')!; expect(p[0]).toBe('a'); expect(p[p.length-1]).toBe('e'); });
  it('path length is optimal', () => { expect(bidirectionalBFS(makeGraph(),'a','e')!.length).toBe(5); });
});

describe('connectivity', () => {
  it('connected graph is connected', () => { expect(isConnected(makeGraph())).toBe(true); });
  it('disconnected graph is not connected', () => { expect(isConnected(makeDisconnected())).toBe(false); });
  it('isReachable from a to e', () => { expect(isReachable(makeGraph(),'a','e')).toBe(true); });
  it('isReachable returns false across components', () => { expect(isReachable(makeDisconnected(),'a','x')).toBe(false); });
  it('single node is connected', () => { const g = new Graph(); g.addNode('x'); expect(isConnected(g)).toBe(true); });
});

describe('traversal advanced', () => {
  it('bfs visits all connected nodes', () => { const g = new Graph(); ['a','b','c','d'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); g.addEdge('c','d'); const r = bfs(g,'a'); expect(r.visited).toHaveLength(4); });
  it('bfs parent map is populated', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); const r = bfs(g,'a'); expect(r.parent.has('b')).toBe(true); });
  it('dfs discovery time is set', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); const r = dfs(g,'a'); expect(r.discoveryTime.has('a')).toBe(true); });
  it('bfsAll covers all components', () => { const g = new Graph(); ['a','b','x','y'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('x','y'); const results = bfsAll(g); const total = results.reduce((s,r)=>s+r.visited.length,0); expect(total).toBe(4); });
  it('isConnected false for disconnected', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); expect(isConnected(g)).toBe(false); });
  it('isReachable returns true for adjacent', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); g.addEdge('a','b'); expect(isReachable(g,'a','b')).toBe(true); });
  it('isReachable returns false for isolated', () => { const g = new Graph(); g.addNode('a'); g.addNode('b'); expect(isReachable(g,'a','b')).toBe(false); });
  it('bfsLevels first level is start', () => { const g = new Graph(); ['a','b','c'].forEach(n=>g.addNode(n)); g.addEdge('a','b'); g.addEdge('b','c'); const levels = bfsLevels(g,'a'); expect(levels[0]).toContain('a'); });
})

