# Task description

`bipartite_matching` in `src/matching/matching.cpp` under-counts the maximum matching on graphs that require rematching. When a left vertex can only reach right vertices that are already matched, it is currently left unmatched even when an existing left vertex could be reassigned to a different free right vertex to make room. The result is a matching smaller than the true maximum.

Fix the algorithm so it finds a maximum cardinality bipartite matching by augmenting through already-matched right vertices: when a right vertex is taken, attempt to rematch its current left partner to another available right vertex (standard augmenting-path search). Graphs that are trivially assignable must still produce the same matching size as before.

Keep the existing signature and `MatchingResult` contract unchanged: `bipartite_matching` takes the graph and the `left`/`right` vertex sets and returns matched edge pairs. `has_perfect_matching` and `matching_number`, which build on this routine, must reflect the corrected counts. Only edges between `left` and `right` should be considered; vertices outside both sets are ignored.

# Test guidelines

Add or extend cases in `tests/test_matching.cpp` (register it in `CMakeLists.txt` if not already built) covering: graphs needing one or more augmenting reassignments, trivially-assignable graphs, graphs with no edges, and asymmetric `left`/`right` sizes. Verify the returned `size()` equals the known maximum and that every returned pair connects a `left` to a `right` vertex via a real edge. Confirm `has_perfect_matching` agrees with the matching size.

Run the visible test command:

```bash
cmake -S . -B build >/dev/null 2>&1 && cmake --build build -j4 >/dev/null 2>&1 && ./build/cryograph_tests
```

# Lint guidelines

Build cleanly with `cmake -S . -B build && cmake --build build -j4`; resolve all compiler warnings introduced by your change. Do not modify unrelated modules or public headers beyond what the contract above requires.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
