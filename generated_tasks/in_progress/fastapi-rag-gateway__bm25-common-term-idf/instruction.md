# Task description

The keyword (BM25) retriever in `app/rag/retrievers/bm25.py` returns poor results when a query contains a very common word — one that appears in most or all of the indexed documents. In that case, documents that are genuinely relevant to the *other*, more specific terms in the query get ranked below unrelated documents, or disappear from the results entirely. For example, a search such as `"the quantum ..."` can come back empty even though one indexed document is clearly about quantum topics.

Fix the keyword retriever so that including a common word in a query can never push a genuinely relevant document out of the ranking. Ranking for rare and normal-frequency terms must stay sensible and unchanged from today's behaviour.

Keep `BM25Retriever`'s public surface unchanged: the `retrieve(query, *, top_k=4, **kwargs)` signature, the `name = "bm25"` attribute, and the `RetrievedItem` results (id, text, score, rank, metadata) must stay consistent with `BaseRetriever`. Do not alter the dense, hybrid, or ensemble retrievers.

# Test guidelines

Run `pytest tests/unit/test_retrievers.py`. Add a behavioural test under `tests/unit/` that reproduces the reported failure: build a small in-memory corpus that exhibits the problem, then assert that a query mixing a common word with a more specific one still surfaces the relevant document and does not drop it or rank it beneath unrelated documents. The test must fail against the current behaviour and pass once the retriever is fixed. Keep tests offline using in-memory fixtures; do not require external embedding or LLM services.

# Lint guidelines

Run `make lint` (ruff, black, mypy) and `make format` to auto-fix style before submitting. Code must satisfy the line-length 100 config in `pyproject.toml`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
