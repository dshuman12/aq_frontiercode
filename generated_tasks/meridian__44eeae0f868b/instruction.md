# Task description

Two cycle-enumeration routines in the traversal layer misbehave on certain directed and undirected graphs.

`simple_cycles(G)` in `meridian/algorithms/traverse.py` can enter an infinite loop on directed graphs that contain self-loops or multiple interlocking cycles. Rework it so it terminates for every finite graph and yields each elementary (simple) directed cycle exactly once. Each cycle should be returned as a list of nodes without repeating the closing node, self-loops should appear as single-node cycles, and two cycles that are rotations of the same node set must not both be emitted.

`cycle_basis(G)` in the same module returns duplicate cycles for some undirected graphs. Make it return a minimum cycle basis where each basis cycle appears once, the number of cycles equals `m - n + c` (edges minus nodes plus connected components), and no two returned cycles are identical as node sets.

Keep the existing function names, call signatures, and return shapes (lists of node lists) so dependent code in `meridian/algorithms/centrality.py`, `meridian/analysis/paths.py`, `meridian/graph.py`, and `meridian/multigraph.py` continues to work. Do not change unrelated traversal helpers or public exports.

# Test guidelines

Run `pytest` and confirm the suite passes. Add or extend coverage under `tests/` (notably `tests/test_traverse.py`) exercising self-loops, nested and interlocking directed cycles, disconnected undirected graphs, and graphs whose cycle basis size must equal `m - n + c`. Verify termination and that no duplicate or rotated cycles are emitted.

# Lint guidelines

Keep imports tidy and remove any dead code introduced while fixing the loop. Match the existing typing and `from __future__ import annotations` conventions already used across the module.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
