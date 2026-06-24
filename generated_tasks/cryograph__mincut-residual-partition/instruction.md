# Task description

`min_cut` in `src/flow/flow.cpp` computes the correct `cut_value` (matching the maximum flow), but the `source_side` / `sink_side` partition it returns is incorrect: nodes that should be on the sink side are reported on the source side. The root cause is that the partition is built by traversing the graph along edges that are saturated at termination, so the cut value and the node assignment disagree.

Fix the partition so it is derived from residual reachability: after the flow is maximal, `source_side` must contain exactly the nodes reachable from `source` in the residual graph (i.e., along edges with remaining capacity, including reverse residual edges), and `sink_side` must contain every other node. `cut_edges` must list exactly the original edges crossing from `source_side` to `sink_side`, and their total capacity must equal `cut_value`.

Keep the `MinCutResult` shape, public signatures in `src/flow/flow.hpp`, and the already-correct `cut_value` / `max_flow` behavior unchanged. Do not alter `edmonds_karp` or `max_flow_value` semantics, and avoid touching unrelated modules.

# Test guidelines

Add or extend cases in `tests/` (a flow-focused test file) to lock in the corrected behavior. Cover: every node landing in exactly one of `source_side` or `sink_side`; `source` always on the source side and `sink` always on the sink side; `cut_edges` summing to `cut_value`; and a graph where a saturated edge previously leaked a sink-side node onto the source side. Include a disconnected case where unreachable nodes fall on the sink side. Register new test files via `CMakeLists.txt` so they build.

# Lint guidelines

Treat compiler warnings as defects; the build must be clean. Keep changes localized to the flow module and its tests.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Run the visible test command to validate:

```
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

Match the surrounding C++17 style and naming conventions used in `src/flow/`.
