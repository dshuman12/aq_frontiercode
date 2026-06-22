# Task description

The lobby HTTP router lost its routing fallback behavior, causing requests that should resolve to a default lobby route to fail or return incorrect responses. At the same time, several backend tests have become unstable, intermittently passing and failing depending on ordering or shared state.

Restore the lobby routing fallback in `server/api/routers/lobby.py` so that unmatched or default-path lobby requests are handled consistently and return the expected responses. Audit the related lobby constants in `server/utils/constants.py` to ensure the fallback uses the correct, single source of truth for default route values rather than divergent literals.

Stabilize the affected backend tests so the suite passes deterministically regardless of run order. Eliminate cross-test state leakage, fixture reuse problems, or reliance on incidental ordering.

Existing public endpoints, response shapes, and authentication behavior for already-matched lobby routes must remain unchanged. Limit changes to the backend; do not modify the frontend, netcode service, or Docker configuration.

# Test guidelines

Run `make test-backend` to execute the suite via `./server/scripts/test.sh`, which runs `pytest` against `server/tests`. Tests use the `testing` environment and mocked Mongo setup from `server/tests/conftest.py`.

Add or update tests under `server/tests` (notably `test_lobby_api.py`) to cover the routing fallback path, unmatched route handling, and the default-route resolution. Include coverage that demonstrates deterministic behavior under repeated and reordered runs, guarding against shared-state regressions.

Run the suite multiple times and confirm consistent results before considering the task complete.

# Lint guidelines

No separate linter is configured for the backend. Keep imports clean and avoid introducing unused symbols. Ensure `make test-backend` runs without warnings introduced by your changes.

# Style guidelines

Follow the existing FastAPI router and module conventions already present in `server/api/routers` and `server/utils`. Keep default route values defined once in `server/utils/constants.py` and referenced everywhere rather than duplicated.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
