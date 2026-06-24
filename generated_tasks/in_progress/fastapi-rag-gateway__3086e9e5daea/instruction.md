# Task description

The authentication layer in `app/core/security.py` mints separate access and refresh tokens, each carrying a token-type claim. Several call sites decode a token while expecting a specific kind: the token-refresh flow must only accept a refresh token, while request authentication (see `current_token_dep` in `app/core/dependencies.py`, which calls `decode_token(..., expected_type="access")`) must only accept an access token. Today decoding ignores the requested kind, so a token of the wrong type is accepted wherever a specific type is required — a refresh token can be used to authenticate requests, and an access token can be used to refresh.

Make `decode_token` enforce the requested type: when `expected_type` is supplied, a token whose embedded type does not match must be rejected as an authentication failure; when `expected_type` is omitted (or `None`), decoding must continue to succeed regardless of the token's type. Keep the existing `decode_token` signature, the `TokenPayload` shape, and access/refresh creation behaviour unchanged so existing callers and the auth flow keep working.

# Test guidelines

Add a unit test under `tests/unit/` (the visible suite runs with `pytest tests/unit/test_security.py`) that covers: decoding an access token with `expected_type="access"` succeeds, decoding a refresh token with `expected_type="access"` is rejected, the symmetric refresh case, and that omitting `expected_type` accepts either kind. Assert rejection surfaces as the authentication error path used elsewhere, not a generic exception. Reuse real token creation helpers rather than hand-crafting JWTs.

# Lint guidelines

Run `make lint` (ruff, black, mypy) and `make format` to auto-fix. New code must pass under the configured ruff rule set and 100-column black formatting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Keep the change scoped to token-type enforcement; do not alter unrelated security helpers, expiry handling, or other call sites beyond what the contract requires.
