# Task description

VaultKey's README and access-control architecture describe pluggable authentication backends, but the package snapshot does not provide the `vaultkey.access.auth` module. Add the missing auth layer so callers can import and use concrete backends without special setup. The implementation should fit the existing in-memory, dependency-light style used by `vaultkey.access.identity`, `vaultkey.access.tokens`, and the utility error hierarchy.

Provide a small common backend interface and a successful authentication result object. Implement username/password authentication with salted password hashing and constant-time verification, AppRole authentication with generated role IDs and secret IDs, certificate fingerprint authentication, and token validation for already-issued tokens. Include an auth manager that registers backends by name and dispatches authentication requests. The module should raise `AuthenticationError` for bad credentials, disabled backends, missing inputs, and unknown backends, while preserving existing behavior in the rest of the package.

Round out the auth support with lightweight helpers for rate limiting attempts, session tracking, MFA challenges, auth event logging, and auth configuration validation. These helpers should be deterministic enough to test, avoid external services, and use the repository's existing random ID, token, and error utilities where appropriate.

# Test guidelines

Run the existing regression suite with:

```bash
PYTHONPATH=src python3 -m pytest tests/ -q
```

Add focused tests under `tests/` for the new auth module when possible. Cover successful and failed authentication for userpass, AppRole, certificate, and token flows; manager registration and dispatch; disabled backends; and any stateful helper behavior you add. Tests should assert observable contracts such as returned policies, metadata, TTLs, sorted listing methods, and `AuthenticationError` failures rather than private implementation details.

# Lint guidelines

At minimum, verify the module compiles with:

```bash
PYTHONPATH=src python3 -m compileall src
```

The project has Ruff settings in `pyproject.toml`; if Ruff is available in your environment, also run `python3 -m ruff check src tests`. Do not add a new dependency just to satisfy this task.

# Style guidelines

Keep the change local to the access-auth area and any tests that exercise it. Match the repository's current dataclass-heavy, typed Python style, use existing `vaultkey.crypto.random` helpers for generated IDs/secrets, and report auth failures through `vaultkey.utils.errors.AuthenticationError`. You are already on the correct starting snapshot; do not rebase or start from another branch.

