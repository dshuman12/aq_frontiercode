import { z } from "zod";

/**
 * Gateways whose IDs are injected by Terraform via the `GATEWAY_IDS` env
 * var. Extending this union means also extending `local.gateway_ids` in
 * `terraform/9-external-scopes.tf`.
 *
 * The authentication gateway is excluded: its ID would create a Terraform
 * dependency cycle (authorizer env vars → gateway_ids →
 * rest_api_gateway → authorizer). It's resolved at request time from
 * `event.methodArn` by using a `*` in the ARN pattern — see
 * `compileRoute` in `./index.ts`.
 *
 * Declared as a Zod enum so the same source of truth drives both the
 * static type (`ExternalGatewayKey`) and the runtime shape validation
 * of `GATEWAY_IDS` at cold start (see `./gateway-ids.ts`).
 */
export const externalGatewayKeySchema = z.enum([
  "apr",
  "customer_care",
  "api_broker",
  "card_service_oidc",
  "account_service_oidc",
  "customer_service_oidc",
  "repayment_service",
  "alert_service_oidc",
  "transaction_service_oidc",
  "device_channel",
  "biometrics_service",
]);

export type ExternalGatewayKey = z.infer<typeof externalGatewayKeySchema>;

/** Gateway tag on a route entry. `"authentication"` is this service's own gateway. */
export type GatewayKey = "authentication" | ExternalGatewayKey;

/**
 * A single scope-gated route.
 *
 * `method` and `path` follow the execute-api methodArn shape after
 * Lambda resolves path parameters — so `/*` / `/{id}` in API Gateway
 * path-template syntax is expressed here as a single-segment wildcard
 * `*`. At lookup time the resolved ARN is matched by regex.
 *
 * `stage` is the gateway stage slot of the ARN. Most routes use `"*"`
 * (stage-agnostic match); api-broker and apr use `ENV` (literal
 * `"staging"` / `"prod"`).
 *
 * `scopes` is a list — a user presenting any one of the listed scopes
 * is granted access to this route.
 */
export type RouteEntry = {
  gateway: GatewayKey;
  stage: string;
  method: string;
  path: string;
  scopes: string[];
};

/**
 * A route with its ARN pattern pre-composed from `RouteEntry` + the
 * runtime `gatewayIds` map + region / account / stage resolution.
 * Produced at cold start; the regex is compiled lazily on first lookup.
 */
export type CompiledRoute = {
  arnPattern: string;
  scopes: string[];
  source: "local" | "external";
};
