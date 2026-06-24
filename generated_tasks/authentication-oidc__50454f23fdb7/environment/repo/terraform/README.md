# Terraform

Infrastructure-as-code for the OIDC Authentication Service. Manages Lambda functions, API Gateway, DynamoDB permissions, SSM parameters, and monitoring.

## File Structure

| File               | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `0-variables.tf`   | Variable declarations, shared locals, derived locals, env var groups |
| `1-providers.tf`   | AWS and Datadog provider config with default tags                    |
| `2-functions.tf`   | Lambda function modules and IAM permissions                          |
| `3-gateway.tf`     | API Gateway configuration and routes                                 |
| `4-versions.tf`    | API versioning (v1-v7 with minor versions)                           |
| `5-permissions.tf` | Shared IAM policies                                                  |
| `6-parameters.tf`  | SSM parameters (scopes, resource maps, token lifetimes)              |
| `7-monitoring.tf`  | Datadog monitoring module                                            |
| `8-resources.tf`   | S3 resources (scope-to-resource map)                                 |
| `outputs.tf`       | Terraform outputs (Lambda env vars for CI test jobs)                 |
| `Z-checks.tf`      | Terraform precondition checks                                        |

## Configuration

All non-secret configuration lives in shared YAML files under `config/`, consumed by both Terraform and TypeScript:

```
config/
├── common.yaml    # Shared across all environments (scopes, tables, params, secrets, gateways)
├── staging.yaml   # Staging-specific values (URLs, gateway IDs, test scopes, alerting)
└── prod.yaml      # Production-specific values
```

Terraform reads these via `yamldecode()` in `0-variables.tf`:

```hcl
locals {
  common_config = yamldecode(file("${path.root}/../config/common.yaml"))
  env_config    = yamldecode(file("${path.root}/../config/${var.ENVIRONMENT}.yaml"))
}
```

### Variables

Only secrets and dynamic values remain as Terraform variables (passed via `TF_VAR_*` env vars in CI):

| Variable              | Source              |
| --------------------- | ------------------- |
| `ENVIRONMENT`         | Workflow input      |
| `AWS_ACCOUNT_ID`      | GitHub secret       |
| `DATADOG_API_KEY`     | GitHub secret       |
| `DATADOG_APP_KEY`     | GitHub secret       |
| `WEB_ACL_ARN`         | GitHub secret       |
| `PINPOINT_PROJECT_ID` | GitHub secret       |
| `GITHUB_REPO`         | `github.repository` |
| `RELEASE_VERSION`     | Workflow input      |

### Adding config values

1. Add the value to the appropriate YAML file (`config/common.yaml` for shared, `config/<env>.yaml` for env-specific)
2. Reference it in Terraform via `local.common_config.<section>.<key>` or `local.env_config.<section>.<key>`
3. If the value needs to be a Lambda env var, add it to the relevant env var group in `0-variables.tf`

## Derived Locals

Many resource names follow a `<base>-<environment>` pattern. Base names are stored in `config/common.yaml` and derived in `0-variables.tf` using `for` expressions:

```hcl
# config/common.yaml
# tables:
#   AUTH_TRANSACTIONS_TABLE: "auth-transactions"

# 0-variables.tf
derived_tables = { for k, v in local.common_config.tables : k => "${v}-${var.ENVIRONMENT}" }
# Result: { AUTH_TRANSACTIONS_TABLE = "auth-transactions-staging" }
```

This applies to:

- **DynamoDB tables** (13) — `"${v}-${var.ENVIRONMENT}"`
- **SSM parameter paths** (8) — `"/onmo/auth/${var.ENVIRONMENT}/${v}"`
- **Secret names** (4) — `"${v}-${var.ENVIRONMENT}"`

Lambda functions and SSM resources reference `local.X` (derived) instead of `var.X` for these values.

## Lambda Env Var Groups

Lambda environment variables are organised into composable groups in `0-variables.tf`. Each Lambda function merges the groups it needs:

```hcl
# 2-functions.tf
environment_variables = merge(
  local.shared_environment,  # scopes, posthog, core vars (all functions)
  local.env_tables,          # DynamoDB table names
  local.env_sfmc,            # SFMC notification config
)
```

| Group                | Contents                                                    |
| -------------------- | ----------------------------------------------------------- |
| `shared_environment` | Auth scopes, PostHog, core vars (ENVIRONMENT, REGION, etc.) |
| `env_tables`         | 13 derived DynamoDB table names                             |
| `env_gateways`       | 12 gateway IDs + auth URLs                                  |
| `env_params`         | 10 SSM parameter paths                                      |
| `env_sfmc`           | SFMC notification config + Pinpoint                         |
| `env_card`           | Card service secret + base URL                              |
| `env_misc`           | QA bypass IDs, frontend URL                                 |

### Adding a new Lambda env var

1. Add the value to the relevant YAML config file
2. Add it to the appropriate group map in `0-variables.tf`
3. If needed, add the group to the Lambda function's `merge()` in `2-functions.tf`
4. If needed, add the group to the Lambda function's `merge()` in `2-functions.tf`

## API Versioning

API versions are defined in `4-versions.tf`. Each version creates Lambda aliases and API Gateway stage mappings.

- **v1-v4** — Legacy versions with a subset of Lambda functions
- **v5-v7** — Current versions using the `module-version-api` module with minor version support

Minor versions (e.g. `v7.10`, `v7.11`) enable zero-downtime deployments. The version-api module creates a Lambda alias per minor version, allowing traffic to shift gradually.

To add a new minor version, append to the `minor_versions` list:

```hcl
module "v7" {
  minor_versions = [10, 11, 12, 13, 14]  # add new minor version here
}
```

Old minor versions should be pruned periodically to stay within the API Gateway stage quota (default 10 stages per environment).

## Running Locally

```bash
cd terraform

# Validate syntax (no credentials needed)
terraform init -backend=false && terraform validate

# Plan against an environment (requires AWS credentials and Terraform Cloud token)
terraform init -upgrade \
  -backend-config="bucket=onmo-terraform-state-staging" \
  -backend-config="key=authentication/state-file-staging.tfstate" \
  -backend-config="dynamodb_table=onmo-terraform-state-staging" \
  -backend-config="region=eu-west-1" \
  -backend-config="encrypt=true"

terraform plan -var="ENVIRONMENT=staging"
```
