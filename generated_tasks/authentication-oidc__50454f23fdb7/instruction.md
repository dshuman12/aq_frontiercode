# Task description

The authorizer's scope map composes a fully-qualified `execute-api` ARN pattern for each route. For routes on this service's own authentication gateway, the gateway-id slot must be a wildcard rather than a concrete ID: the authentication gateway cannot appear in the Terraform-resolved `GATEWAY_IDS` map without creating a dependency cycle (`terraform/9-external-scopes.tf` resolves external gateways, and the authorizer Lambda is itself attached to the authentication gateway).

Currently the cycle is not broken cleanly, and the wildcard handling for the authentication gateway slot is inconsistent with how external routes are composed. Rework the gateway-id resolution so the authentication gateway is never expected in `GATEWAY_IDS`, the wildcard ARN slot is produced correctly for authentication routes, and external routes continue to use their concrete resolved IDs.

Keep the public surface stable: `lookupByRouteMetadata` must still match incoming `methodArn`s against the compiled routes, first match wins, and scope checks remain an OR over each route's `scopes` array. External gateway IDs must stay driven by the zod-validated `GATEWAY_IDS` env var, and no request-time fetching (S3/SSM) may be introduced. Update `terraform/3-gateway.tf` and `terraform/9-external-scopes.tf` so the cycle is genuinely broken, and keep the authorizer README accurate.

# Test guidelines

Run `npm test` to exercise the authorizer unit suites. Add or update tests under `src/functions/general/authorizer` and `src/functions/general/authorizer/scope-map/routes` to cover: authentication routes compiling with a wildcard gateway-id slot, external routes resolving to their concrete `GATEWAY_IDS` values, and `methodArn` matching behaviour for both. The drift test in `scope-map/routes/authentication.drift.test.ts` must continue to pass against the updated `terraform/3-gateway.tf`.

Tests stub `GATEWAY_IDS` via `vi.stubEnv` before dynamically importing the module, so the authentication gateway must not be a required key in that map.

# Lint guidelines

Run `pnpm run typecheck` and `pnpm run lint` (Prettier) before finishing; run `terraform fmt terraform/` so the changed `.tf` files stay formatted. Resolve all reported issues.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Avoid hardcoding gateway IDs in `config/*.yaml` or in TypeScript, and do not reintroduce the removed S3 scope-map object or its SSM URL parameter.
