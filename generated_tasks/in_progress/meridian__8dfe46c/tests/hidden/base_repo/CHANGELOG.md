# Changelog

All notable changes to meridian are documented here.

## [0.9.2] - 2024-11-15
### Fixed
- Closeness centrality normalisation for disconnected graphs
- GEXF parser edge direction detection

## [0.9.1] - 2024-10-28
### Added
- Kamada-Kawai layout algorithm
- `link_prediction` module with common-neighbour, Jaccard, Adamic-Adar, and preferential-attachment scores
- `partition` module with spectral and recursive bisection
### Fixed
- PageRank convergence on graphs with dangling nodes
- Bron-Kerbosch pivot selection edge-case for isolated nodes

## [0.9.0] - 2024-09-12
### Added
- `MultiGraph` and `MultiDiGraph` with per-key edge attributes
- Louvain-style community detection
- GEXF serialisation / deserialisation
- `GraphQuery` fluent DSL for node and edge filtering
- Shell and spiral layout algorithms
### Changed
- `minimum_spanning_tree` now accepts `algorithm` kwarg (`kruskal` or `prim`)
- `from_json` infers directionality from `directed` flag in stored metadata

## [0.8.0] - 2024-07-30
### Added
- `bipartite` analysis module
- Clique detection (Bron-Kerbosch) and clique number helpers
- `articulation_points` and `bridges` in components module
- Community detection via Girvan-Newman and label propagation
### Fixed
- Dijkstra's algorithm did not handle graphs with zero-weight edges correctly

## [0.7.0] - 2024-06-18
### Added
- Edmonds-Karp max-flow (BFS augmenting paths)
- Ford-Fulkerson with DFS augmenting paths
- Min-cut partitioning from max-flow result
- Greedy graph coloring with six strategies

## [0.6.0] - 2024-05-05
### Added
- Strongly connected components (Tarjan's algorithm)
- Weakly connected components for directed graphs
- Biconnected components
- `bridges` and `articulation_points`

## [0.5.0] - 2024-03-22
### Added
- Kruskal's and Prim's minimum / maximum spanning tree
- Watts-Strogatz small-world graph generator
- Barabási-Albert scale-free graph generator
- CSV edge-list import / export

## [0.4.0] - 2024-02-14
### Added
- Betweenness centrality (Brandes algorithm)
- Closeness centrality
- Eigenvector centrality (power iteration)
- Katz centrality
- Harmonic centrality

## [0.3.0] - 2024-01-08
### Added
- A\* shortest-path search
- Floyd-Warshall all-pairs shortest paths
- Bellman-Ford with negative-cycle detection
- `all_simple_paths` with optional path-length cutoff

## [0.2.0] - 2023-11-25
### Added
- `DiGraph` with successor/predecessor views and `reverse()`
- Topological sort (Kahn's algorithm)
- All topological orderings generator
- Cycle detection for directed graphs
- Degree centrality

## [0.1.0] - 2023-10-01
### Added
- Initial `Graph` class with adjacency-dict storage
- BFS and DFS traversal
- Dijkstra's single-source shortest path
- Connected components
- Classic graph generators (complete, cycle, path, grid, star, wheel)
- JSON serialisation / deserialisation
