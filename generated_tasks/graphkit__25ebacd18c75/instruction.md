# Task description

Add a new path-analysis module at `src/path.ts` that exposes path and traversal utilities for the undirected `Graph` class from `src/graph.ts`. The module must export the following functions:

- `isEulerian(g: Graph): boolean` — true only when every node has even degree and all non-isolated nodes are connected (a triangle qualifies; a simple chain does not).
- `eulerianCircuit(g: Graph): NodeId[]` — a closed walk traversing every edge once, returning `[]` when the graph is not Eulerian. For an Eulerian graph the first and last node must match.
- `eulerianPath(g: Graph): NodeId[]` — an open Eulerian trail when exactly two nodes have odd degree; returns an array.
- `hasHamiltonianPath(g: Graph): boolean` and `hamiltonianPath(g: Graph): NodeId[] | null` — detect/return a path visiting every node exactly once. A single node and any simple chain qualify; the returned path length equals `nodeCount()`.
- `pathLength(g: Graph, path: NodeId[]): number` — sum of edge weights along the path; `0` for empty or single-node paths.
- `isSimplePath(path: NodeId[]): boolean` — true when no node repeats; empty and single-node paths are simple.
- `isCycle(g: Graph, path: NodeId[]): boolean` — true when the walk starts and ends at the same node over existing edges.
- `allPaths(g: Graph, source: NodeId, target: NodeId, maxLength?: number): NodeId[][]` — all simple paths from `source` to `target`; each path starts at `source`, ends at `target`; empty when disconnected.

Use `NodeId` from `src/types.ts` and edge weights via `g.getEdge`. Do not modify other modules.

# Test guidelines

Run `npm test` (Jest via ts-jest). Add or extend coverage under `tests/`, exercising Eulerian circuits on cyclic graphs, non-Eulerian chains, Hamiltonian detection on chains and single nodes, weighted `pathLength`, simple-path and cycle predicates, and `allPaths` on connected and disconnected graphs. Keep new tests deterministic.

# Lint guidelines

Run `npm run lint` (`tsc --noEmit`) and ensure it passes with no type errors. Keep strictness consistent with the existing `tsconfig.json`.

# Style guidelines

Match the existing code style: TypeScript with explicit return types on exported functions, `NodeId`-typed maps and sets, and named exports only. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
