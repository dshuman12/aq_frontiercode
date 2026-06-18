import { deleteItemMethod, putItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { getForceHalHeader } from "@libs/gatewayUtils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import {
  AUTH_TRANSACTIONS_TABLE,
  BIOMETRICS_CHANGE_SCOPE,
  BIOMETRICS_REGISTRATION_AUTH_FLOW,
  EXCLUSIVE_SCOPES_PARAM,
  SIXTY_SECONDS,
} from "@libs/config";
import { getParameter } from "@onmoapp/onmo-ssm";
import { noExclusiveScope } from "@libs/scopes";
import { generateUnsignedChallenge } from "@libs/crypto";
import { BankingService } from "@services/banking/bankingService";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  onmouuid: z.string(),
  device_id: z.string(),
  code_challenge: z.string(),
});

const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const newScopes = [BIOMETRICS_CHANGE_SCOPE];

const biometricsRegInitiate = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  const { onmouuid: requestOnmouuid, device_id, code_challenge } = parsedEvent.data.body;
  logger.addContext("requestOnmouuid", requestOnmouuid);

  if (requestOnmouuid !== authOnmouuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
  }

  try {
    const rateLimiter = new RateLimiter();
    const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
      await rateLimiter.checkLimits({
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
      const all_limited_actions = [...new Set([...limited_actions, ...super_limited_actions])];
      logger.warn(`Rate limited for actions: ${JSON.stringify(all_limited_actions)}`);

      const expiry_time = super_rate_limited
        ? "no_expiry"
        : Math.max(...limited_actions.map((action) => action.rate_limit_expiry ?? 0));
      return apiResponse(429, { expiry_time });
    }
    await rateLimiter.recordAction({
      onmouuid: authOnmouuid,
      domain: "auth_biometrics_registration",
      action: "initiate",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const { Parameter: exclusiveParameter } = await getParameter({ Name: EXCLUSIVE_SCOPES_PARAM });
  if (!exclusiveParameter?.Value) {
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

  const bankingService = await BankingService.init(requestOnmouuid, forceHal);
  const customerSummary = await bankingService.customerSummary();
  if (!customerSummary.ok) {
    logger.error(
      `Failed to fetch customer summary from banking service: ${serializeError(customerSummary.error)}`,
    );
    throw new Error(`Failed to fetch customer summary from banking service`);
  }

  const { firstName, lastName } = customerSummary.data;
  if (!firstName) {
    throw new Error("Missing first name on customer details");
  }
  if (!lastName) {
    throw new Error("Missing last name on customer details");
  }

  // if any, delete all current transactions for this onmouuid with same scopes
  try {
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
      ExpressionAttributeNames: { "#scope": "scope" },
      ProjectionExpression: "transaction_id, #scope",
    });
    if (queryTransactionsTableRes?.Items?.length) {
      for (const transaction of queryTransactionsTableRes.Items) {
        const { transaction_id, scope: transactionScope } = transaction;

        if (!transactionScope) {
          logger.error("Transaction does not have scope");
          continue;
        }

        const isAllowed = noExclusiveScope({
          newScopes,
          existingScopes: transactionScope.split(","),
          exclusiveScopes,
        });

        if (!isAllowed) {
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        }
      }
    }
  } catch (error: any) {
    throw new Error(
      `Error processing transaction deletion for onmouuid: ${error?.message || error}`,
    );
  }

  // if any, delete all current transactions for this device_id
  try {
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "dev-index",
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": device_id },
      ProjectionExpression: "transaction_id",
    });
    if (queryTransactionsTableRes?.Items?.length) {
      for (const transaction of queryTransactionsTableRes.Items) {
        const { transaction_id } = transaction;
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      }
    }
  } catch (error: any) {
    throw new Error(`Error processing transaction deletion: ${error?.message || error}`);
  }

  const transaction_id = uuidv4();
  const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
  const next_endpoint = `${transaction_id}/biometrics/register`;
  const unsigned_challenge = generateUnsignedChallenge();

  await putItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Item: {
      transaction_id,
      device_id,
      onmouuid: requestOnmouuid,
      code_challenge,
      next_endpoint,
      unsigned_challenge,
      auth_flow: BIOMETRICS_REGISTRATION_AUTH_FLOW,
      ttl,
    },
  });
  logger.addContext("transaction_id", transaction_id);
  logger.addContext("auth_flow", BIOMETRICS_REGISTRATION_AUTH_FLOW);
  return apiResponse(200, { transaction_id, next_endpoint, unsigned_challenge });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(biometricsRegInitiate);
