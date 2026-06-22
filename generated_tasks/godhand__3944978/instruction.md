# Task description

Extend the backend health surface in the Godhand director service. Two related changes are needed:

1. Enrich the existing `/health` endpoint (in `server/api/routers/health.py`) so its response includes an `uptimeSeconds` field reporting how long the process has been running. Uptime should be measured from application startup, not per-request, and should be a non-negative number that increases over the lifetime of the process.

2. Add a new readiness endpoint at `/ready` that performs a live MongoDB health check. When the database is reachable the endpoint should report a ready state; when MongoDB is unreachable or the check fails it should report not-ready with an appropriate non-2xx status, without raising an unhandled error.

Wire startup state through `server/app.py` and `server/game_server.py` as needed so uptime is tracked from boot, and add any startup safety alerting in `server/utils/startup_alerts.py`. Keep existing `/health` fields and their meanings unchanged so current consumers (including the frontend health client) keep working. Avoid touching unrelated routers, auth, or messaging behavior.

# Test guidelines

Run `make test-backend` to execute the backend suite via pytest. Add or update tests under `server/tests` covering: the new `uptimeSeconds` field shape and non-negativity on `/health`, the `/ready` success path with a reachable mocked Mongo, and the `/ready` failure path when the Mongo check raises or reports unhealthy. Tests use the `testing` environment and mocked Mongo from `server/tests/conftest.py`; follow that fixture pattern rather than requiring a live database.

# Lint guidelines

No separate backend linter is configured. Ensure the suite runs cleanly with `make test-backend` and that no imports or unused symbols are left behind.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
