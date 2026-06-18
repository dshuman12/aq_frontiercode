import { formatJSONResponse } from "@libs/gatewayUtils";
import { getParameter } from "@onmoapp/onmo-ssm";
import { EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION } from "./extra-scope-authorize.constants";
import { AUTH_FLOW_SCOPES_PARAM } from "@libs/constants";
import { AuthorizerEvent, checkRateLimit } from "@libs/shared";
import { getLogger } from "@libs/logger";
import { LMSResult } from "@onmoapp/core-banking";
import { BankingService } from "@services/banking/bankingService";

type ParsedRequestBody = { onmouuid: string };

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  const forcedCodePath = event.headers?.["x-force-hal"];
  try {
    const { onmouuid: authOnmouuid, scope: authScope } = event?.requestContext?.authorizer;
    logger.addContext({ authOnmouuid, authScope });
    const { onmouuid: requestOnmouuid } = JSON.parse(event?.body) as ParsedRequestBody;
    logger.addContext({ requestOnmouuid });

    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }

    const rateLimiter = await checkRateLimit(
      {
        onmouuid: authOnmouuid,
        domain: "auth_general",
        action: "eligibility",
      },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    if (requestOnmouuid !== authOnmouuid) {
      throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
    }

    const { Parameter } = await getParameter({ Name: AUTH_FLOW_SCOPES_PARAM });
    if (!Parameter?.Value) {
      throw new Error("Failed to fetch auth flow scopes parameter from SSM");
    }
    const { extra_scopes } = JSON.parse(Parameter.Value) as Record<string, string[]>;
    if (!extra_scopes || !extra_scopes.length) {
      throw new Error("Failed to retrieve extra scopes");
    }

    const bankingService = await BankingService.init(requestOnmouuid, logger, forcedCodePath);

    const eligibilityChecks = extra_scopes.map(async (scope) => {
      if (scope in EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION) {
        logger.info(`${scope} scope has eligibility criteria, checking...`);

        const isEligibleFunction = EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION[scope];
        const result: LMSResult<void> = await isEligibleFunction(bankingService);

        if (!result.ok) {
          logger.warn(`User is not eligible for ${scope} scope: ${result.error.message}`);
          return null;
        }

        logger.info(`User is eligible for ${scope} scope`);
        return scope;
      }
      return null;
    });
    const results = await Promise.all(eligibilityChecks);
    const eligible_extra_scopes_arr = results.filter((scope): scope is string => scope !== null);
    const eligible_extra_scopes = eligible_extra_scopes_arr.join(",");
    logger.info(`User is eligible for extra scopes: ${eligible_extra_scopes}`);

    return formatJSONResponse({ statusCode: 200, body: { eligible_extra_scopes } });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
