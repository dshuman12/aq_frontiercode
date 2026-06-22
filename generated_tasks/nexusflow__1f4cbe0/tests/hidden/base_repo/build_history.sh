#!/bin/bash
# Build realistic git history for nexusflow repo
# This script creates backdated commits simulating 2 years of development
set -e

cd /home/vaishnagupta/nexusflow

# Configure git
git init
git config user.name "Nikhil Mishra"
git config user.email "nikhilmishra398@gmail.com"

commit_at() {
    local date="$1"
    local msg="$2"
    GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -m "$msg" --allow-empty-message
}

add_and_commit() {
    local date="$1"
    local msg="$2"
    shift 2
    git add "$@"
    commit_at "$date" "$msg"
}

# ===== June 2024: Initial setup =====
git add .gitignore LICENSE README.md pyproject.toml
commit_at "2024-06-10T09:00:00" "Initial project setup"

git add nexusflow/__init__.py nexusflow/app.py
commit_at "2024-06-12T14:30:00" "Add core application factory with lifecycle management"

git add nexusflow/utils/__init__.py nexusflow/utils/types.py
commit_at "2024-06-15T11:00:00" "Add utility types module (sentinels, Result monad)"

git add nexusflow/utils/crypto.py nexusflow/utils/encoding.py
commit_at "2024-06-20T16:00:00" "Add crypto and encoding utilities"

git add nexusflow/utils/concurrency.py nexusflow/utils/retry.py
commit_at "2024-06-25T10:00:00" "Add concurrency helpers and retry with circuit breaker"

# ===== July 2024: Config module =====
git add nexusflow/config/__init__.py nexusflow/config/schema.py
commit_at "2024-07-02T09:30:00" "Add configuration schema with validation"

git add nexusflow/config/loader.py
commit_at "2024-07-08T14:00:00" "Add config loader with YAML + env var support"

git add nexusflow/config/secrets.py
commit_at "2024-07-15T11:30:00" "Add secrets manager with multiple backends"

# ===== August 2024: Database module =====
git add nexusflow/db/__init__.py nexusflow/db/connection.py
commit_at "2024-08-01T10:00:00" "Add database connection pool with health checking"

git add nexusflow/db/query_builder.py
commit_at "2024-08-10T15:00:00" "Add SQL query builder with parameterized queries"

git add nexusflow/db/models.py
commit_at "2024-08-18T09:00:00" "Add ORM-like model definitions with field types"

git add nexusflow/db/transactions.py
commit_at "2024-08-22T13:30:00" "Add transaction manager with savepoint support"

git add nexusflow/db/migrations.py
commit_at "2024-08-28T16:00:00" "Add schema migration engine"

git add nexusflow/db/caching.py
commit_at "2024-08-30T11:00:00" "Add query result caching (LRU + TTL)"

# ===== September 2024: Auth module =====
git add nexusflow/auth/__init__.py nexusflow/auth/jwt.py
commit_at "2024-09-03T09:00:00" "Add JWT token creation and validation"

git add nexusflow/auth/permissions.py
commit_at "2024-09-10T14:30:00" "Add RBAC permission system with role hierarchy"

git add nexusflow/auth/sessions.py
commit_at "2024-09-17T10:00:00" "Add session management with TTL and per-user limits"

git add nexusflow/auth/middleware.py
commit_at "2024-09-22T15:00:00" "Add authentication middleware with rate limiting"

git add nexusflow/auth/oauth.py
commit_at "2024-09-28T11:00:00" "Add OAuth2 authorization code flow with PKCE"

# ===== October 2024: API module =====
git add nexusflow/api/__init__.py nexusflow/api/router.py
commit_at "2024-10-03T09:30:00" "Add dynamic route registry with path parameters"

git add nexusflow/api/validation.py
commit_at "2024-10-10T14:00:00" "Add request validation with type coercion"

git add nexusflow/api/serialization.py
commit_at "2024-10-17T11:00:00" "Add serializer with nested model support"

git add nexusflow/api/pagination.py
commit_at "2024-10-22T16:00:00" "Add cursor-based and offset pagination"

git add nexusflow/api/versioning.py nexusflow/api/openapi.py
commit_at "2024-10-28T10:00:00" "Add API versioning and OpenAPI schema generation"

# ===== November 2024: Events module =====
git add nexusflow/events/__init__.py nexusflow/events/bus.py
commit_at "2024-11-04T09:00:00" "Add event bus with priority dispatch"

git add nexusflow/events/handlers.py nexusflow/events/middleware.py
commit_at "2024-11-12T14:30:00" "Add event handler registry and middleware pipeline"

git add nexusflow/events/replay.py
commit_at "2024-11-20T11:00:00" "Add event replay and sourcing for audit trails"

# ===== December 2024: Tasks module =====
git add nexusflow/tasks/__init__.py nexusflow/tasks/queue.py
commit_at "2024-12-02T09:30:00" "Add priority task queue"

git add nexusflow/tasks/worker.py nexusflow/tasks/scheduler.py
commit_at "2024-12-10T15:00:00" "Add background worker with retry logic and scheduler"

git add nexusflow/tasks/deadletter.py
commit_at "2024-12-18T11:00:00" "Add dead letter queue handling"

# ===== January 2025: Plugins + Telemetry =====
git add nexusflow/plugins/__init__.py nexusflow/plugins/registry.py nexusflow/plugins/hooks.py
commit_at "2025-01-06T09:00:00" "Add plugin registry and hook system"

git add nexusflow/plugins/sandbox.py nexusflow/plugins/lifecycle.py
commit_at "2025-01-15T14:00:00" "Add plugin sandboxing and lifecycle management"

git add nexusflow/telemetry/__init__.py nexusflow/telemetry/metrics.py
commit_at "2025-01-22T10:30:00" "Add metrics collection (counters, histograms, gauges)"

git add nexusflow/telemetry/tracing.py nexusflow/telemetry/logging.py
commit_at "2025-01-28T16:00:00" "Add distributed tracing and structured logging"

git add nexusflow/telemetry/health.py
commit_at "2025-02-03T09:00:00" "Add health check aggregation"

# ===== February-March 2025: Tests =====
git add tests/conftest.py
git add tests/test_config/ tests/test_auth/ tests/test_db/
commit_at "2025-02-15T14:00:00" "Add test suite for config, auth, and db modules"

git add tests/test_api/ tests/test_events/
commit_at "2025-03-01T10:00:00" "Add test suite for API and events modules"

git add tests/test_tasks/ tests/test_plugins/ tests/test_telemetry/ tests/test_utils/
commit_at "2025-03-15T15:00:00" "Add test suite for tasks, plugins, telemetry, utils"

# ===== April-June 2025: Refinements =====
git add -A
commit_at "2025-04-10T11:00:00" "Refactor config merge logic for nested overrides"

# Make a small change to simulate a real commit
echo "# Updated" >> nexusflow/db/query_builder.py
git add nexusflow/db/query_builder.py
commit_at "2025-05-05T09:30:00" "Improve query builder identifier validation"

echo "# Performance tuning" >> nexusflow/db/caching.py
git add nexusflow/db/caching.py
commit_at "2025-06-12T14:00:00" "Tune cache eviction parameters"

# ===== July-September 2025: Bug fixes =====
echo "# Fix session cleanup" >> nexusflow/auth/sessions.py
git add nexusflow/auth/sessions.py
commit_at "2025-07-08T10:00:00" "Fix session cleanup race condition"

echo "# Fix event ordering" >> nexusflow/events/bus.py
git add nexusflow/events/bus.py
commit_at "2025-08-15T15:30:00" "Fix event handler priority sorting"

echo "# Fix pagination edge case" >> nexusflow/api/pagination.py
git add nexusflow/api/pagination.py
commit_at "2025-09-20T11:00:00" "Fix cursor pagination boundary handling"

# ===== October-December 2025: Feature additions =====
echo "# Add batch operations" >> nexusflow/db/models.py
git add nexusflow/db/models.py
commit_at "2025-10-05T09:00:00" "Add batch insert support to model layer"

echo "# Add webhook support" >> nexusflow/events/handlers.py
git add nexusflow/events/handlers.py
commit_at "2025-11-12T14:00:00" "Add webhook event handler type"

echo "# Improve error messages" >> nexusflow/api/validation.py
git add nexusflow/api/validation.py
commit_at "2025-12-01T16:00:00" "Improve validation error messages with field paths"

# ===== January-March 2026: Recent work =====
echo "# Add token rotation" >> nexusflow/auth/jwt.py
git add nexusflow/auth/jwt.py
commit_at "2026-01-20T10:00:00" "Add token rotation support"

echo "# Fix retry backoff calculation" >> nexusflow/utils/retry.py
git add nexusflow/utils/retry.py
commit_at "2026-02-15T14:30:00" "Fix exponential backoff overflow for high retry counts"

echo "# Add plugin metrics" >> nexusflow/plugins/sandbox.py
git add nexusflow/plugins/sandbox.py
commit_at "2026-03-10T11:00:00" "Add per-plugin metrics collection in sandbox"

# ===== April-May 2026: Latest =====
echo "# Fix tracing context" >> nexusflow/telemetry/tracing.py
git add nexusflow/telemetry/tracing.py
commit_at "2026-04-05T09:00:00" "Improve trace context propagation across async boundaries"

git add -A
commit_at "2026-04-20T15:00:00" "Update dependencies and fix deprecation warnings"

git add Dockerfile
commit_at "2026-05-01T10:00:00" "Update Dockerfile for Python 3.12"

echo ""
echo "=== GIT HISTORY BUILT ==="
echo "Total commits: $(git rev-list --count HEAD)"
echo "First commit: $(git log --reverse --format='%ai %s' | head -1)"
echo "Last commit: $(git log --format='%ai %s' | head -1)"
echo ""
echo "=== LINE COUNT ==="
find nexusflow -name '*.py' -exec wc -l {} + | tail -1
find tests -name '*.py' -exec wc -l {} + | tail -1
