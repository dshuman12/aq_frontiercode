# Task description

Two cycle-related defects in `meridian/algorithms/traverse.py` need fixing so that cycle enumeration on directed and undirected graphs terminates and returns correct, de-duplicated results.

`simple_cycles(G)` must enumerate each elementary directed cycle of a `DiGraph` exactly once without entering an infinite loop. Self-loops (an edge `u -> u`) must be reported as the single-node cycle `[u]`. A cycle visiting nodes once must not be re-emitted under rotations of its starting point, and the traversal must not revisit blocked nodes endlessly. Each returned cycle is a list of nodes in traversal order with no repeated terminal node.

`cycle_basis(G)` must return a list of independent cycles for an undirected `Graph`, each cycle being a list of nodes, with no duplicate cycles in the output (two cycles that contain the same node set must not both appear). It should work per connected component and produce exactly `m - n + c` cycles for a graph with `m` edges, `n` nodes, and `c` connected components.

Keep the existing public signatures and behavior of other traversal helpers (e.g. `topological_sort`, `has_cycle`) unchanged, since `DiGraph.is_dag` and other modules depend on them.

# Test guidelines

Run `pytest` to validate. Add or extend cases under `tests/` (notably traversal-focused tests) covering: graphs with self-loops, directed graphs with multiple overlapping cycles, undirected graphs with several independent cycles, disconnected graphs, and acyclic inputs that must yield no cycles. Confirm cycle counts and that no rotated or set-duplicate cycles are emitted, and verify termination on inputs that previously hung.

# Lint guidelines

Keep imports tidy and remove any now-unused names. Match the existing type-hint and docstring conventions used across `meridian/algorithms/`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Avoid changing unrelated modules or reformatting untouched code.
