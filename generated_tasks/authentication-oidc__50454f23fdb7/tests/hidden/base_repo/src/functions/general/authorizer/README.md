# Authorizer

The OIDC authentication service's Lambda authorizer. Attached to this service's
own API Gateway and to every downstream gateway in the platform. For each
request it:

1. Validates the JWT signature against the auth-service signing key
2. Decodes the token's `scope` claim
3. Decides whether those scopes grant access to the requested resource by
   matching the incoming `methodArn` against the scope map
4. Returns an IAM policy (`Allow` / `Deny`) back to API Gateway

The scope map — **which scopes grant access to which routes** — lives as typed
TypeScript in [`scope-map/`](./scope-map). This README explains how to change it.

## File overview

```
authorizer/
├── authorizer.ts                  — Lambda handler: JWT verify + policy decision
├── authorizer.libs.ts             — generatePolicy + isResourceValidForScopes (old regex path + shadow wiring)
├── authorizer.constants.ts        — legacy old-path code (deleted in Phase 6 cutover)
├── authorizer.route-lookup.ts     — new-path lookup: matches methodArn against compiledRoutes
├── authorizer.route-lookup.test.ts — unit tests for the new path
└── scope-map/
    ├── types.ts                   — GatewayKey, RouteEntry, CompiledRoute (zod-driven)
    ├── gateway-ids.ts             — parses process.env.GATEWAY_IDS into a typed map
    ├── index.ts                   — composes fully-qualified ARN patterns at cold start
    └── routes/
        ├── with-gateway.ts        — helper: stamps gateway onto pure data entries
        ├── authentication.ts      — routes on this service's own gateway
        ├── api-broker.ts          — one file per external gateway (11 in total)
        ├── apr.ts                 — (filename strips `_oidc` from the gateway key)
        ├── ... (one per gateway)
        ├── authentication.drift.test.ts — guards routes vs terraform/3-gateway.tf
        └── index.ts               — barrel: stamps gateway, composes single routes array
```

## How the scope map works

- At Terraform apply time, `terraform/9-external-scopes.tf` resolves every
  external gateway ID via `data "aws_api_gateway_rest_api"` lookups and packs
  them into a single JSON object passed to the Lambda as the `GATEWAY_IDS` env
  var (~300 bytes). The authentication gateway itself is **not** in this map
  (would create a Terraform cycle); it's resolved at request time via a
  wildcard in the ARN pattern.
- At Lambda cold start, `scope-map/index.ts`:
  - reads `GATEWAY_IDS` (validated via the zod schema in `gateway-ids.ts`)
  - imports the single `routes` array from `routes/index.ts` — already
    gateway-stamped by the barrel via `withGateway(...)` per per-service file
  - composes a fully-qualified execute-api ARN pattern for each route:

    ```
    arn:aws:execute-api:${REGION}:${ACCOUNT}:${gatewayIds[route.gateway]}/${route.stage}/${route.method}${route.path}
    ```

    For `authentication` routes the gateway-id slot is `*` (wildcard) instead
    of a concrete ID — safe because this authorizer is only attached to the
    authentication gateway, so the invoking methodArn always carries the
    correct gateway-id at runtime.

  The compiled list is cached in module scope for the container's lifetime.

- On every request, `lookupByRouteMetadata` iterates the compiled list,
  regex-matches the incoming `methodArn`, and checks whether any of the
  token's scopes are in the matching route's `scopes` array. First match
  wins.

The authorizer **never handles gateway IDs directly** and **never fetches
anything at request time** — no S3, no SSM, no placeholder substitution.

## Adding a new route

### 1. Find the file for the gateway

Each gateway has its own file under `scope-map/routes/`. The filename is the
gateway key with `_oidc` stripped (since the suffix is an AWS naming artefact,
not a code distinction). Examples:

| Gateway key | File |
| --- | --- |
| `authentication` | `routes/authentication.ts` |
| `api_broker` | `routes/api-broker.ts` |
| `card_service_oidc` | `routes/card-service.ts` |
| `repayment_service` | `routes/repayment-service.ts` |

If your route's gateway doesn't have a file yet, see **Adding a new external
gateway** below.

### 2. Add a `RouteWithoutGateway` entry

Each per-service file holds pure data — no `gateway` field, since the barrel
stamps it via `withGateway(...)`.

```ts
// routes/authentication.ts
{
  stage:   "*",                    // "*" for stage-agnostic, ENV for api-broker / apr
  method:  "POST",                 // HTTP verb ($connect for WebSocket)
  path:    "/new-route",           // single-segment wildcards use "*", not "{param}"
  scopes:  [AUTH_SERVICES_SCOPE],  // any matching scope in this list grants access
},
```

**Path syntax:** API Gateway substitutes path parameters in the `methodArn`
before it reaches us. A route declared as `/{transaction_id}/otp/send` in
`terraform/3-gateway.tf` becomes `/tx_abc/otp/send` at runtime. In the scope
map, write this as `/*/otp/send` — the `*` is matched as a single path
segment by the authorizer's regex.

### 3. Import the scope constant

Scope constants are exported from `@libs/config`:

```ts
import { AUTH_SERVICES_SCOPE } from "@libs/config";
```

Add the scope name to the import block at the top of the routes file. If your
route accepts multiple scopes (any one of them grants access), include all of
them in the `scopes` array.

### 4. Run typecheck and tests

```bash
pnpm run typecheck
pnpm test --run src/functions/general/authorizer/
```

The `RouteWithoutGateway` type catches typos in `stage`/`method`/`path`/`scopes`
at compile time. The scope constants catch typos in `scopes:`. The regex
compiler catches malformed patterns at cold start.

For local routes (on this service's gateway), `routes/authentication.drift.test.ts`
asserts that every authorizer-gated route in `terraform/3-gateway.tf` has a
matching entry — adding a Terraform route without updating this file (or vice
versa) fails CI.

### 5. Verify via shadow before relying on it

While shadow mode is active (phase 5), the **old regex path** still decides
every request. Divergence between old and new paths is logged via the
`scope lookup divergence` warn line, picked up by the Datadog monitor. Add
your route, deploy to staging, exercise it — the shadow log should fire once
under `scope_lookup_shadow` (info level) with `matchedPath: "local"` or
`"external"` and `newDecision: true`. No divergence means your route entry is
correct.

After Phase 6 cutover, the new path becomes the only path and shadow mode
goes away.

## Changing allowed scopes on an existing route

Find the entry in the per-service file under `routes/` and edit its `scopes`
array. No other changes needed — the compiled routes rebuild on next cold
start.

**Remember** the array is an OR: presenting any one of the listed scopes
grants access. If a user needs to have ALL of several scopes, that's an
application-logic concern and belongs in the handler, not here.

## Adding a new scope

1. Add it to `config/common.yaml` under `scopes:`.
2. Add an export in `src/libs/config.ts` next to the others:
   ```ts
   export const MY_NEW_SCOPE = scopes.MY_NEW_SCOPE;
   ```
3. Import it in the relevant routes file and use it.
4. If the scope needs to be obtainable via an auth flow (OTP, OTP-Passcode,
   Extra-Scope), also add it to the relevant flow array in
   `terraform/6-parameters.tf` under `locals { otp_scopes = [...], ... }`.

## Adding a new external gateway

If you're adding routes on a gateway we don't currently reference:

### 1. Wire up the Terraform data source

`terraform/9-external-scopes.tf` resolves gateways in tiers:

- **Tier 1** — env-prefixed name follows `${env}-${kebab(key)}`. Add a single
  line to the `env_prefixed_gateways` map:

  ```hcl
  locals {
    env_prefixed_gateways = {
      # ...existing entries...
      my_new_service = null  # → ${env}-my-new-service
    }
  }
  ```

- **Tier 2** — env-prefixed but the name doesn't derive cleanly (abbreviation,
  legacy naming). Override via the map value:

  ```hcl
  my_new_service = "my-svc"  # → ${env}-my-svc
  ```

- **Tier 3** — truly special (no env prefix, different protocol). Add an
  explicit `data` block (as `api_broker` and `device_channel` do) and merge
  it into `local.gateway_ids` at the bottom of the file.

### 2. Add the key to the zod enum

`scope-map/types.ts`:

```ts
export const externalGatewayKeySchema = z.enum([
  // ...existing keys...
  "my_new_service",
]);
```

This is the single source of truth — it derives `ExternalGatewayKey` and
validates `GATEWAY_IDS` at cold start.

### 3. Create the per-service routes file

```ts
// scope-map/routes/my-new-service.ts
import { MY_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/foo", scopes: [MY_SCOPE] },
];
```

### 4. Wire it into the barrel

`scope-map/routes/index.ts`:

```ts
import { routes as myNewService } from "./my-new-service";

export const routes: RouteEntry[] = [
  // ...existing entries...
  ...withGateway("my_new_service", myNewService),
];
```

### 5. Run `terraform fmt terraform/` and `pnpm run typecheck`.

### Naming conventions

- **Most gateways** follow the org convention `${env}-${service_name}` —
  enforced by the shared `module-rest-api-gateway` Terraform module.
- **Two known outliers** (verified against AWS on 2026-04-19):
  - `api_broker` → REST API named `apiBroker` (no env prefix, one gateway
    shared across envs).
  - `device_channel` → WebSocket API (API Gateway v2), needs
    `data "aws_apigatewayv2_apis"` with `protocol_type = "WEBSOCKET"`.

If you find a gateway that doesn't follow the convention, verify with
`aws apigateway get-rest-apis --query "items[?starts_with(name,'staging-')].name"`
and document the deviation in `9-external-scopes.tf`.

## Gateway ID resolution flow

```
terraform apply
   │
   ├── data "aws_api_gateway_rest_api" { name = "${env}-..." } (for_each)
   │
   ├── local.gateway_ids = merge(env_prefixed → id, { api_broker, device_channel })
   │
   └── Lambda env: GATEWAY_IDS = jsonencode(local.gateway_ids)
           │
           └── Lambda cold start
                   │
                   ├── scope-map/gateway-ids.ts parses + zod-validates GATEWAY_IDS
                   │
                   ├── scope-map/index.ts composes compiledRoutes[] using gatewayIds[route.gateway]
                   │
                   └── authorizer.route-lookup.ts compiles each arnPattern to a RegExp
```

Errors at any stage are loud:

- Missing or malformed `GATEWAY_IDS` → throws at module load → Lambda init failure → CloudWatch Lambda error alarm
- Unknown gateway name in Terraform data source → `terraform plan` fails with a clear "no rest api found" error

## Testing

Unit tests live in `authorizer.route-lookup.test.ts`. They stub `GATEWAY_IDS`
via `vi.stubEnv` before dynamic-importing the module, so `gatewayIds` parses
from a deterministic fake map.

```bash
pnpm test --run src/functions/general/authorizer/authorizer.route-lookup.test.ts
```

Drift between TypeScript and Terraform for the authentication gateway is
guarded by `scope-map/routes/authentication.drift.test.ts`, which regex-parses
`terraform/3-gateway.tf` and asserts the route sets line up.

End-to-end tests (`authorizer.test.ts`) invoke the deployed Lambda with real
tokens and assert on the auth policy response. These are the ones to watch
when verifying shadow-mode behaviour in staging.

## Shadow mode (temporary)

While Phase 5 is shipping, the authorizer runs both the old regex path and
the new TypeScript path on every request. The old path's decision is the one
returned to the gateway; the new path's decision is compared and logged.

Behaviour controlled by `ROUTE_SCOPE_LOOKUP_SHADOW` env var (Terraform sets
it to `"true"`). On every shadow check:

- A `logger.info("scope_lookup_shadow")` log fires with the full `shadow`
  context (matched path, matched route, old vs new decisions, scope hash)
  via `logger.addContext` — AsyncLocalStorage keeps it scoped to the
  invocation.
- If the two decisions disagree, `logger.warn("scope lookup divergence")`
  fires. The Datadog monitor counts these.

Phase 6 cutover deletes the old path, the shadow wiring, the
`ROUTE_SCOPE_LOOKUP_SHADOW` env var, and `authorizer.constants.ts`. At that
point `isResourceValidForScopes` collapses to `return lookupByRouteMetadata(...).decision`.

See `.ai/plans/in-progress/refactor-scope-to-resource-map-to-route-metadata.md`
for the migration plan.

## Follow-up direction

Long-term, scope enforcement moves out of this centralised authorizer
entirely — each service validates its own tokens and enforces its own scope
rules in its request middleware. Auth service shrinks to token issuance +
JWKS. See `.ai/plans/backlog/distribute-scope-authorization.md` for the
full proposal.

The per-service files under `routes/` are designed as the migration unit:
when a downstream service takes over its own enforcement, its file gets
lifted out of this repo into that service's codebase.
