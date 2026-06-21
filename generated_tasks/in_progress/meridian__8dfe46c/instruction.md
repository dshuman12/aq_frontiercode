# Task description

There are correctness bugs in `meridian/analysis/bipartite.py`. The module implements BFS-based graph bipartite detection and 2-coloring, but produces incorrect results for common cases:

- Calling `bipartite_sets` or `two_color` on a straightforward bipartite graph (e.g. a 4-cycle or a path) raises a `ValueError` unexpectedly, while calling either function on a graph that contains an odd cycle (which is genuinely *not* bipartite) returns without raising.

Fix the identified correctness issues and verify that all public functions in the module behave correctly. Make sure to check each function's behavior against its docstring and intended contract.

After fixing, the following properties must hold:

- A `ValueError` is raised when an edge connects two same-colored nodes (odd cycle detected / graph is not bipartite).
- Valid bipartite graphs are colored and partitioned without error.
- `bipartite_sets` returns the two color classes as expected, and `two_color` returns its color map consistently.
- All other public functions in the module return results consistent with their documented contract.

Keep the existing function signatures, return types, and exported names unchanged. Do not alter unrelated analysis modules or the BFS/DFS traversal strategy. Disconnected graphs and single-node components must continue to work.

# Test guidelines

Run `python -m pytest tests/ -x -q` and ensure all tests pass.

Tests live in the `tests` directory; coloring and bipartite behavior is covered by `tests/test_coloring.py` and `tests/test_clique_bipartite.py`. Unless existing cases already cover the change, add or extend tests to assert that even cycles, paths, trees, and complete bipartite graphs partition cleanly, while odd cycles (e.g. triangles, 5-cycles) and odd-cycle-containing graphs raise `ValueError`. Cover disconnected inputs with mixed components.

# Lint guidelines

No additional linter is required. Keep imports and style consistent with the surrounding module, and avoid introducing unused names.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
