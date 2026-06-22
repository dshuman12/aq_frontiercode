# Task description

Add a dedicated readiness endpoint to the backend health router and surface startup safety alerts when the server boots into a risky or misconfigured state.

The health API in `server/api/routers/health.py` currently exposes basic liveness. Extend it with a readiness check that reports whether the application is actually prepared to serve traffic (for example, required dependencies and configuration are present). Liveness behavior must remain unchanged so existing monitors keep working.

During application startup in `server/app.py` and `server/game_server.py`, evaluate the runtime configuration and emit clear safety alerts for conditions that could be unsafe in production (such as insecure or missing critical settings). Centralize this alert logic in a new `server/utils/startup_alerts.py` module so both entry points share consistent checks and messaging. Alerts should be observable through the existing logging setup and must not crash startup.

Success means readiness accurately reflects serve-readiness, startup alerts fire for the relevant risky configurations, and both server entry points wire in the shared checks without altering unrelated request handling.

# Test guidelines

Run `make test-backend` from the repository root to execute the suite via `pytest`. Add or update tests under `server/tests` to cover the readiness endpoint responses (ready vs. not-ready), liveness staying intact, and that startup alerts trigger for misconfigured states while passing cleanly for safe ones. Tests rely on the `testing` environment and mocked Mongo from `server/tests/conftest.py`.

# Lint guidelines

No separate linter is configured for the backend; ensure `make test-backend` passes cleanly with no new warnings or import errors.

# Style guidelines

Match existing FastAPI router and module conventions, and reuse the logging helpers in `server/utils/logging.py` rather than introducing a new logging mechanism. Keep changes scoped to the backend; do not modify the frontend or unrelated routers. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
