import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

// GATEWAY_IDS must be set before importing the scope-map module — gatewayIds
// is resolved at module load. Use a stable set of fake ids so ARN patterns
// are deterministic across tests.
const fakeGatewayIds = {
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
};

vi.stubEnv("GATEWAY_IDS", JSON.stringify(fakeGatewayIds));
vi.stubEnv("ENVIRONMENT", "staging");
vi.stubEnv("AWS_ACCOUNT_ID", "123456789012");

const { arnPatternToRegex, lookupByRouteMetadata } = await import(
  "@functions/general/authorizer/authorizer.route-lookup"
);
const { AUTH_SERVICES_SCOPE, APR_SCOPE, CREDIT_CARD_FREEZE_SCOPE, LOAN_ACCOUNT_ID_SCOPE } =
  await import("@libs/config");

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("arnPatternToRegex", () => {
  test("matches a literal ARN", () => {
    const regex = arnPatternToRegex("arn:aws:execute-api:eu-west-1:123:gw/staging/POST/logout");
    expect(regex.test("arn:aws:execute-api:eu-west-1:123:gw/staging/POST/logout")).toBe(true);
  });

  test("substitutes * as a single-segment wildcard", () => {
    const regex = arnPatternToRegex("arn:aws:execute-api:eu-west-1:123:gw/*/GET/credit/*");
    expect(regex.test("arn:aws:execute-api:eu-west-1:123:gw/staging/GET/credit/abc")).toBe(true);
    expect(regex.test("arn:aws:execute-api:eu-west-1:123:gw/staging/GET/credit/a/b")).toBe(false);
  });

  test("escapes regex metacharacters in path", () => {
    const regex = arnPatternToRegex("arn:aws:execute-api:eu-west-1:123:gw/staging/GET/a.b");
    expect(regex.test("arn:aws:execute-api:eu-west-1:123:gw/staging/GET/a.b")).toBe(true);
    expect(regex.test("arn:aws:execute-api:eu-west-1:123:gw/staging/GET/aXb")).toBe(false);
  });
});

describe("lookupByRouteMetadata — local routes", () => {
  test("POST /logout with AUTH_SERVICES_SCOPE allows", () => {
    const result = lookupByRouteMetadata({
      methodArn: "arn:aws:execute-api:eu-west-1:123456789012:authgw/staging/POST/logout",
      scopesString: AUTH_SERVICES_SCOPE,
    });
    expect(result.decision).toBe(true);
    expect(result.matchedPath).toBe("local");
    expect(result.matchedScope).toBe(AUTH_SERVICES_SCOPE);
  });

  test("POST /logout without the right scope denies", () => {
    const result = lookupByRouteMetadata({
      methodArn: "arn:aws:execute-api:eu-west-1:123456789012:authgw/staging/POST/logout",
      scopesString: APR_SCOPE,
    });
    expect(result.decision).toBe(false);
    expect(result.matchedPath).toBe("none");
  });

  test("path parameter substitution: /{transaction_id}/extra-scope/otp/send", () => {
    const result = lookupByRouteMetadata({
      methodArn:
        "arn:aws:execute-api:eu-west-1:123456789012:authgw/staging/POST/tx_abc-123/extra-scope/otp/send",
      scopesString: AUTH_SERVICES_SCOPE,
    });
    expect(result.decision).toBe(true);
    expect(result.matchedPath).toBe("local");
  });

  test("GET /user-info accepts any of three mapped scopes", () => {
    const result = lookupByRouteMetadata({
      methodArn: "arn:aws:execute-api:eu-west-1:123456789012:authgw/staging/GET/user-info",
      scopesString: LOAN_ACCOUNT_ID_SCOPE,
    });
    expect(result.decision).toBe(true);
    expect(result.matchedScope).toBe(LOAN_ACCOUNT_ID_SCOPE);
  });
});

describe("lookupByRouteMetadata — external routes", () => {
  test("POST /*/freeze on card-service-oidc with CREDIT_CARD_FREEZE_SCOPE allows", () => {
    const result = lookupByRouteMetadata({
      methodArn: "arn:aws:execute-api:eu-west-1:123456789012:cardgw/prod/POST/card_789/freeze",
      scopesString: CREDIT_CARD_FREEZE_SCOPE,
    });
    expect(result.decision).toBe(true);
    expect(result.matchedPath).toBe("external");
    expect(result.matchedScope).toBe(CREDIT_CARD_FREEZE_SCOPE);
  });

  test("api-broker stage=staging resolves from {env} marker", () => {
    const result = lookupByRouteMetadata({
      methodArn:
        "arn:aws:execute-api:eu-west-1:123456789012:apibroker/staging/GET/account/statement",
      scopesString: "credit-card-account",
    });
    expect(result.decision).toBe(true);
    expect(result.matchedPath).toBe("external");
  });

  test("unknown methodArn → no match", () => {
    const result = lookupByRouteMetadata({
      methodArn: "arn:aws:execute-api:eu-west-1:123456789012:unknowngw/*/GET/nonexistent",
      scopesString: AUTH_SERVICES_SCOPE,
    });
    expect(result.decision).toBe(false);
    expect(result.matchedPath).toBe("none");
  });

  test("device-channel WebSocket $connect matches", () => {
    const result = lookupByRouteMetadata({
      methodArn: "arn:aws:execute-api:eu-west-1:123456789012:devgw/staging/$connect",
      scopesString: "credit-card-account",
    });
    expect(result.decision).toBe(true);
    expect(result.matchedPath).toBe("external");
  });
});
