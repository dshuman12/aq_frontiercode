import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, test } from "vitest";

// Stub env for the scope-map module load.
process.env.GATEWAY_IDS ??= JSON.stringify({
  authentication: "authgw",
  apr: "aprgw",
  customer_care: "ccgw",
  api_broker: "apibroker",
  card_service_oidc: "cardgw",
  account_service_oidc: "accgw",
  customer_service_oidc: "custgw",
  repayment_service: "repaygw",
  alert_service_oidc: "alertgw",
  transaction_service_oidc: "txngw",
  device_channel: "devgw",
  biometrics_service: "biogw",
});

const { routes: authenticationRoutes } = await import("./authentication");

const GATEWAY_TF_PATH = resolve(process.cwd(), "terraform/3-gateway.tf");

type RouteKey = `${string} ${string}`;

// Every block in `aws_integration_paths` has exactly one `path_from_root`,
// so splitting the file on that key gives one chunk per route block.
const parseAuthorizerGatedRoutes = (tfSource: string): Set<RouteKey> => {
  const chunks = tfSource.split(/path_from_root\s*=\s*"/).slice(1);
  const routes = new Set<RouteKey>();
  for (const chunk of chunks) {
    const pathEnd = chunk.indexOf('"');
    if (pathEnd < 0) continue;
    const path = chunk.slice(0, pathEnd);
    const rest = chunk.slice(pathEnd + 1);
    if (!/lambda_authorizer_name\s*=\s*local\.authorizer_lambda_name/.test(rest)) continue;
    const methodMatch = /method\s*=\s*"([A-Z$]+)"/.exec(rest);
    if (!methodMatch) continue;
    const normalisedPath = path.replace(/\{[^}]+\}/g, "*");
    routes.add(`${methodMatch[1]} ${normalisedPath}`);
  }
  return routes;
};

const asKey = (method: string, path: string): RouteKey => `${method} ${path}`;

describe("authentication routes drift check vs terraform/3-gateway.tf", () => {
  test("every authorizer-gated gateway route has a matching authentication routes entry", () => {
    const tfSource = readFileSync(GATEWAY_TF_PATH, "utf8");
    const tfRoutes = parseAuthorizerGatedRoutes(tfSource);
    // Floor: catches a parser regression that returns an empty set if the TF
    // formatting drifts from what the regex above expects.
    expect(tfRoutes.size).toBeGreaterThan(20);
    const tsRoutes = new Set(authenticationRoutes.map((r) => asKey(r.method, r.path)));

    const missingInTs = [...tfRoutes].filter((r) => !tsRoutes.has(r)).sort();
    const extraInTs = [...tsRoutes].filter((r) => !tfRoutes.has(r)).sort();

    expect({ missingInTs, extraInTs }).toEqual({ missingInTs: [], extraInTs: [] });
  });
});
