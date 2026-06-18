# External-gateway identity lookups.
#
# The authorizer needs to match methodArns against scope→route rules. Those
# rules live as TypeScript code in `src/functions/general/authorizer/scope-map/`.
# Terraform's only job for that map is resolving gateway names → IDs at apply
# time and injecting them into the authorizer Lambda as a single env var.
#
# This keeps the auth policy as code (reviewable, type-checked, testable)
# and gateway identity as infra (resolved from AWS at apply time, no YAML
# hardcoded IDs). When the follow-up architecture (see
# `.ai/plans/backlog/distribute-scope-authorization.md`) lifts external
# scope rules out of this service, the matching TS route entries get
# deleted and the corresponding data source here goes with them.

# ── External gateway lookups ─────────────────────────────────────────────
# Tier 1: env-prefixed gateways following `${env}-${kebab(key)}`.
#         Adding a new one = one line in the map below.
# Tier 2: env-prefixed but name doesn't derive cleanly from the key
#         (abbreviations, legacy naming). Override via the map value.
# Tier 3: truly special (no env prefix, different protocol) — explicit
#         data sources below. Outliers verified via AWS API Gateway list
#         on 2026-04-19:
#           - api_broker: one REST API named `apiBroker` shared across envs
#             (no env prefix); consistent with the env-agnostic hardcoded
#             ID in `config/common.yaml`.
#           - device_channel: a WebSocket API (protocol WEBSOCKET) — REST
#             data source doesn't return it; use the v2 plural data source.
locals {
  env_prefixed_gateways = {
    apr                      = null # ${env}-apr
    customer_care            = null # ${env}-customer-care
    card_service_oidc        = null
    account_service_oidc     = null
    customer_service_oidc    = null
    repayment_service        = null
    alert_service_oidc       = null
    biometrics_service       = null
    transaction_service_oidc = "txn-service-oidc" # abbreviated
  }
}

data "aws_api_gateway_rest_api" "env_prefixed" {
  for_each = local.env_prefixed_gateways
  name     = "${var.ENVIRONMENT}-${each.value != null ? each.value : replace(each.key, "_", "-")}"
}

data "aws_api_gateway_rest_api" "api_broker" { name = "apiBroker" }

# `aws_apigatewayv2_apis.ids` is an unordered set. `protocol_type` narrows
# the query to WebSocket (the device-channel API) so an accidentally-named
# REST gateway can't match, and `one()` in the consumer below errors if
# the filter still returns a non-singleton set.
data "aws_apigatewayv2_apis" "device_channel" {
  name          = "${var.ENVIRONMENT}-device-channel"
  protocol_type = "WEBSOCKET"
}

# Keys are the `ExternalGatewayKey` type in `scope-map/types.ts`. The
# authorizer reads `process.env.GATEWAY_IDS` and looks up by key at cold
# start.
#
# `authentication` (this service's own gateway) is deliberately absent.
# Including it would create a dependency cycle: authorizer env vars →
# gateway_ids → rest_api_gateway → (lambda_authorizers input) → authorizer.
# The authorizer learns its own gateway id at request time from
# `event.methodArn` instead; local-route ARN patterns use a `*` wildcard
# in the gateway-id slot (see `scope-map/index.ts:compileRoute`).
locals {
  gateway_ids = merge(
    { for k, v in data.aws_api_gateway_rest_api.env_prefixed : k => v.id },
    {
      api_broker     = data.aws_api_gateway_rest_api.api_broker.id
      device_channel = one(data.aws_apigatewayv2_apis.device_channel.ids)
    }
  )
}
