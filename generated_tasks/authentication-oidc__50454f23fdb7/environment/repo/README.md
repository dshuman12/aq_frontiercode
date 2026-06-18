# OIDC Authentication Service

The OIDC Authentication Service provides user-facing authentication through access tokens with scope-based permissions.

Access tokens contain comma-separated scopes that determine access to specific endpoints via a Lambda authorizer.

The OIDC Lambda Authorizer performs allow/deny decisions by validating the access token scopes against a scope to resource mapping, stored in an SSM parameter.

# Getting Started

## Package Installation

This project uses private packages from the GitHub package registry. To install these packages:

1. Create a personal access token in GitHub:

   - Go to your GitHub account settings → Developer settings → Personal access tokens
   - Generate a new token with the `read:packages` permission
   - Copy the token once it's generated (you won't be able to see it again)

2. Configure your environment:

   ```bash
   # Add this to your ~/.bashrc, ~/.zshrc, or equivalent shell profile
   export ONMO_REGISTRY_PACKAGES=your_personal_access_token
   ```

3. Install dependencies with pnpm:
   ```bash
   pnpm install
   ```

## Running Tests Locally

To run tests locally, you need to set up the environment variables:

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Set up AWS credentials via SSO:

   ```bash
   aws sso login --profile <your-profile>
   ```

   Alternatively, export temporary credentials manually from the [AWS SSO portal](https://onmoconsole.awsapps.com/start/#/?tab=accounts) into your `.env` file.

3. Set `ENVIRONMENT=staging` in your `.env` file. All other config (tables, params, scopes, etc.) is baked into the Lambda bundles from the shared YAML config files — see [Configuration](#configuration) below.

4. Run the tests:

   ```bash
   # Run all tests
   pnpm run test

   # Run specific test suites
   pnpm run test-suite --suite=src/test-e2e/other/eligibility.test.ts

   # Run end-to-end tests
   pnpm run test-e2e

   # Run target tests
   pnpm run test-targets
   ```

# Configuration

Config lives in `config/` as YAML files, consumed by both TypeScript (baked into Lambda bundles at build time) and Terraform (`yamldecode`).

```
config/
├── common.yaml    # Shared across all environments (scopes, tables, params, secrets, gateways, etc.)
├── staging.yaml   # Staging-specific values (URLs, gateway IDs, test scopes)
├── prod.yaml      # Production-specific values
└── app.yaml       # JS-only application constants (limits, status strings, auth flows, etc.)
```

## How it works

**TypeScript** — `src/libs/config.ts` imports the YAML files via build-time plugins ([esbuild-plugin-yaml](https://www.npmjs.com/package/esbuild-plugin-yaml) for Lambda builds, [@modyfi/vite-plugin-yaml](https://www.npmjs.com/package/@modyfi/vite-plugin-yaml) for Vitest) and derives environment-qualified names:

```typescript
import common from "../../config/common.yaml";
import app from "../../config/app.yaml";

// Tables, params, secrets get suffixed/prefixed with the environment
export const tables = deriveMap(common.tables, (v) => `${v}-${ENV}`);
export const params = deriveMap(common.params, (v) => `/onmo/auth/${ENV}/${v}`);

// App constants are destructured directly
export const { OTP_SEND_LIMIT, OTP_ATTEMPT_LIMIT } = app.limits;
```

**Terraform** — `0-variables.tf` reads the same YAML files and applies equivalent `for` expressions:

```hcl
locals {
  common_config = yamldecode(file("${path.root}/../config/common.yaml"))
  env_config    = yamldecode(file("${path.root}/../config/${var.ENVIRONMENT}.yaml"))

  derived_tables = { for k, v in local.common_config.tables : k => "${v}-${var.ENVIRONMENT}" }
}
```

## Adding config values

| Value type                                               | Where to add                               | Notes                                              |
| -------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Shared infra (tables, params, secrets, scopes, gateways) | `config/common.yaml`                       | Consumed by both TS and Terraform                  |
| Environment-specific (URLs, gateway IDs, alerting)       | `config/staging.yaml` + `config/prod.yaml` |                                                    |
| JS-only constants (limits, status strings, auth flows)   | `config/app.yaml`                          | Not used by Terraform                              |
| Computed/runtime values                                  | `src/libs/config.ts`                       | Only values that can't be expressed as static YAML |

After adding values to YAML, export them from `src/libs/config.ts` so Lambda handlers can import them via `@libs/config`.

# Infrastructure & CI/CD

## Terraform

All infrastructure is defined in the [`terraform/`](terraform/) directory. See the [Terraform README](terraform/README.md) for details on:

- File structure and what each `.tf` file manages
- Derived locals pattern for environment-qualified resource names
- API versioning and minor version management
- Running terraform locally

## CI/CD Workflows

| Workflow              | Trigger                       | Purpose                                                               |
| --------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `pr.yaml`             | Pull request to main          | Parallel checks: commit-lint, typecheck, prettier, terraform validate |
| `pr.deploy.yaml`      | `preview` / `refresh` label   | Deploy a PR preview environment to staging                            |
| `pr.test.yaml`        | `test` label                  | Run unit + e2e tests against a PR preview                             |
| `pr.cleanup.yaml`     | PR closed / `preview` removed | Tear down PR preview environment                                      |
| `staging.deploy.yaml` | Manual dispatch               | Plan/apply to staging, run tests                                      |
| `prod.deploy.yaml`    | Manual dispatch               | Semantic version, plan/apply to prod, create release                  |
| `terraform.yaml`      | Called by the above           | Shared reusable workflow for all terraform operations                 |

The shared `terraform.yaml` workflow handles bundling Lambda handlers, terraform fmt/validate/init/plan/apply. It uses `-detailed-exitcode` on plan so apply only runs when there are actual infrastructure changes.

Non-secret variables are read from the shared YAML config files. Only secrets (`DATADOG_API_KEY`, `AWS_ACCOUNT_ID`, `WEB_ACL_ARN`, `PINPOINT_PROJECT_ID`) and dynamic values (`GITHUB_REPO`, `RELEASE_VERSION`, `ENVIRONMENT`) are passed as workflow env vars.

### PR Preview Environments

PR previews let you deploy and test a branch in an isolated API Gateway stage on staging before merging.

**Lifecycle — all label-driven:**

| Action    | How                                    | What happens                                                                             |
| --------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Deploy    | Add `preview` label                    | Deploys to `https://auth.staging.onmo.app/oidc/pr-{N}/` and posts a comment with the URL |
| Redeploy  | Add `refresh` label                    | Re-deploys the preview (label auto-removed after)                                        |
| Test      | Add `test` label                       | Runs unit + e2e tests against the preview (label auto-removed after)                     |
| Tear down | Remove `preview` label or close the PR | Destroys the preview environment                                                         |

**How it works:**

- Each PR preview creates a dedicated API Gateway stage (`authentication-pr-{N}`) with Lambda aliases for all API functions
- Previews are **Tier 1 (API-only)** — event handlers, SQS consumers, and scheduled functions use shared staging code
- Multiple PR previews can coexist (up to the API Gateway stage quota of 15)
- All PR workflows share the `staging-terraform` concurrency group (except `pr.test.yaml`, which is read-only)
- E2E tests target the preview by setting `E2E_API_VERSION=pr-{N}`, which redirects all test URLs to the PR's stage
- Each PR preview stores its minor version in an HTML comment on the deploy comment, enabling idempotent redeployments

### Branch Protection

Merging to `main` requires two status checks to pass:

- **`pr-checks`** — aggregates commit-lint, typecheck, prettier, and terraform validate (runs automatically on PR)
- **`staging-complete`** — requires a successful staging deploy with both unit tests and e2e tests passing (run manually via `staging.deploy.yaml`)

Strict mode is enabled, so the branch must be up to date with `main` before merging. The staging deploy is manual and async — it just needs to have completed successfully before the merge is allowed.

# Scopes & SSM Parameters

## Scope Types

- **OTP Scopes**: Basic web-domain scopes obtainable via SMS OTP verification
- **OTP-Passcode Scopes**: Basic app-domain scopes requiring SMS OTP verification & passcode verification
- **Shared Scopes**: Scopes that exist in both OTP and OTP-Passcode scope lists
- **Extra Scopes**: Restricted scopes requiring additional verification (SMS OTP/Passcode/Biometrics)

## Scope-to-route rules — where they live

Scope authorization rules for every route this service's Lambda authorizer
gates — both routes on our own gateway and routes on other services' gateways —
live as typed TypeScript in [`src/functions/general/authorizer/`](src/functions/general/authorizer/README.md).

**To add a new route, change its required scopes, or add an external gateway,
read the authorizer [README](src/functions/general/authorizer/README.md).**

Gateway IDs are resolved at Terraform apply time via `data "aws_api_gateway_rest_api"`
lookups in `terraform/9-external-scopes.tf` and injected as a single
`GATEWAY_IDS` env var on the authorizer Lambda. No hardcoded IDs, no YAML
per-env fiddling.

> **Historical note.** Before the scope-map refactor (PR #334), these rules
> shipped as a JSON object on S3 (`SCOPE_TO_RESOURCE_MAP_URL_PARAM`) with
> gateway IDs hardcoded in `config/*.yaml`. The S3 object, its SSM URL
> parameter, and the per-env gateway YAML entries are all being removed as
> part of the Phase 6 cutover. See
> `.ai/plans/in-progress/refactor-scope-to-resource-map-to-route-metadata.md`.

## Parameters

1. `AUTH_FLOW_SCOPES_PARAM`: Maps auth flows to their available scopes

   - Defines which scopes are available for OTP, OTP-Passcode, and Extra-Scope flows

2. `NON_CONFLICTING_SCOPES_PARAM`: Used during initiation of auth flows that will generate a new token on completion

   - Checks if requested scopes conflict with existing token scopes
   - Prevents incompatible scope combinations

3. `EXCLUSIVE_SCOPES_PARAM`: Used during token generation

   - Lists scopes that must exist on only one token per user
   - When generating a token with exclusive scopes, other tokens with those scopes are deleted

4. `TOKEN_LIFETIMES_PARAM`: Defines token expiration times
   - Default lifetimes for access/refresh tokens
   - Special lifetimes for specific scopes (e.g., sensitive operations)

# Auth Flows

The end to end tests in `./src/test-e2e` are a great place to look to understand each of the auth flows.

## Web Login Flow (OTP)

```
User → SMS Verification → Access Token
```

## Mobile App Login Flow (OTP-Passcode)

```
(First Time Login)
User → SMS OTP Verification → Passcode Verification → Access Token
```

```
(Re-Login)
User → Passcode Verification → Access Token
```

```
(Biometric Login)
User → Biometric Verification → Access Token
```

## Extra Scope Authorization Flow

Some endpoints have a higher level of restriction and require scopes that can only be obtained via the extra-scope auth flow.

The verification requirements are based on:

- Requested extra-scope
- User's biometric registration status

Possible verification combinations:

```
User → SMS OTP Verification → Passcode Verification → Access Token with extra scope

User → Passcode Verification → Access Token with extra scope

User → Biometric Verification → Access Token with extra scope
```

## Biometrics Registration Flow

To register a user's biometrics for a device.

```
User → Register Device & Enable Biometrics
```

## Forgotten Passcode Flow

When a user has forgotten their passcode.

```
User → SMS OTP Verification → Email OTP Verification → Access Token with passcode-change scope → Change Passcode
```

# Other API Endpoints

## Eligibility Check

Returns available extra-scope scopes based on user eligibility criteria.

```
Endpoint: /eligibility
Required Scope: auth-services
```

## Logout

Invalidates all user tokens for the current domain (web/app).

```
Endpoint: /logout
Required Scope: auth-services
```

## Change Passcode

Updates user's passcode.

```
Endpoint: /change-passcode
Required Scope: passcode-change
```

## User Information

Returns user credentials based on provided onmouuid & relevant token scopes.

```
Endpoint: /user-info
Required Scopes -> one/many of:

- loan-account-id
- credit-card-account-id
- credit-card-id
```
