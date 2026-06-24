import { createApiHandler, APIGatewayProxyEvent, apiResponse } from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { getParameter } from "@onmoapp/onmo-ssm";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION } from "./extra-scope-authorize.constants";
import { getItemMethod } from "@onmoapp/onmo-dynamodb";
import { BankingService } from "@services/banking/bankingService";
import { USER_TABLE, AUTH_FLOW_SCOPES_PARAM } from "@libs/config";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  onmouuid: z.string(),
});

const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string(), scope: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const eligibility = async (event: APIGatewayProxyEvent) => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);

  const { onmouuid: authOnmouuid, scope: authScope } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);
  logger.addContext("authScope", authScope);

  const { onmouuid: requestOnmouuid } = parsedEvent.data.body;
  logger.addContext("requestOnmouuid", requestOnmouuid);

  if (requestOnmouuid !== authOnmouuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
  }

  try {
    const rateLimiter = new RateLimiter();
    const { rate_limited, limited_actions, super_rate_limited } = await rateLimiter.checkLimits({
      onmouuid: authOnmouuid,
      to_check: [
        { domain: "auth_general" },
        { domain: "auth_login" },
        { domain: "auth_extra_scope" },
        { domain: "auth_forgotten_passcode" },
        { domain: "auth_biometrics_registration" },
      ],
    });
    if (rate_limited || super_rate_limited) {
      const expiry_time = super_rate_limited
        ? "no_expiry"
        : Math.max(...limited_actions.map((action) => action.rate_limit_expiry ?? 0));
      return apiResponse(429, { expiry_time });
    }
    await rateLimiter.recordAction({
      onmouuid: authOnmouuid,
      domain: "auth_general",
      action: "eligibility",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const { Parameter } = await getParameter({ Name: AUTH_FLOW_SCOPES_PARAM });
  if (!Parameter?.Value) {
    throw new Error("Failed to fetch auth flow scopes parameter from SSM");
  }
  const { extra_scopes } = JSON.parse(Parameter.Value) as Record<string, string[]>;
  if (!extra_scopes || !extra_scopes.length) {
    throw new Error("Failed to retrieve extra scopes");
  }

  const getUserRecordRes = await getItemMethod({
    TableName: USER_TABLE,
    Key: { onmouuid: requestOnmouuid },
  });
  if (!getUserRecordRes.Item) {
    throw new Error("Missing Item on get user record response");
  }

  const bankingService = await BankingService.init(requestOnmouuid, forceHal);
  const accountSummary = await bankingService.creditAccountSummary();
  if (accountSummary.ok) {
    logger.addContext("accountId", accountSummary.data.id);
  }

  const eligibilityResults = await Promise.all(
    extra_scopes
      .filter((scope) => scope in EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION)
      .map(async (scope) => ({
        scope,
        result: await EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION[scope](bankingService),
      })),
  );

  const eligible: string[] = [];
  const errors: { scope: string; error: { type: string; message: string } }[] = [];

  for (const { scope, result } of eligibilityResults) {
    if (!result.ok) {
      errors.push({ scope, error: result.error });
    } else if (result.data) {
      eligible.push(scope);
    }
  }

  const eligible_extra_scopes = eligible.join(",");

  logger.addContext("eligible", eligible_extra_scopes || "none");
  if (errors.length) logger.addContext("errors", errors);
  logger.info("Eligibility check complete");

  return apiResponse(200, { eligible_extra_scopes });
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(eligibility);
