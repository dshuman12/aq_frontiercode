# Task description

`closeness_centrality(const Graph& g, bool normalized = true)` in `src/centrality/centrality.cpp` produces normalized scores that are scaled slightly too small on connected graphs. In a complete graph every node should score `1.0`, but the current implementation yields `0.75`. The defect is in the Wasserman-Faust normalization: when rescaling a node's raw closeness by the fraction of the graph it can reach, the reachable-fraction factor is computed against the wrong denominator, so the result is systematically deflated. Rankings stay correct, which makes the error easy to overlook.

Correct the normalization so that, for a node that reaches `r` other vertices in a graph of `n` nodes, the raw closeness is scaled by `r / (n - 1)`. On a fully connected graph this must yield exactly `1.0` for every node. Disconnected graphs and nodes that reach no others must remain well-defined (no division by zero, isolated nodes score `0.0`). The unnormalized branch (`normalized == false`) and the public signature in `centrality.hpp` must stay unchanged, as must all other centrality functions and their `CentralityMap` return type.

# Test guidelines

Run the visible command:

```bash
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

Add or extend cases in `tests/test_centrality.cpp` (registering it via `CMakeLists.txt` and `tests/test_main.cpp` if not already present). Cover: every node of a complete graph scoring `1.0`, a path graph where endpoints score lower than the center, a disconnected graph where each component normalizes against its own reachable set, and isolated nodes scoring `0.0`. Keep existing centrality tests passing.

# Lint guidelines

The build is warning-sensitive; ensure a clean compile from the command above with no new warnings. Do not edit unrelated modules under `src/`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
