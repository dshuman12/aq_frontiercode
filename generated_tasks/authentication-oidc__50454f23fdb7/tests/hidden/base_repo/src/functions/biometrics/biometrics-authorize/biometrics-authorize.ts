import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { noExclusiveScope, noScopeConflict } from "@libs/scopes";
import { getParameter } from "@onmoapp/onmo-ssm";
import { deleteItemMethod, putItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getForceHalHeader } from "@libs/gatewayUtils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";

import { v4 as uuidv4 } from "uuid";
import {
  AUTH_KEYS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  BIOMETRICS_AUTH_FLOW,
  EXCLUSIVE_SCOPES_PARAM,
  FIRST_TIME_LOGIN_SCOPE,
  RELOGIN_FLOW,
  FIVE_MINUTES,
  NON_CONFLICT_SCOPES_PARAM,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
} from "@libs/config";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { ERROR_CODES } from "@libs/constants";
import { generateUnsignedChallenge } from "@libs/crypto";
import { z } from "zod";
import { BankingService } from "@services/banking/bankingService";
import { UserRecordsService } from "@services/user/user";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  device_id: z.string(),
  code_challenge: z.string(),
  scope: z.string(),
});

const eventSchema = z.object({
  body: jsonBody(bodySchema),
});

const biometricsAuthorize = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { device_id, code_challenge, scope: requestScope } = parsedEvent.data.body;
  logger.addContext("device_id", device_id);
  logger.addContext("scope", requestScope);
  const newScopes = requestScope.split(",");

  if (newScopes.includes(FIRST_TIME_LOGIN_SCOPE)) {
    throw new Error(`Invalid scope in request: ${FIRST_TIME_LOGIN_SCOPE}`);
  }

  const [{ Parameter: nonConflictParameter }, { Parameter: exclusiveParameter }] =
    await Promise.all([
      getParameter({ Name: NON_CONFLICT_SCOPES_PARAM }),
      getParameter({ Name: EXCLUSIVE_SCOPES_PARAM }),
    ]);
  if (!nonConflictParameter?.Value || !exclusiveParameter?.Value) {
    logger.addContext("error_code", ERROR_CODES.CONFIG_SERVICE_ERROR);
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const nonConflictGroups = JSON.parse(nonConflictParameter.Value) as string[][];
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

  const noScopeConflicts = noScopeConflict({ newScopes: newScopes, nonConflictGroups });
  if (!noScopeConflicts) {
    throw new Error(`Conflict in requested scope: ${requestScope}`);
  }
  const { OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP } = await getSpecificScopeToResourceMaps();
  for (const scopeItem of newScopes) {
    const trimmedScope = scopeItem.trim();
    if (!(trimmedScope in OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP)) {
      throw new Error(`Scope ${trimmedScope} not currently supported`);
    }
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
      logger.info(
        `${queryTransactionsTableRes.Count} existing transactions for device_id, deleting them`,
      );

      for (const transaction of queryTransactionsTableRes.Items) {
        const { transaction_id } = transaction;
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      }
      logger.info(`Successfully deleted existing transactions for device_id`);
    } else {
      logger.info(`No existing transactions found for device_id`);
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(`Error processing transaction deletion: ${error?.message || error}`);
  }

  const userService = UserRecordsService.init();

  const userRecord = await userService.byDeviceId(device_id);

  if (!userRecord.ok) {
    logger.error(
      `Failed to get user record from user service: ${serializeError(userRecord.error)}`,
    );

    return apiResponse(422, { next_endpoint: "authorize/otp-passcode" });
  }

  // if only 1 record found - validate account for biometrics flow
  logger.info(`Found user for device_id validating for biometrics flow`);

  const onmouuid = userRecord.data.id;

  logger.addContext("onmouuid", onmouuid);

  const queryAuthKeysTableRes = await queryTableMethod({
    TableName: AUTH_KEYS_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryAuthKeysTableRes?.Items?.length) {
    logger.warn("No biometrics data found for user");

    return apiResponse(404, { next_endpoint: "authorize/otp-passcode" });
  }
  const { fe_public_key, device_id: authKeysDeviceId } = queryAuthKeysTableRes.Items[0];

  if (!fe_public_key) {
    throw new Error(`Missing fe_public_key in ${AUTH_KEYS_TABLE} table`);
  }
  if (!authKeysDeviceId) {
    throw new Error(`Missing device_id in ${AUTH_KEYS_TABLE} table`);
  }
  if (device_id !== authKeysDeviceId) {
    logger.warn(`Supplied device_id does not match stored device_id in ${AUTH_KEYS_TABLE} table`);

    return apiResponse(422, { next_endpoint: "authorize/otp-passcode" });
  }

  // get credit account details from core banking and validate customer id's match
  const bankingService = await BankingService.init(onmouuid, forceHal);
  const creditAccountSummary = await bankingService.creditAccountSummary();

  if (!creditAccountSummary.ok) {
    logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
    logger.error(
      `Failed to get credit account summary from banking service: ${serializeError(creditAccountSummary.error)}`,
    );
    throw new Error(`Failed to get credit account summary from banking service`);
  }

  const accountState = creditAccountSummary.data.state;

  // check that account state is supported for app login
  if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(accountState)) {
    logger.addContext("error_code", ERROR_CODES.ACCOUNT_INVALID_STATE);
    throw new Error(
      `Credit account is not in valid state. Account state is: ${accountState} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
    );
  }

  logger.info("Request is valid for biometrics login flow");

  // user is valid for relogin flow
  const transaction_id: string = uuidv4();
  const ttl: number = getCurrentTimestampInSeconds() + FIVE_MINUTES;
  const next_endpoint: string = `${transaction_id}/biometrics/verify`;
  const unsigned_challenge = generateUnsignedChallenge();

  // if any, delete all current transactions for this onmouuid with same scopes
  try {
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
      ExpressionAttributeNames: { "#scope": "scope" },
      ProjectionExpression: "transaction_id, #scope",
    });
    if (queryTransactionsTableRes?.Items?.length) {
      logger.info(
        `${queryTransactionsTableRes.Count} existing transactions for onmouuid, comparing scopes`,
      );
      let transactionDeleteCount = 0;

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
          logger.info("Transaction has incompatible scopes to request, deleting");
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
          transactionDeleteCount += 1;
          logger.info(`Successfully deleted transaction for onmouuid`);
        }
      }
      logger.info(
        `Successfully deleted ${transactionDeleteCount} existing transactions for onmouuid`,
      );
    } else {
      logger.info(`No existing transactions found for onmouuid`);
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(
      `Error processing transaction deletion for onmouuid: ${error?.message || error}`,
    );
  }

  await putItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Item: {
      transaction_id,
      device_id,
      onmouuid,
      fe_public_key,
      unsigned_challenge,
      create_refresh_token: true,
      scope: requestScope,
      code_challenge,
      next_endpoint,
      biometrics_verified: false,
      auth_flow: BIOMETRICS_AUTH_FLOW,
      login_flow: RELOGIN_FLOW,
      ttl,
    },
  });

  logger.addContext("transaction_id", transaction_id);
  logger.addContext("auth_flow", BIOMETRICS_AUTH_FLOW);
  return apiResponse(200, { transaction_id, next_endpoint, unsigned_challenge });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(biometricsAuthorize);
