# CryoGraph

A high-performance graph processing and analytics engine written in C++17.

CryoGraph provides a rich set of graph algorithms, custom memory management,
flexible I/O serialization, graph partitioning, pattern-matching queries, and
parallel traversal primitives — all built around an efficient adjacency-list
core with property support on both nodes and edges.

## Features

- **Core graph engine** — directed/undirected, weighted, with per-node and
  per-edge property maps
- **Traversal** — BFS, DFS, topological sort, iterative-deepening DFS
- **Shortest paths** — Dijkstra, Bellman-Ford (negative-cycle detection), A*,
  Floyd-Warshall
- **Components** — connected components, Tarjan SCC, bridge detection,
  articulation points, bipartite check
- **Centrality** — degree, betweenness (Brandes), closeness, PageRank, eigenvector
- **MST** — Kruskal (union-find), Prim, Borůvka
- **Generators** — Erdős-Rényi, Barabási-Albert, Watts-Strogatz, grid, tree,
  complete, cycle, star
- **I/O** — custom binary format, edge-list text, adjacency-list text, DOT export
- **Partitioning** — recursive bisection, label propagation, balanced k-way
- **Query engine** — subgraph pattern matching, reachability, path queries
- **Memory** — arena allocator, fixed-block pool, leak tracking
- **Metrics** — density, clustering coefficient, diameter, radius, assortativity

## Build

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

## Test

```bash
cd build
ctest --output-on-failure
# or run directly:
./cryograph_tests
```

## Project Structure

```
src/
├── core/           Core graph data structures and types
├── algo/           Graph traversal algorithms
├── shortest_path/  Shortest path algorithms
├── components/     Connected components and SCC
├── centrality/     Centrality metrics
├── mst/            Minimum spanning tree algorithms
├── generator/      Graph generators
├── io/             Serialization and export
├── partition/      Graph partitioning
├── query/          Pattern matching and queries
├── memory/         Custom memory allocators
└── metrics/        Graph-level analytics
```

## License

MIT