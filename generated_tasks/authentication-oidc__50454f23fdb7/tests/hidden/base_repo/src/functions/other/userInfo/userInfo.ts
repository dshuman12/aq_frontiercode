import { getForceHalHeader } from "@libs/gatewayUtils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import {
  CREDIT_CARD_ACCOUNT_ID_SCOPE,
  CREDIT_CARD_ID_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
  USER_TABLE,
} from "@libs/config";
import { BankingService } from "@services/banking/bankingService";
import { z } from "zod";

const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({
      onmouuid: z.string(),
      scope: z.string(),
    }),
  }),
  queryStringParameters: z.object({ onmouuid: z.string() }),
});

type HandlerRespBody = {
  loanAccountId?: string;
  credit_card_account_id?: string;
  credit_card_id?: string;
};

const userInfo = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { onmouuid: authOnmouuid, scope } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);
  logger.addContext("scope", scope);

  const { onmouuid: queryOnmouuid } = parsedEvent.data.queryStringParameters;
  logger.addContext("queryOnmouuid", queryOnmouuid);

  if (queryOnmouuid !== authOnmouuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match query onmouuid");
  }

  const bankingService = await BankingService.init(authOnmouuid, forceHal);

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": queryOnmouuid },
  });
  if (!queryUserTableRes?.Items?.length) {
    throw new Error(`No record in ${USER_TABLE} found`);
  }

  const scopes = scope.split(",");
  const hasValidScope =
    scopes.includes(LOAN_ACCOUNT_ID_SCOPE) ||
    scopes.includes(CREDIT_CARD_ACCOUNT_ID_SCOPE) ||
    scopes.includes(CREDIT_CARD_ID_SCOPE);

  if (!hasValidScope) {
    logger.warn("No valid scopes for user-info");
    return apiResponse(401, { message: "Unauthorized" });
  }

  const responseBody: HandlerRespBody = {};

  const { mambuCreditCardAccountID: accountId } = queryUserTableRes.Items[0];
  if (!accountId) {
    throw new Error(`Missing mambuCreditCardAccountID on user record in ${USER_TABLE}`);
  }
  logger.addContext("accountId", accountId);

  // TODO: deprecate when not in use & replaced with credit-card-account-id
  if (scopes.includes(LOAN_ACCOUNT_ID_SCOPE)) {
    if (!accountId) {
      throw new Error(`Missing mambuCreditCardAccountID on user record in ${USER_TABLE}`);
    }

    // add loan account id to res
    responseBody.loanAccountId = accountId;
  }

  if (scopes.includes(CREDIT_CARD_ACCOUNT_ID_SCOPE) || scopes.includes(CREDIT_CARD_ID_SCOPE)) {
    if (!accountId) {
      throw new Error(`Missing credit account id on user record in ${USER_TABLE}`);
    }

    if (scopes.includes(CREDIT_CARD_ACCOUNT_ID_SCOPE)) {
      // add credit card account id to res
      responseBody.credit_card_account_id = accountId;
    }

    if (scopes.includes(CREDIT_CARD_ID_SCOPE)) {
      const cardSummary = await bankingService.cardSummary();
      if (!cardSummary.ok) {
        logger.error(
          `Failed to fetch card summary from core banking adapter: ${serializeError(cardSummary.error)}`,
        );
        throw new Error("Failed to fetch card summary from core banking adapter");
      }

      // add card id to res
      responseBody.credit_card_id = cardSummary.data.id;
    }
  }

  return apiResponse(200, responseBody);
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(userInfo);
