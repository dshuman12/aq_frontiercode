import { OTP_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION } from "@functions/otp/authorize/authorize.constants";
import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { AUTH_TRANSACTIONS_TABLE, FIFTEEN_MINUTES, OTP_AUTH_FLOW, USER_TABLE } from "@libs/config";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { queryTableMethod, putItemMethod } from "@onmoapp/onmo-dynamodb";
import { BankingService } from "@services/banking/bankingService";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  onmouuid: z.string(),
  code_challenge: z.string(),
  scope: z.string(),
});

const eventSchema = z.object({
  body: jsonBody(bodySchema),
});

const authorize = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { onmouuid, code_challenge, scope } = parsedEvent.data.body;
  logger.addContext("onmouuid", onmouuid);

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

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryUserTableRes?.Items?.length) {
    throw new Error(`No record in ${USER_TABLE} found`);
  }

  const bankingService = await BankingService.init(onmouuid, forceHal);
  const customerSummary = await bankingService.customerSummary();
  if (!customerSummary.ok) {
    logger.error(`Error fetching customer: ${serializeError(customerSummary.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }

  const transaction_id = uuidv4();
  const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

  try {
    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: { transaction_id, onmouuid, scope, code_challenge, ttl, auth_flow: OTP_AUTH_FLOW },
    });
  } catch (error: any) {
    throw new Error(`Error creating transaction: ${error?.message || error}`);
  }

  return apiResponse(200, { transaction_id, next_endpoint: `${transaction_id}/otp/send` });
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(authorize);
