import {
  AUTH_TRANSACTIONS_TABLE,
  EXCLUSIVE_SCOPES_PARAM,
  FIFTEEN_MINUTES,
  FIRST_TIME_LOGIN_FLOW,
  NON_CONFLICT_SCOPES_PARAM,
  LOGIN_SCENARIO_RELOGIN_RECOGNIZED_DEVICE,
  RELOGIN_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  USER_TABLE,
} from "@libs/config";
import { queryTableMethod, putItemMethod } from "@onmoapp/onmo-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { validateScopes } from "./scope-validations";
import { deleteCurrentTransactions, deleteIncompatibleTransactions } from "./delete-transactions";
import { verifyAccountState } from "./verify-account-state";
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
  device_id: z.string(),
  code_challenge: z.string(),
  scope: z.string(),
  force_first_time_login: z.boolean().optional(),
});

const eventSchema = z.object({
  body: jsonBody(bodySchema),
});

const otpPasscodeAuthorize = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);

  const {
    device_id,
    code_challenge,
    scope: requestScope,
    force_first_time_login,
  } = parsedEvent.data.body;

  logger.addContext("device_id", device_id);
  logger.addContext("scope", requestScope);
  if (force_first_time_login) {
    logger.addContext("force_first_time_login", force_first_time_login);
  }

  const { newScopes, exclusiveScopes } = await validateScopes({
    requestScope,
    non_conflict_scopes_param: NON_CONFLICT_SCOPES_PARAM,
    exclusive_scopes_param: EXCLUSIVE_SCOPES_PARAM,
  });

  // if any, delete all current transactions for this device_id
  try {
    await deleteCurrentTransactions({
      device_id,
      auth_transactions_table: AUTH_TRANSACTIONS_TABLE,
    });
  } catch (error: any) {
    throw new Error(`Error processing transaction deletion: ${error?.message || error}`);
  }

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    IndexName: "dev-index",
    KeyConditionExpression: "dev = :device_id",
    ExpressionAttributeValues: { ":device_id": device_id },
  });

  const isDeviceNotRegistered = !queryUserTableRes?.Items?.length;

  if (isDeviceNotRegistered || force_first_time_login) {
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
    logger.addContext("transaction_id", transaction_id);
    logger.addContext("auth_flow", OTP_PASSCODE_AUTH_FLOW);
    logger.addContext("login_flow", FIRST_TIME_LOGIN_FLOW);
    return apiResponse(200, { transaction_id, next_endpoint });
  }

  // check if more than one user is registered to device_id (shouldn't be possible as restriction of one user per device_id)
  if (!isDeviceNotRegistered && (queryUserTableRes?.Items?.length ?? 0) > 1) {
    throw new Error(`More than one user found in ${USER_TABLE} table for device_id`);
  }

  if (isDeviceNotRegistered) {
    throw new Error(`No user record found in ${USER_TABLE} table for device_id`);
  }

  type credsFromUserTable = {
    onmouuid: string;
  };
  const { onmouuid } = queryUserTableRes?.Items?.[0] as credsFromUserTable;

  logger.addContext("onmouuid", onmouuid);

  // get credit account details from core banking and validate account state
  await verifyAccountState(onmouuid, forceHal);

  // user is valid for relogin flow
  const transaction_id: string = uuidv4();
  const ttl: number = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
  const next_endpoint: string = `${transaction_id}/otp-passcode/passcode/verify`;

  // if any, delete all current transactions for this onmouuid with incompatible scopes
  try {
    await deleteIncompatibleTransactions({
      onmouuid,
      newScopes,
      exclusiveScopes,
      auth_transactions_table: AUTH_TRANSACTIONS_TABLE,
    });
  } catch (error: any) {
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
  logger.addContext("transaction_id", transaction_id);
  logger.addContext("auth_flow", OTP_PASSCODE_AUTH_FLOW);
  logger.addContext("login_flow", RELOGIN_FLOW);
  return apiResponse(200, {
    transaction_id,
    next_endpoint,
    login_scenario: LOGIN_SCENARIO_RELOGIN_RECOGNIZED_DEVICE,
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(otpPasscodeAuthorize);
