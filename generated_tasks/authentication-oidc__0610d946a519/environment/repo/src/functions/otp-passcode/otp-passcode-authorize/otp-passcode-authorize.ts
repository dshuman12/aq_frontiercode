import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import {
  AUTH_TRANSACTIONS_TABLE,
  EXCLUSIVE_SCOPES_PARAM,
  FIFTEEN_MINUTES,
  FIRST_TIME_LOGIN_FLOW,
  FIRST_TIME_LOGIN_SCOPE,
  NON_CONFLICT_SCOPES_PARAM,
  OTP_PASSCODE_AUTH_FLOW,
  RELOGIN_FLOW,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
  USER_TABLE,
} from "@libs/constants";
import { putItemMethod } from "@onmoapp/onmo-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getParameter } from "@onmoapp/onmo-ssm";
import { noScopeConflict } from "@libs/scopes";

import { toHttpResponse } from "@onmoapp/core-banking";
import { TransactionsService } from "@services/transaction/transaction";
import { getLogger } from "@libs/logger";
import { UserRecordsService } from "@services/user/user";
import { AuthorizerEvent } from "@libs/shared";
import { BankingService } from "@services/banking/bankingService";

type ParsedRequestBody = {
  device_id: string;
  code_challenge: string;
  scope: string;
  force_first_time_login?: boolean;
};

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();

  const forcedCodePath = event.headers?.["x-force-hal"];

  const transactionsService = new TransactionsService(logger);
  const userRecordsService = new UserRecordsService(logger);

  try {
    logger.info(`Received event body: ${event.body}`);

    const {
      device_id,
      code_challenge,
      scope: requestScope,
      force_first_time_login, // optional
    }: ParsedRequestBody = JSON.parse(event.body);
    if (!device_id || !code_challenge || !requestScope) {
      throw new Error("Missing necessary request attributes");
    }
    logger.addContext({
      device_id,
      scope: requestScope,
      ...(force_first_time_login ? { force_first_time_login } : {}),
    });
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
    const removeTransByDev = await transactionsService.deleteByDeviceId(device_id);
    if (!removeTransByDev) return toHttpResponse(removeTransByDev);

    let queryUserTableRes = !force_first_time_login
      ? await userRecordsService.byDeviceId(device_id)
      : null;

    const noDeviceRecord =
      !queryUserTableRes?.ok && queryUserTableRes?.error.type === "NOT_FOUND_ERROR";

    // device_id not registered OR first time login flow forced
    if (force_first_time_login || noDeviceRecord) {
      logger.info("Beginning first time login flow");

      const transaction_id = uuidv4();
      const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
      const next_endpoint = `${transaction_id}/otp-passcode/otp/send`;

      await putItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Item: {
          transaction_id,
          device_id,
          create_refresh_token: true,
          scope: requestScope,
          code_challenge,
          next_endpoint,
          auth_flow: OTP_PASSCODE_AUTH_FLOW,
          login_flow: FIRST_TIME_LOGIN_FLOW,
          otp_sms_send_count: 0,
          otp_sms_attempt_count: 0,
          otp_sms_verified: false,
          passcode_attempt_count: 0,
          passcode_verified: false,
          ttl,
        },
      });
      return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
    }
    if (queryUserTableRes === null) return;
    if (!queryUserTableRes.ok) return toHttpResponse(queryUserTableRes!);
    if (!queryUserTableRes.data.creditAccountId)
      return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });

    const { id: onmouuid } = queryUserTableRes.data;

    // get credit account details from core banking and validate customer id's match
    logger.info("Initialising core banking adapter");
    const service = await BankingService.init(onmouuid, logger, forcedCodePath);
    const accountState = await service.creditAccountSummary();
    // this should only be a 500 when it's a connection issue not a parsing issue.
    if (!accountState.ok) return toHttpResponse(accountState, { status: 500 });

    // check that account state is supported for app login
    if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(accountState.data.state)) {
      throw new Error(
        `Credit card account in ${USER_TABLE} table is not in valid state. Account state is: ${accountState.data} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
      );
    }

    // user is valid for relogin flow
    const transaction_id: string = uuidv4();
    const ttl: number = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
    const next_endpoint: string = `${transaction_id}/otp-passcode/passcode/verify`;

    // if any, delete all current transaction for this onmouuid with same scopes
    const removeTransById = await transactionsService.deleteByOnmoId(onmouuid, [
      {
        newScopes,
        exclusiveScopes,
      },
    ]);

    if (!removeTransById.ok) return toHttpResponse(removeTransById);

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        device_id,
        onmouuid,
        create_refresh_token: true,
        scope: requestScope,
        code_challenge,
        next_endpoint,
        passcode_attempt_count: 0,
        passcode_verified: false,
        auth_flow: OTP_PASSCODE_AUTH_FLOW,
        login_flow: RELOGIN_FLOW,
        ttl,
      },
    });

    return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
