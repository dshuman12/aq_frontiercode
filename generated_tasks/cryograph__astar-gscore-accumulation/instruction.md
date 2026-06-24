# Task description

`astar` in `src/shortest_path/shortest_path.cpp` returns inflated distances whenever it is given a non-trivial admissible heuristic. With a zero heuristic the results match Dijkstra, but with any real heuristic the recorded distances in `PathResult::dist` — and therefore the reconstructed path cost — come out larger than the true shortest-path cost. The cause is that the heuristic estimate is being folded into the accumulated g-score: the priority-queue f-value (`g + h`) is being stored as the node's distance instead of the pure cost-so-far.

Fix the accumulation so that `dist[node]` always holds the actual cost of the best known path from `src` to `node`, while the heuristic is used only to order the priority queue. The public signature `PathResult astar(const Graph& g, NodeId src, NodeId goal, HeuristicFn h)` and the layout of `PathResult` must stay unchanged. For an admissible heuristic, `astar` should produce the same `dist[goal]` and an equivalent optimal path as `dijkstra` on the same graph. Behavior with a zero heuristic must remain correct, and unreachable goals must still leave `goal` absent from `dist`.

# Test guidelines

Add or extend cases in `tests/` (the shortest-path suite registered in `tests/test_main.cpp`) to cover A* with a genuine admissible heuristic and confirm the resulting `dist[goal]` equals the Dijkstra distance, that the reconstructed path weight matches, and that a zero heuristic and an unreachable goal still behave correctly. Run the suite with:

```
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

Do not weaken existing assertions in other algorithm suites.

# Lint guidelines

Keep the change confined to A* g-score accumulation; do not alter `dijkstra`, `bellman_ford`, `floyd_warshall`, or any shared helpers. Avoid touching headers, build files, or unrelated modules.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
