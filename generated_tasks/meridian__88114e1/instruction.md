# Task description

`betweenness_centrality` in `meridian/algorithms/centrality.py` produces incorrect scores for undirected graphs when `normalized=True`. The normalization currently divides accumulated pair-dependency values by `1/((n-1)(n-2))`, which is the correct factor only for directed graphs. In an undirected graph each unordered pair of endpoints is accumulated once per direction during the dependency-accumulation phase, so the proper scaling factor is `2/((n-1)(n-2))`. As a result, every normalized undirected score is exactly half of its standard value.

Update the normalization so that undirected graphs yield the conventional betweenness-centrality values (e.g. matching well-known references for path and star graphs), while directed graphs keep their existing, already-correct normalization. Preserve current behavior for the unnormalized case, for endpoint inclusion options, and for small graphs where the denominator would be zero (those must not raise or divide by zero). Keep the function's signature, return type (a dict mapping node to float), and exported name unchanged. Do not alter `edge_betweenness_centrality` ordering relied on by `girvan_newman`, and do not touch other centrality functions.

# Test guidelines

Run the suite with `python -m pytest tests/ -x -q`. Add or extend cases in `tests/test_centrality.py` to lock in correct normalized undirected scores. Cover a simple path graph and a star graph where exact expected values are known, confirm directed-graph normalization is unaffected, and include a degenerate graph (one or two nodes) to verify no division-by-zero occurs. Compare floats with an appropriate tolerance rather than exact equality.

# Lint guidelines

No separate lint step is configured; keep the diff minimal and consistent with the surrounding code so the existing suite stays green.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
