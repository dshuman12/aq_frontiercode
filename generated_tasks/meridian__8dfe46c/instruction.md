# Task description

The bipartite analysis utilities in `meridian/analysis/bipartite.py` misclassify graphs during 2-coloring. The conflict check in `two_color` (and therefore `bipartite_sets`, which builds on it) uses the wrong comparison when inspecting an already-colored neighbor: it treats *differently* colored endpoints as a conflict and *identically* colored endpoints as acceptable. This inverts the intended logic.

As a result, genuinely bipartite graphs (even cycles, trees, paths, complete bipartite graphs) raise `ValueError`, while graphs containing an odd cycle are silently accepted and returned with an invalid coloring.

Fix the coloring validation so that:

- A `ValueError` is raised when an edge connects two same-colored nodes (an odd cycle exists / the graph is not bipartite).
- Valid bipartite graphs are colored and partitioned without error.
- `bipartite_sets` returns the two color classes as expected, and `two_color` returns its color map consistently.

Keep the existing function signatures, return types, and exported names unchanged. Do not alter unrelated analysis modules or the BFS/DFS traversal strategy beyond the comparison fix. Disconnected graphs and single-node components must continue to work.

# Test guidelines

Run `python -m pytest tests/ -x -q` and ensure all tests pass.

Tests live in the `tests` directory; coloring and bipartite behavior is covered by `tests/test_coloring.py` and `tests/test_clique_bipartite.py`. Unless existing cases already cover the change, add or extend tests to assert that even cycles, paths, trees, and complete bipartite graphs partition cleanly, while odd cycles (e.g. triangles, 5-cycles) and odd-cycle-containing graphs raise `ValueError`. Cover disconnected inputs with mixed components.

# Lint guidelines

No additional linter is required. Keep imports and style consistent with the surrounding module, and avoid introducing unused names.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
