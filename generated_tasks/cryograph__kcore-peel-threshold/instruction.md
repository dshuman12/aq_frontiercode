# Task description

`k_core_decomposition` in `src/decomposition/decomposition.cpp` produces coreness values that are systematically one too low. Nodes that belong to a 2-core report coreness `1`, and because `k_shell`, `k_core_subgraph`, `degeneracy`, and `KCoreResult::max_k` are all derived from these coreness assignments, every one of them is shifted down by one as well.

The fault lies in the peeling loop: when a node is removed during the iterative min-degree peeling, the condition that decides whether a surviving neighbor's residual degree should be decremented uses the wrong degree threshold. Correct the comparison so that a neighbor's residual degree is only reduced when it is still strictly above the current peeling level, matching the standard Batagelj–Zaversnik core decomposition.

Keep the existing signatures and the `KCoreResult` contract in `decomposition.hpp` unchanged: `coreness` stays a `std::unordered_map<NodeId, size_t>`, `max_k` must equal the largest coreness value, and `k_core_subgraph`/`k_shell` must reflect the corrected values. Do not alter unrelated algorithms in this file or touch other modules.

# Test guidelines

Add or extend cases in `tests/test_core.cpp` so they cover a triangle (every node coreness 2), a path graph (coreness 1), a node joined to a larger clique, and an isolated vertex (coreness 0). Verify that `degeneracy`, `k_shell(g, k)`, and `k_core_subgraph` agree with the corrected coreness and that `max_k` matches the maximum. Register new test files in `tests` via `CMakeLists.txt` if needed.

Run the visible test command:

```bash
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

# Lint guidelines

Configure and build with `cmake -S . -B build && cmake --build build -j4`; resolve all compiler warnings surfaced during the build before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
