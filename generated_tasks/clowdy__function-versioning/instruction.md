# Task description

Add code versioning to Clowdy functions in the `app/routers/functions.py` router and supporting modules. Today a function stores its source in a single `code` column, so editing a function overwrites the previous source. Introduce a dedicated version store, keyed by `(function_id, version)`, that retains every revision and records which revision is currently active on the function.

Required behaviors:

- `create_function(data: FunctionCreate, user_id, db)` records the initial code as version 1 and returns a dict-like payload exposing `active_version == 1` and `code` resolved from that active version (alongside existing fields such as `id`, `description`).
- `update_function(function_id, data: FunctionUpdate, user_id, db)` appends a new higher-numbered version and makes it active when `code` is provided, leaving earlier versions unchanged; a metadata-only update (e.g. `name`, `description`) must not create a version and must keep `active_version` and `code` stable.
- `get_function(function_id, user_id, db)` resolves `code` and `active_version` from the active version.
- Add `list_versions(function_id, user_id, db)` returning stored versions newest-first, each exposing `.version` and `.code`.
- Add `set_active_version(function_id, version, user_id, db)` that activates an existing version and resolves subsequent reads to its code.

Unknown function or version returns HTTP 404; all version access is scoped to the owning `user_id` (404 otherwise). Every place code is read (create, get, list, update, invoke, gateway, chat) must resolve the active version, not a row column. Add an Alembic migration creating the version table. Define the model in `app/models.py` and any schema changes in `app/schemas.py`.

# Test guidelines

Run `python -m pytest tests -q`. The suite in the `tests` directory drives the router coroutines directly against a fresh in-memory SQLite database (no Clerk, migrations, or HTTP), so keep these functions importable and callable with `user_id`/`db` keyword arguments. Cover initial version creation, code-update versioning with old revisions preserved, metadata-only updates that skip versioning, rollback via `set_active_version`, 404 for unknown versions, and owner scoping. Add or extend tests there for new edge cases without relying on external services.

# Lint guidelines

Keep imports ordered and remove unused ones. Match the existing async SQLAlchemy patterns and FastAPI dependency style already used across the routers.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
