import { OTP_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION } from "@functions/otp/authorize/authorize.constants";
import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { AUTH_TRANSACTIONS_TABLE, FIFTEEN_MINUTES, OTP_AUTH_FLOW } from "@libs/constants";
import { putItemMethod } from "@onmoapp/onmo-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getLogger } from "@libs/logger";
import { AuthorizerEvent } from "@libs/shared";
import { BankingService } from "@services/banking/bankingService";

type ParsedRequestBody = { onmouuid?: string; code_challenge?: string; scope?: string };

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  const forcedCodePath = event.headers?.["x-force-hal"];
  try {
    logger.info(`Received event body: ${event.body}`);

    const { onmouuid, code_challenge, scope }: ParsedRequestBody = JSON.parse(event.body);
    if (!onmouuid || !code_challenge || !scope) {
      throw new Error("Missing necessary request attributes");
    }
    logger.addContext({ onmouuid });

    const scopes = scope.split(",");
    const { OTP_AUTH_SCOPE_TO_RESOURCE_MAP } = await getSpecificScopeToResourceMaps();
    for (const scopeItem of scopes) {
      const trimmedScope = scopeItem.trim();
      if (!(trimmedScope in OTP_AUTH_SCOPE_TO_RESOURCE_MAP)) {
        throw new Error(`Scope ${trimmedScope} not currently supported`);
      }

      if (trimmedScope in OTP_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION) {
        const isEligibleFunction = OTP_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION[trimmedScope];
        await isEligibleFunction(onmouuid);
      }
    }
    logger.info(`All requested scopes are valid and user is eligible. Scopes are: ${scope}`);

    // Check user exists by calling user summary

    const service = await BankingService.init(onmouuid, logger, forcedCodePath);

    const customerSummary = await service.customerSummary();
    if (!customerSummary.ok) {
      logger.error(`Retrieve Customer Summary failed`);
      logger.error(customerSummary.error);
      return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
    }

    logger.info("User found");

    const transaction_id = uuidv4();
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    try {
      console.log(scope);
      await putItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Item: { transaction_id, onmouuid, scope, code_challenge, ttl, auth_flow: OTP_AUTH_FLOW },
      });
    } catch (error: any) {
      throw new Error(`Error creating transaction: ${error?.message || error}`);
    }
    logger.info(
      `Transaction created with ttl ${ttl}, returning 200 and the transaction_id ${transaction_id}`,
    );

    return formatJSONResponse({
      statusCode: 200,
      body: { transaction_id, next_endpoint: `${transaction_id}/otp/send` },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
