# Task description

The fixed-size character chunker in `app/rag/chunking/fixed.py` is meant to slide a window of `chunk_size` characters across the document, advancing by `chunk_size - chunk_overlap` each step so that adjacent windows share `chunk_overlap` characters at their seams. Today its `split_text` advances by a full window, so the configured overlap is silently dropped and neighbouring chunks never share context.

Update `FixedChunker.split_text` so consecutive windows overlap by exactly `options.chunk_overlap` characters. The method must keep returning an ordered `list[str]` covering the entire input text with no gaps, and it must always terminate (including when `chunk_overlap` is `0` or close to `chunk_size`). `ChunkOptions` already guarantees `0 <= chunk_overlap < chunk_size`, so rely on that invariant rather than re-validating.

Match the slicing convention already used by the sibling chunkers (`recursive.py`, `token.py`): emit `text[start:end]`, stop once a window reaches the end, and never advance by fewer than one character. Do not change `BaseChunker.chunk`, `ChunkOptions`, the `get_chunker` factory, or other chunker strategies.

# Test guidelines

Add a behavioural test under `tests/unit/` (extending `tests/unit/test_chunking.py`) that constructs a `FixedChunker` with a known `chunk_size` and non-zero `chunk_overlap` and asserts that adjacent chunks share exactly `chunk_overlap` trailing/leading characters. Cover the full-coverage property (concatenating non-overlapping spans reproduces the text), termination when `chunk_overlap` is `0`, and inputs shorter than one window. Run the visible suite with `pytest tests/unit/test_chunking.py`, and `make test-unit` for the wider unit set.

# Lint guidelines

Run `make format` to apply ruff and black, then `make lint` to confirm ruff, black `--check`, and mypy pass under the line-length-100 config in `pyproject.toml`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
