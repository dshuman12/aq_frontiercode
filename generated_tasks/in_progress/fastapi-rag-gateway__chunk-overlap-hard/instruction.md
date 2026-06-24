# Task description

Retrieval quality has regressed for documents processed with the fixed-size chunking strategy in `app/rag/chunking/fixed.py`. Consumers that rely on neighbouring chunks sharing context at their boundaries report that the seams no longer line up. The intended contract is:

- With a configured `chunk_overlap`, consecutive fixed-size chunks must share exactly `chunk_overlap` characters where one chunk ends and the next begins.
- The chunks together must cover the entire document with nothing dropped and no characters duplicated beyond the overlap region (no run-on).
- The contract must hold across overlap settings, including small strides and a zero overlap (where chunks abut exactly with no shared characters).

Diagnose why the configured overlap is not being honoured for this strategy and correct it. `FixedChunker` exposes `split_text(self, text: str) -> list[str]` and is driven by `ChunkOptions` (`chunk_size`, `chunk_overlap`); keep that interface intact and continue to respect the validation already enforced in `ChunkOptions.__post_init__` (overlap non-negative and smaller than `chunk_size`). Do not alter other chunkers (`recursive`, `sentence`, `semantic`, `token`) or the shared `BaseChunker.chunk` assembly behaviour.

# Test guidelines

Run `pytest tests/unit/test_chunking.py`. Add a behavioural test under `tests/unit/` (creating `tests/unit/test_chunking.py` if absent) that pins the seam-sharing and full-coverage contract: assert that adjacent chunks share exactly `chunk_overlap` trailing/leading characters, that concatenating non-overlapping regions reconstructs the source text, and cover edge cases of small overlap, zero overlap, and text shorter than `chunk_size`. Prefer `FixedChunker` directly with explicit `ChunkOptions`. Keep the full suite green with `make test-unit`.

# Lint guidelines

Run `make format` to apply ruff and black, then `make lint` to verify ruff, black `--check`, and mypy pass for the changed files.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
