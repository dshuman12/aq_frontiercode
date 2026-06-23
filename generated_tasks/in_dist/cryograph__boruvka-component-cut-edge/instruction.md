# Task description

`boruvka` in `src/mst/mst.cpp` returns a spanning tree of the correct shape — it connects all nodes and emits exactly `n-1` edges for a connected graph — but the result is not always a *minimum* spanning tree. On some inputs its `total_weight` exceeds the value computed by `kruskal` and `prim` for the same graph, because at least one component fails to select the true minimum-weight edge leaving it before merging.

Fix the component-merging logic so each Borůvka phase records, for every active component, the cheapest edge crossing out of that component, considering the edge from the perspective of *both* endpoint components rather than only one side. After all phases the produced `MSTResult` must have the same `total_weight` as `kruskal` and `prim` on every connected input (and matching forest weight on disconnected ones).

Keep the existing `MSTResult` fields and the `boruvka(const Graph& g)` signature unchanged, and do not alter `kruskal`, `prim`, `UnionFind`, or any other algorithm. Tie-breaking between equal-weight edges may differ from the other algorithms as long as the total weight matches and `is_spanning_tree` still holds.

# Test guidelines

Run the suite with the visible command:

```
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

Add or extend cases in `tests/` (alongside the existing MST tests) covering: graphs where a naive one-sided cheapest-edge choice picks a heavier edge, equal-weight edges, multiple components merging in a single phase, single-node and disconnected graphs, and parity of `total_weight` against `kruskal` and `prim`. Use the existing `tests/test_framework.hpp` helpers and register new files in `CMakeLists.txt` if needed.

# Lint guidelines

Treat compiler warnings as defects. Build cleanly with the commands above before submitting and resolve any new diagnostics in the files you touch.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
