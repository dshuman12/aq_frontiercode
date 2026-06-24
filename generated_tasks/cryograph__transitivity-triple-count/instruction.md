# Task description

`global_clustering_coefficient` in `src/metrics/metrics.cpp` (and `transitivity`, which wraps it) returns values that are systematically about half of the correct result. For example, a single triangle on three vertices should report a global clustering coefficient of `1.0`, but the current implementation returns `0.5`. Relative orderings between graphs remain plausible, so the defect is isolated to the absolute normalization: the denominator counting connected triples (paths of length two centered on each vertex) is computed incorrectly.

Correct the connected-triple count so the standard definition holds: the global clustering coefficient equals `3 × (number of triangles) / (number of connected triples)`, with each vertex of degree `d` contributing `d × (d − 1) / 2` connected triples. A single triangle must yield `1.0`, a path of three vertices must yield `0.0`, and a complete graph `K_n` must yield `1.0`.

Keep the existing signatures `global_clustering_coefficient(const Graph&)` and `transitivity(const Graph&)` unchanged, both returning `double`. Do not alter `local_clustering_coefficient` or `average_clustering_coefficient`, and leave empty- and triangle-free-graph handling (returning `0.0`) intact.

# Test guidelines

Run the visible command:

```
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

Add or extend cases in `tests/` (for example a metrics-focused test) covering a single triangle (`1.0`), a three-vertex path (`0.0`), a complete graph `K_4` or `K_5` (`1.0`), and an empty or edgeless graph (`0.0`). Verify `transitivity` and `global_clustering_coefficient` agree on the same input. Use the existing assertions in `tests/test_framework.hpp` and register new files through `CMakeLists.txt` if needed.

# Lint guidelines

Ensure a clean configure and build with no warnings using the commands above; treat compiler diagnostics as failures to resolve.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
