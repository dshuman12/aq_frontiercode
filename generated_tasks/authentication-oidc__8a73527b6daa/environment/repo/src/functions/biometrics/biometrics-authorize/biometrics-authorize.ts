import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { noScopeConflict } from "@libs/scopes";
import { getParameter } from "@onmoapp/onmo-ssm";
import { putItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { v4 as uuidv4 } from "uuid";
import {
  AUTH_KEYS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  BIOMETRICS_AUTH_FLOW,
  EXCLUSIVE_SCOPES_PARAM,
  FIRST_TIME_LOGIN_SCOPE,
  FIVE_MINUTES,
  NON_CONFLICT_SCOPES_PARAM,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
  USER_TABLE,
} from "@libs/constants";
import { getCurrentTimestampInSeconds, toLMSResult } from "@libs/utils";
import { generateUnsignedChallenge } from "@libs/crypto";

import { toHttpResponse } from "@onmoapp/core-banking";
import { TransactionsService } from "@services/transaction/transaction";
import { z } from "zod";
import { UserRecordsService } from "@services/user/user";
import { getLogger } from "@libs/logger";
import { AuthorizerEvent, jsonCodec } from "@libs/shared";
import { BankingService } from "@services/banking/bankingService";

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  const transactionsService = new TransactionsService();
  const userRecordsService = new UserRecordsService();

  const forcedCodePath = event.headers?.["x-force-hal"];

  try {
    logger.info(`Received event body: ${event.body}`);

    const eventBodySchema = z.object({
      device_id: z.string(),
      code_challenge: z.string(),
      scope: z.string(),
    });

    const parsedEvent = jsonCodec(eventBodySchema).safeDecode(event.body);

    if (!parsedEvent.success) {
      return toHttpResponse(toLMSResult(parsedEvent));
    }

    const { device_id, code_challenge, scope: requestScope } = parsedEvent.data;

    logger.addContext({ device_id, scope: requestScope });
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
    logger.info(`All requested scopes are supported. Scopes are: ${requestScope}`);

    // if any, delete all current transaction for this device_id
    const removeDeviceTransactionsResult = await transactionsService.deleteByDeviceId(device_id);
    if (!removeDeviceTransactionsResult.ok) return toHttpResponse(removeDeviceTransactionsResult);

    const user = await userRecordsService.byDeviceId(device_id);

    if (!user.ok) {
      const opts =
        user.error.type === "NOT_FOUND_ERROR"
          ? {
              status: 422,
              body: { next_endpoint: "authorize/otp-passcode" },
            }
          : {};

      return toHttpResponse(user, opts);
    }

    const { id } = user.data;
    logger.addContext({ onmoId: id });

    const queryAuthKeysTableRes = await queryTableMethod({
      TableName: AUTH_KEYS_TABLE,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": id },
    });

    if (!queryAuthKeysTableRes?.Items?.length) {
      logger.warn("No biometrics data found for user");

      return formatJSONResponse({
        statusCode: 404,
        body: { next_endpoint: "authorize/otp-passcode" },
      });
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

      return formatJSONResponse({
        statusCode: 422,
        body: { next_endpoint: "authorize/otp-passcode" },
      });
    }

    const bankingService = await BankingService.init(id, logger, forcedCodePath);

    const accountStateResult = await bankingService.creditAccountSummary();

    if (!accountStateResult.ok) {
      return toHttpResponse(accountStateResult);
    }

    const accountState = accountStateResult.data.state;

    // check that account state is supported for app login
    if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(accountState)) {
      throw new Error(
        `Credit card account in ${USER_TABLE} table is not in valid state. Account state is: ${accountState} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
      );
    }

    logger.info("Request is valid for biometrics login flow");

    // user is valid for relogin flow
    const transaction_id: string = uuidv4();
    const ttl: number = getCurrentTimestampInSeconds() + FIVE_MINUTES;
    const next_endpoint: string = `${transaction_id}/biometrics/verify`;
    const unsigned_challenge = generateUnsignedChallenge();

    // if any, delete all current transaction for this onmouuid with same scopes

    const removeTransactionsResult = await transactionsService.deleteByOnmoId(id, [
      {
        newScopes,
        exclusiveScopes,
      },
    ]);
    if (!removeTransactionsResult.ok) return toHttpResponse(removeTransactionsResult);

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        device_id,
        onmouuid: id,
        fe_public_key,
        unsigned_challenge,
        create_refresh_token: true,
        scope: requestScope,
        code_challenge,
        next_endpoint,
        biometrics_verified: false,
        auth_flow: BIOMETRICS_AUTH_FLOW,
        ttl,
      },
    });

    return formatJSONResponse({
      statusCode: 200,
      body: { transaction_id, next_endpoint, unsigned_challenge },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
