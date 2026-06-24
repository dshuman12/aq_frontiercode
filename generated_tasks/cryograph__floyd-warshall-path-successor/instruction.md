# Task description

`floyd_warshall` in `src/shortest_path/shortest_path.cpp` computes correct all-pairs shortest distances, but `APSPResult::path(src, dst)` returns broken or truncated routes between nodes that are genuinely reachable. The `dist` matrix is correct; the defect is in how the `next` (successor) matrix is maintained during relaxation.

When a route from `i` to `j` improves through an intermediate vertex `k`, the next-hop successor for `(i, j)` must be updated to follow the first hop of the path `i → k`, i.e. it should inherit `next[i][k]` rather than pointing at `k` or `j` directly. Fix the successor update so that `path` reconstructs a complete, valid sequence of nodes from `src` to `dst` whose consecutive edges exist in the graph and whose total weight equals `dist[src][dst]`.

Keep the existing `APSPResult` shape and the computed distances unchanged. `reachable` must remain consistent with `path` (empty path for unreachable pairs, single-node path for `src == dst`). Do not alter other shortest-path routines or public signatures in `shortest_path.hpp`.

# Test guidelines

Run the visible command:

```
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

Add or extend cases in `tests/` (the shortest-path suite) covering multi-hop reconstruction where the optimal route passes through one or more intermediate vertices, direct-edge paths, `src == dst`, and unreachable pairs. Assert that every consecutive pair in a returned `path` is a real edge and that `path_weight` matches `dist[src][dst]`.

# Lint guidelines

The project builds with CMake and C++17; let the configure/build step surface compiler warnings and treat them as failures to resolve. Do not introduce new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the existing code conventions in `src/shortest_path/`. Limit changes to the successor-tracking logic; avoid unrelated refactors or reformatting of untouched code.
