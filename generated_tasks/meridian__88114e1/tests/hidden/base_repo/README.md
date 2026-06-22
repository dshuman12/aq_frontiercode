# meridian

**meridian** is a pure-Python library for constructing, analysing, and querying graphs and networks. It provides a rich set of graph types, classical and modern algorithms, generators, serialisation utilities, and a fluent query DSL — all with no external runtime dependencies.

## Features

- **Graph types**: `Graph` (undirected), `DiGraph` (directed), `MultiGraph`, `MultiDiGraph`
- **Traversal**: BFS, DFS, topological sort, cycle detection
- **Shortest paths**: Dijkstra, Bellman-Ford, Floyd-Warshall, A\*
- **Spanning trees**: Kruskal, Prim (min and max)
- **Centrality**: degree, betweenness, closeness, PageRank, eigenvector, Katz, harmonic
- **Components**: connected, strongly connected, weakly connected, biconnected, articulation points, bridges
- **Flow**: Ford-Fulkerson, Edmonds-Karp max-flow / min-cut
- **Coloring**: greedy strategies, chromatic number bounds
- **Community detection**: label propagation, Girvan-Newman, modularity scoring
- **Clique analysis**: Bron-Kerbosch, maximum clique, clique number
- **Bipartite utilities**: bipartiteness check, 2-coloring, projection
- **Generators**: classic (complete, cycle, grid, Petersen …), random (Erdős-Rényi, Barabási-Albert, Watts-Strogatz …)
- **Metrics**: density, clustering, diameter, radius, eccentricity
- **Layout**: spring / force-directed, circular, shell, Kamada-Kawai
- **I/O**: JSON, CSV edge-list, GraphViz DOT, GEXF
- **Query DSL**: fluent `GraphQuery` builder for filtering nodes and edges

## Quick Start

```python
from meridian import Graph
from meridian.algorithms.shortest_path import dijkstra
from meridian.algorithms.centrality import pagerank

g = Graph(name="example")
g.add_edge("a", "b", weight=1.0)
g.add_edge("b", "c", weight=2.0)
g.add_edge("a", "c", weight=4.0)

dist, path = dijkstra(g, "a", "c")
print(dist, path)   # 3.0, ['a', 'b', 'c']

ranks = pagerank(g)
print(ranks)
```

## Installation

```bash
pip install meridian
```

## Running Tests

```bash
pytest tests/ -v
```

## Project Layout

```
meridian/
├── meridian/
│   ├── core graph types
│   ├── algorithms/
│   ├── generators/
│   ├── analysis/
│   ├── io/
│   └── query/
└── tests/
```
