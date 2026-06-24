# Task description

The `authentication` gateway is currently represented in the scope-map's external gateway machinery with a wildcard ARN slot, which was a workaround to avoid a Terraform cycle: the authorizer Lambda cannot depend on the gateway it is attached to. This wildcard slot is fragile — it lets the authentication gateway leak into the same code path as genuinely external gateways, blurring the local/external distinction the route lookup relies on.

Break the Terraform cycle properly so the authentication gateway is no longer a wildcard entry in the external gateway map. Local routes (this service's own gateway) should be modelled as a distinct, first-class concern from externally-resolved gateways, and `GATEWAY_IDS` should carry only genuinely external gateway IDs.

Keep the request-time decision behaviour identical: an incoming `methodArn` for a local route must still match and resolve to `matchedPath: "local"`, and external routes to `"external"`. The `lookupByRouteMetadata` contract (`RouteLookupResult` with `decision`, `matchedPath`, `matchedScope`, `matchedRoute`) must stay unchanged. Update `gateway-ids.ts`, `scope-map/index.ts`, and `scope-map/types.ts` consistently, adjust `terraform/3-gateway.tf` and `terraform/9-external-scopes.tf`, and refresh the authorizer README and `.gitignore` as needed.

# Test guidelines

Run `npm test` to execute the unit suite under `src/functions`. Add or update tests in `src/functions/general/authorizer` and `src/functions/general/authorizer/scope-map/routes` so they cover: local-gateway routes resolving with a wildcard gateway slot in the compiled ARN, external routes resolving against concrete injected IDs, and the absence of `authentication` from the external `GATEWAY_IDS` map. The drift test in `scope-map/routes/authentication.drift.test.ts` must still pass against `terraform/3-gateway.tf`. Tests stub `GATEWAY_IDS` via `vi.stubEnv` before dynamically importing the scope-map module.

# Lint guidelines

Run `pnpm run lint-fix` to apply Prettier, then `pnpm run lint` and `pnpm run typecheck` to confirm formatting and types are clean. For Terraform edits, run `terraform fmt terraform/` and `terraform init -backend=false && terraform validate` from the `terraform/` directory.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
