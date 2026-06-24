# CryoGraph — Developer Notes

## Overview

CryoGraph is a high-performance graph processing and analytics engine in C++17.
It provides 12 modules covering graph construction, traversal, shortest paths,
connected components, centrality metrics, MST algorithms, graph generation,
I/O serialization, partitioning, pattern-matching queries, memory management,
and graph-level analytics.

**Language**: C++17 (GCC 13.3)
**Build**: CMake 3.14+ / Make
**Tests**: 254 tests, custom assertion framework
**LOC**: ~5,400

## Build & Test

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./cryograph_tests           # run all 254 tests
ctest --output-on-failure   # or via ctest
```

## Module Map

### 1. core/ — Graph Data Structure
| File | Lines | Description |
|---|---|---|
| `src/core/types.hpp` | 61 | NodeId, EdgeId, Edge, NodeData, PropertyMap, GraphType |
| `src/core/graph.hpp` | 78 | Graph class with 60+ public methods |
| `src/core/graph.cpp` | 395 | Full implementation: add/remove node/edge, properties, transpose, subgraph |
| `tests/test_core.cpp` | — | 34 tests |

### 2. algo/ — Traversal Algorithms
| File | Lines | Description |
|---|---|---|
| `src/algo/traversal.hpp` | 48 | BFS, DFS, topological sort, IDDFS, level order declarations |
| `src/algo/traversal.cpp` | 390 | Iterative BFS/DFS, Kahn's topo-sort, cycle detection, IDDFS |
| `tests/test_traversal.cpp` | — | 29 tests |

### 3. shortest_path/ — Shortest Path Algorithms
| File | Lines | Description |
|---|---|---|
| `src/shortest_path/shortest_path.hpp` | 38 | Dijkstra, Bellman-Ford, A*, Floyd-Warshall |
| `src/shortest_path/shortest_path.cpp` | 205 | Priority-queue Dijkstra, negative-cycle detection, A* with heuristic |
| `tests/test_shortest_path.cpp` | — | 22 tests |

### 4. components/ — Connected Components & SCC
| File | Lines | Description |
|---|---|---|
| `src/components/components.hpp` | 31 | CC, SCC, bridges, articulation points, bipartite |
| `src/components/components.cpp` | 330 | Iterative Tarjan SCC, bridge/AP detection, condensation graph |
| `tests/test_components.cpp` | — | 24 tests |

### 5. centrality/ — Centrality Metrics
| File | Lines | Description |
|---|---|---|
| `src/centrality/centrality.hpp` | 30 | Degree, betweenness, closeness, PageRank, eigenvector, harmonic |
| `src/centrality/centrality.cpp` | 292 | Brandes betweenness, power-iteration PageRank/eigenvector |
| `tests/test_centrality.cpp` | — | 19 tests |

### 6. mst/ — Minimum Spanning Tree
| File | Lines | Description |
|---|---|---|
| `src/mst/mst.hpp` | 38 | Kruskal, Prim, Borůvka, UnionFind |
| `src/mst/mst.cpp` | 192 | Union-Find with path compression, MST to graph conversion |
| `tests/test_mst.cpp` | — | 18 tests |

### 7. generator/ — Graph Generators
| File | Lines | Description |
|---|---|---|
| `src/generator/generator.hpp` | 39 | ER, BA, WS, complete, cycle, star, path, grid, tree, DAG, bipartite, Petersen |
| `src/generator/generator.cpp` | 274 | Deterministic PRNG, preferential attachment, small-world rewiring |
| `tests/test_generator.cpp` | — | 25 tests |

### 8. io/ — Serialization & Export
| File | Lines | Description |
|---|---|---|
| `src/io/serializer.hpp` | 32 | Binary, edge-list, adjacency-list, DOT, CSV formats |
| `src/io/serializer.cpp` | 220 | Custom binary format (CRYG/v1), round-trip read/write |
| `tests/test_io.cpp` | — | 11 tests |

### 9. partition/ — Graph Partitioning
| File | Lines | Description |
|---|---|---|
| `src/partition/partitioner.hpp` | 24 | BFS bisection, label propagation, balanced k-way |
| `src/partition/partitioner.cpp` | 156 | Edge-weight-aware label propagation, balance ratio metrics |
| `tests/test_partition.cpp` | — | 8 tests |

### 10. query/ — Query Engine
| File | Lines | Description |
|---|---|---|
| `src/query/query.hpp` | 39 | Node/edge filtering, reachability, all-paths, triangles, k-hop |
| `src/query/query.cpp` | 227 | Subgraph isomorphism, Jaccard similarity, motif detection |
| `tests/test_query.cpp` | — | 15 tests |

### 11. memory/ — Custom Allocators
| File | Lines | Description |
|---|---|---|
| `src/memory/pool.hpp` | 114 | ArenaAllocator, PoolAllocator, MemoryTracker, MemoryStats |
| `src/memory/pool.cpp` | 164 | Bump-pointer arena, free-list pool, leak detection |
| `tests/test_memory.cpp` | — | 25 tests |

### 12. metrics/ — Graph Analytics
| File | Lines | Description |
|---|---|---|
| `src/metrics/metrics.hpp` | 38 | Density, clustering, diameter, radius, assortativity, summary |
| `src/metrics/metrics.cpp` | 262 | BFS-based eccentricity, global/local clustering coefficient |
| `tests/test_metrics.cpp` | — | 23 tests (13 metrics + 10 integration) |

## Module Dependency Chain

```
core (types, graph)
 ├── algo (traversal) ← depends on core
 ├── shortest_path ← depends on core
 ├── components ← depends on core
 ├── centrality ← depends on core
 ├── mst ← depends on core
 ├── generator ← depends on core
 ├── io ← depends on core
 ├── partition ← depends on core
 ├── query ← depends on core
 ├── memory (standalone)
 └── metrics ← depends on core, components
```

Changes to `core/graph.hpp` or `core/types.hpp` affect ALL modules.
Changes to `components/` affect `metrics/`.
Changes to `generator/` affect test fixtures in multiple modules.

## Task Writing Notes

- The core Graph class stores edges in adjacency lists per node. Undirected edges
  are stored as two directed entries. `edge_count_` counts all stored entries.
  For undirected graphs, unique edge count = `edge_count_ / 2` (except self-loops).

- Tarjan SCC (components/components.cpp:64-128) is fully iterative — no recursion.
  The `returned` flag in the stack frame is critical for low-link propagation.

- Brandes betweenness (centrality/centrality.cpp:47-96) accumulates shortest-path
  counts (sigma) and dependency (delta) in a single BFS pass per source.

- Floyd-Warshall path reconstruction (shortest_path/shortest_path.cpp) uses
  `next[i][j]` = first hop from i toward j. Follow `cur = next[cur][dst]`.

- Binary format (io/serializer.cpp): 4-byte magic `0x43525947`, 4-byte version,
  1-byte directed flag, 8-byte node count, node IDs, 8-byte edge count, edges
  (src:8, dst:8, weight:8).

- Generator PRNG is `mt19937_64` — same seed = same graph. Tests depend on this.

## Dockerfile

`environment/Dockerfile` uses `gcc:13.3`, installs cmake and make.
WORKDIR is `/testbed/CryoGraph`. Builds in Release mode.
`.git/` is included (no .dockerignore exclusion).