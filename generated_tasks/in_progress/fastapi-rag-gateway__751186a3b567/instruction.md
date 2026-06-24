# Task description

Paginated list responses in `app/core/pagination.py` carry metadata describing how many pages exist for a result set and whether another page follows the one currently being viewed. The current page-count computation truncates instead of rounding up: when the total number of items is not an exact multiple of the page size, the trailing partial page is dropped. As a result, clients are told there are fewer pages than actually exist, and the "has next page" indicator reports `False` while a reachable page still remains.

Correct the pagination metadata so that a final partial page is always counted and reported as reachable. The total page count should reflect every page needed to cover all items, and the next-page indicator should be `True` whenever the current page is not the last one.

Keep the existing public surface intact: the `PageRequest` interface (`page`, `size`, `sort`, `direction`, and `normalised()`) used by `page_request_dep` must continue to behave as before, and field names exposed in page metadata must not change. Edge cases to preserve: an empty result set yields a single page (or zero, matching current empty-set semantics) with no next page, and an exactly-full final page must not introduce a phantom extra page.

# Test guidelines

Add a behavioural test in `tests/unit/test_pagination.py` covering non-multiple totals (a trailing partial page is counted and reachable), exact-multiple totals (no phantom page), single-page and empty result sets, and the last-page next-indicator. Run `pytest tests/unit/test_pagination.py`; the full suite runs via `make test`. Do not weaken assertions to fit the previous truncating behaviour.

# Lint guidelines

Run `make lint` for ruff, black, and mypy checks, and `make format` to auto-fix formatting. Keep changes within `app/core/pagination.py` and the new test; avoid edits to unrelated modules.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
