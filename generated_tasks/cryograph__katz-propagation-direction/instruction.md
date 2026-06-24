# Task description

`katz_centrality` in `src/scoring/scoring.cpp` returns a score map whose ranking is inverted on directed graphs. Katz centrality measures how much influence flows *into* a node: a node is important when many other important nodes point at it. The current implementation accumulates each neighbor's score on the wrong endpoint of every edge, so influence propagates along out-edges instead of in-edges. On a simple directed chain `a -> b -> c -> d`, the source `a` incorrectly scores highest and the sink `d` lowest; the correct behavior is the reverse, since `d` receives accumulated influence from every upstream node while `a` receives none.

Fix the propagation so that during each iteration a node accumulates the (alpha-scaled) scores of its in-neighbors, then adds `beta`. Keep the existing convergence loop, `alpha`/`beta`/`max_iter`/`tol` semantics, and the `ScoreMap` return type unchanged. Undirected graphs must continue to behave correctly, since each edge contributes in both directions there. Do not alter the public signature in `src/scoring/scoring.hpp` or touch unrelated scoring routines such as `hits` or the link-prediction helpers.

Success means a directed chain ranks downstream nodes above upstream ones and converged scores match the standard Katz definition.

# Test guidelines

Add or extend coverage in `tests/` (the scoring centrality tests) to assert the corrected ranking on a directed chain — downstream nodes must score strictly higher than upstream ones — and to confirm undirected graphs and the `beta` baseline term stay correct. Use `tests/test_framework.hpp` for assertions, consistent with the existing test files.

The visible test command is:

```bash
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

# Lint guidelines

No separate linter is configured. Ensure the project compiles cleanly with the existing CMake setup and that all tests pass via the command above before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the surrounding C++17 style in `src/scoring/scoring.cpp` and keep the change scoped to the propagation direction.
