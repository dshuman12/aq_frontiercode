# Task description

Optimize and correct several graph query and shortest-path routines in CryoGraph while keeping their public signatures in `src/query/query.hpp` and `src/shortest_path/shortest_path.hpp` unchanged.

In `src/shortest_path/shortest_path.cpp`, rework `floyd_warshall` so it computes all-pairs shortest paths using contiguous flat vectors internally instead of nested hash maps, while still returning an `APSPResult` whose `dist`/`next` maps and `path`/`reachable` helpers behave identically for reachable and unreachable pairs.

In `src/query/query.cpp`, fix `count_paths(g, src, dst, max_depth)` so it counts distinct simple paths via depth-first traversal: a path from a node to itself counts as exactly one (`count_paths(x, x) == 1`), disconnected pairs return `0`, and a diamond `0→1→3`, `0→2→3` returns `2`. Also fix `graph_diameter_approx(g, samples)` so it returns the largest shortest-path hop distance found across sampled sources: a 5-node path graph yields `4`, and a complete graph on 6 nodes yields `1`.

All other query and path behaviors (`all_paths`, `find_path`, `find_triangles`, `k_hop_neighbors`, etc.) must remain unchanged.

# Test guidelines

Tests live in `tests/` (notably `tests/test_query.cpp` and `tests/test_shortest_path.cpp`) and use the `CRYO_TEST` macros in `tests/test_framework.hpp`. Add or extend cases there to cover self-loops, unreachable pairs, diamond path counting, and diameter on path and complete graphs. Run the suite with `pytest`, which drives the C++ build and test binary.

# Lint guidelines

Keep changes confined to the affected source and header files; do not modify build configuration or unrelated modules. Ensure the project compiles cleanly under C++17 with no new warnings.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
