# Task description

Optimize the `betweenness_centrality` and `pagerank` implementations in `src/centrality/centrality.cpp` so they remain correct while avoiding repeated hash-map lookups in their inner loops.

For `betweenness_centrality(const Graph& g, bool normalized = true)`, restructure Brandes' algorithm to operate over dense vector-indexed state. Build a stable mapping between `NodeId` values and contiguous indices once, then store per-source accumulators (distances, sigma counts, dependency values, predecessor lists, and the BFS/stack ordering) in `std::vector`s rather than `std::unordered_map`s. The final result must still be returned as a `CentralityMap` keyed by the original `NodeId`s. Centre nodes of stars and middle nodes of line/path graphs must score strictly higher than leaf/endpoint nodes, all nodes in a triangle must tie, and every node in a complete graph must score (near) zero.

For `pagerank(const Graph& g, double damping, size_t max_iter, double tol)`, precompute and cache each node's out-degree before the iteration loop instead of recomputing it per iteration, and continue handling dangling nodes (zero out-degree) by redistributing their mass so scores sum to 1.0. Convergence behavior, the damping default of 0.85, and the single-node case (score 1.0) must be unchanged.

Do not alter the public signatures in `centrality.hpp` or the behavior of the other centrality functions.

# Test guidelines

Tests live in `tests/`; extend `tests/test_centrality.cpp` when adding coverage. New or modified tests should assert relative orderings (center vs. leaf, middle vs. endpoint), exact zero scores on complete graphs, PageRank mass summing to 1.0 including with dangling nodes, and the single-node base case. Run `pytest` to drive the build and execute the suite; all centrality tests must pass.

# Lint guidelines

Configure and build via CMake (`cmake .. -DCMAKE_BUILD_TYPE=Release && make`) and resolve any compiler warnings surfaced during compilation before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
