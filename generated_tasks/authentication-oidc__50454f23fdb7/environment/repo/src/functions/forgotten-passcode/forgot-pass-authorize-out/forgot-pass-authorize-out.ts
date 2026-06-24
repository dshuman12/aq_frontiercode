import {
  AUTH_TRANSACTIONS_TABLE,
  COMPLETED_STATUS,
  EXCLUSIVE_SCOPES_PARAM,
  FIFTEEN_MINUTES,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  PASSCODE_CHANGE_SCOPE,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
  USER_TABLE,
} from "@libs/config";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { noExclusiveScope } from "@libs/scopes";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { deleteItemMethod, putItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { getParameter } from "@onmoapp/onmo-ssm";
import { v4 as uuidv4 } from "uuid";
import { UserRecordsService } from "@services/user/user";
import { BankingService } from "@services/banking/bankingService";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

const bodySchema = z.object({
  phone_number: z.string(),
  device_id: z.string(),
  code_challenge: z.string(),
});

const eventSchema = z.object({
  body: jsonBody(bodySchema),
});

const newScopes = [PASSCODE_CHANGE_SCOPE];

const forgotPassAuthorizeOut = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { phone_number, device_id, code_challenge } = parsedEvent.data.body;
  logger.addContext("phone_number", phone_number);
  logger.addContext("device_id", device_id);

  const userRecordsService = UserRecordsService.init();

  const userRecords = await userRecordsService.byPhoneNumber(phone_number);
  if (!userRecords.ok) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    logger.error(
      `Failed to fetch user records from user table: ${serializeError(userRecords.error)}`,
    );

    throw new Error(`Failed to fetch user records from user records service`);
  }

  const completedStatusRecords = userRecords.data.filter(
    (record) => record.onboardedStatus === COMPLETED_STATUS,
  );

  if (completedStatusRecords.length === 0) {
    throw new Error(`No fully onboarded record found in ${USER_TABLE} for phone_number`);
  }
  if (completedStatusRecords.length > 1) {
    throw new Error(`Multiple fully onboarded records found in ${USER_TABLE} for phone_number`);
  }
  const userRecord = completedStatusRecords[0];

  const { id: onmouuid } = userRecord;
  logger.addContext("onmouuid", onmouuid);

  try {
    const rateLimiter = new RateLimiter();
    const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
      await rateLimiter.checkLimits({
        onmouuid,
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
      onmouuid,
      domain: "auth_forgotten_passcode",
      action: "authorize",
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.RATE_LIMIT_SERVICE_ERROR);
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const bankingService = await BankingService.init(onmouuid, forceHal);
  const creditAccount = await bankingService.creditAccountSummary();

  if (!creditAccount.ok) {
    logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
    logger.error(
      `Failed to fetch credit account summary from banking service: ${serializeError(creditAccount.error)}`,
    );
    throw new Error(`Failed to fetch customer summary from banking service`);
  }

  // check that account state is supported app forgotten passcode
  if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(creditAccount.data.state)) {
    logger.addContext("error_code", ERROR_CODES.ACCOUNT_INVALID_STATE);
    throw new Error(
      `Credit account is not in valid state. Account state is: ${creditAccount.data.state} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
    );
  }

  const customerDetails = await bankingService.customerSummary();
  if (!customerDetails.ok) {
    logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
    logger.error(
      `Failed to fetch customer summary from banking service: ${serializeError(customerDetails.error)}`,
    );
    throw new Error(`Failed to fetch customer summary from banking service`);
  }

  const email_address = customerDetails.data.email;
  if (!email_address) {
    throw new Error("Missing email address on customer details");
  }
  const first_name = customerDetails.data.firstName;
  if (!first_name) {
    throw new Error("Missing first name on customer details");
  }

  const { Parameter: exclusiveParameter } = await getParameter({ Name: EXCLUSIVE_SCOPES_PARAM });
  if (!exclusiveParameter?.Value) {
    logger.addContext("error_code", ERROR_CODES.CONFIG_SERVICE_ERROR);
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

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
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
          transactionDeleteCount += 1;
        }
      }
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
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
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(`Error processing transaction deletion: ${error?.message || error}`);
  }

  const transaction_id = uuidv4();
  const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
  const next_endpoint = `${transaction_id}/forgotten-passcode/otp/send`;

  await putItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Item: {
      transaction_id,
      device_id,
      onmouuid,
      phone_number,
      email_address,
      first_name,
      create_refresh_token: false,
      scope: newScopes.join(","),
      code_challenge,
      next_endpoint,
      auth_flow: FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
      otp_sms_send_count: 0,
      otp_sms_attempt_count: 0,
      otp_sms_verified: false,
      otp_email_send_count: 0,
      otp_email_attempt_count: 0,
      otp_email_verified: false,
      ttl,
    },
  });
  logger.addContext("transaction_id", transaction_id);
  logger.addContext("auth_flow", FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW);
  return apiResponse(200, { transaction_id, next_endpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(forgotPassAuthorizeOut);
