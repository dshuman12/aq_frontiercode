import {
  APP_TESTER_LOGIN_CONFIG,
  AUTH_TRANSACTIONS_TABLE,
  COMPLETED_STATUS,
  ENV,
  EXCLUSIVE_SCOPES_PARAM,
  FIRST_TIME_LOGIN_FLOW,
  FIVE_MINUTES,
  OTP_PASSCODE_AUTH_FLOW,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
  USER_TABLE,
} from "@libs/config";
import { OTP_PASSCODE_OTP_VERIFY } from "../otp-passcode.constants";
import { runNotificationProvider } from "@libs/featureFlag";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { noExclusiveScope } from "@libs/scopes";
import { checkIfTestNumber, generateVerifyCode } from "@libs/sms";
import { APP_TESTER_NUMBER, AppTesterLoginConfig } from "@libs/testConstants";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { getParameter } from "@onmoapp/onmo-ssm";
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

const bodySchema = z.object({
  phone_number: z.string(),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  body: jsonBody(bodySchema),
});

const otpPasscodeSendOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);

  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { phone_number } = parsedEvent.data.body;
  logger.addContext("phone_number", phone_number);

  // FOR APP TESTER
  let isAppTesterNumber = false;
  if (phone_number === APP_TESTER_NUMBER) {
    logger.warn("***** THIS IS APP TESTER NUMBER *****");
    isAppTesterNumber = true;
  }

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": transaction_id },
  });
  if (!queryTransactionsTableRes?.Items?.length) {
    logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const transactionRecord = queryTransactionsTableRes.Items[0];
  if (transactionRecord.onmouuid) {
    logger.warn("Transaction should not yet have onmouuid for first time login");
    return apiResponse(400, { message: "Bad Request" });
  }

  const { auth_flow, login_flow, otp_sms_send_count } = transactionRecord;
  try {
    if (!auth_flow) {
      throw new Error("[suspicious_activity] Transaction does not have auth_flow");
    }
    if (auth_flow !== OTP_PASSCODE_AUTH_FLOW) {
      throw new Error(
        `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_PASSCODE_AUTH_FLOW}`,
      );
    }
    logger.addContext("auth_flow", auth_flow);
    if (!login_flow) {
      throw new Error("[suspicious_activity] Transaction does not have login_flow");
    }
    if (login_flow !== FIRST_TIME_LOGIN_FLOW) {
      throw new Error(
        `[suspicious_activity] Transaction login_flow: ${login_flow}, expected: ${FIRST_TIME_LOGIN_FLOW}`,
      );
    }
    logger.addContext("login_flow", login_flow);

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (!("create_refresh_token" in transactionRecord)) {
      throw new Error("Transaction missing create_refresh_token");
    }
    if (!transactionRecord.create_refresh_token) {
      throw new Error("Transaction not marked with create_refresh_token=true");
    }

    if (
      !transactionRecord.code_challenge ||
      !transactionRecord.scope ||
      !transactionRecord.device_id
    ) {
      throw new Error(
        `[suspicious_activity] Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`,
      );
    }

    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction missing otp_sms_send_count");
    }

    if (otp_sms_send_count !== 0) {
      throw new Error(`Transaction otp_sms_send_count should be 0 but is ${otp_sms_send_count}`);
    }
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction missing otp_sms_send_count");
    }
    const { otp_sms_attempt_count } = transactionRecord;
    if (otp_sms_attempt_count !== 0) {
      throw new Error(`Transaction otp_sms_attempt_count should be 0 but is ${otp_sms_send_count}`);
    }
    if ("otp_sms_expiry_time" in transactionRecord) {
      throw new Error(`otp_sms_expiry_time in transaction`);
    }
    if (transactionRecord.phone_number) {
      throw new Error("Transaction already has phone_number");
    }
    if (transactionRecord.auth_code) {
      throw new Error("Transaction already been used for an auth code");
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/otp-passcode/otp/send`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/otp-passcode/otp/send, but received: ${transactionRecord.next_endpoint}`,
      );
    }
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    IndexName: "phonenumber-index",
    KeyConditionExpression: "phonenumber = :phonenumber",
    ExpressionAttributeValues: { ":phonenumber": phone_number },
  });
  if (!queryUserTableRes?.Items?.length) {
    try {
      await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
    } catch (error: any) {
      logger.error(`Failed to void transaction: ${error?.message || error}`);
    }
    logger.warn(`[suspicious_activity] No record in ${USER_TABLE} found for phone_number`);
    return apiResponse(400, { message: "Bad Request" });
  }

  const completedStatusRecords = queryUserTableRes.Items.filter(
    (record) => record.onboarded_status === COMPLETED_STATUS,
  );
  if (completedStatusRecords.length === 0) {
    try {
      await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
    } catch (error: any) {
      logger.error(`Failed to void transaction: ${error?.message || error}`);
    }
    logger.warn(`No fully onboarded record found in ${USER_TABLE} for phone_number`);
    return apiResponse(400, { message: "Bad Request" });
  }
  if (completedStatusRecords.length > 1) {
    throw new Error(`Multiple fully onboarded records found in ${USER_TABLE} for phone_number`);
  }
  const userRecord = completedStatusRecords[0];

  const { onmouuid } = userRecord as { onmouuid: string };
  logger.addContext("onmouuid", onmouuid);

  const { Parameter: exclusiveParameter } = await getParameter({ Name: EXCLUSIVE_SCOPES_PARAM });
  if (!exclusiveParameter?.Value) {
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

  // if any, delete all other current transactions for this onmouuid with same scopes
  try {
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
      ExpressionAttributeNames: { "#scope": "scope" },
      ProjectionExpression: "transaction_id, #scope",
    });
    const filteredTransactions = queryTransactionsTableRes!.Items!.filter((record) => {
      return record.transaction_id !== transactionRecord.transaction_id;
    });
    if (filteredTransactions.length) {
      let transactionDeleteCount = 0;

      for (const filteredTransaction of filteredTransactions) {
        const { transaction_id: filteredTransactionId, scope: filteredTransactionScope } =
          filteredTransaction;

        if (!filteredTransactionScope) {
          logger.warn("Transaction does not have scope");
          continue;
        }

        const isAllowed = noExclusiveScope({
          newScopes: transactionRecord.scope.split(","),
          existingScopes: filteredTransactionScope.split(","),
          exclusiveScopes,
        });

        if (!isAllowed) {
          await deleteItemMethod({
            TableName: AUTH_TRANSACTIONS_TABLE,
            Key: { transaction_id: filteredTransactionId },
          });
          transactionDeleteCount += 1;
        }
      }
    }
  } catch (error: any) {
    throw new Error(
      `Error processing transaction deletion for onmouuid: ${error?.message || error}`,
    );
  }

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
      domain: "auth_login",
      action: "otp_sms_send",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const bankingService = await BankingService.init(onmouuid, forceHal);
  const accountSummary = await bankingService.creditAccountSummary();
  if (!accountSummary.ok) {
    logger.error(`Failed to fetch account details: ${serializeError(accountSummary.error)}`);
    throw new Error("Failed to fetch account details");
  }
  logger.addContext("creditAccountId", accountSummary.data.id);

  // check that account state is supported for app login
  if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(accountSummary.data.state)) {
    logger.warn(
      `Credit card account is not in valid state. Account state is: ${accountSummary.data.state} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }

  const customerSummary = await bankingService.customerSummary();
  if (!customerSummary.ok) {
    logger.error(`Failed to fetch customer details: ${serializeError(customerSummary.error)}`);
    throw new Error("Failed to fetch customer details");
  }

  if (customerSummary.data.id !== onmouuid) {
    logger.warn(
      `[suspicious_activity] [suspicious_activity]Customer id in ${USER_TABLE} table does not match the one registered to client account`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  if (customerSummary.data.mobile !== phone_number) {
    logger.warn(
      `Phone number in ${USER_TABLE} table does not match the one registered to credit card account`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }

  const isTestNumber = checkIfTestNumber(phone_number);
  let verifyCode;

  // FOR APP TESTER
  if (isAppTesterNumber) {
    try {
      const { Parameter: appTesterParam } = await getParameter({
        Name: APP_TESTER_LOGIN_CONFIG,
      });
      if (!appTesterParam?.Value) {
        throw new Error(`Failed to fetch app tester login config parameter from ssm`);
      }
      const { enabled, sms_otp, passcode } = JSON.parse(
        appTesterParam.Value,
      ) as AppTesterLoginConfig;
      logger.addContext("APP_TESTER_SMS_OTP", sms_otp);
      logger.addContext("APP_TESTER_PASSCODE", passcode);

      if (!sms_otp) {
        throw new Error("Missing sms otp in SSM param");
      }
      if (!passcode) {
        throw new Error("Missing passcode in SSM param");
      }
      if (!enabled) {
        throw new Error("App tester login config is disabled");
      }
      verifyCode = sms_otp;

      logger.warn("App tester login config retrieved successfully");
    } catch (error: any) {
      throw new Error("Failed to get app tester login config");
    }
  }
  // FOR TEST NUMBERS (staging only)
  else if (isTestNumber) {
    verifyCode = 1111;
  }
  // NORMAL VERIFY CODE
  else {
    verifyCode = generateVerifyCode();
  }
  logger.addContext("verifyCode", verifyCode);

  if (!isTestNumber && !isAppTesterNumber) {
    try {
      await runNotificationProvider(onmouuid, verifyCode, phone_number, "passcode-send-otp", ENV);
    } catch (error: any) {
      if (error?.message?.startsWith("ValidationError:")) {
        logger.warn(`Error sending OTP code: ${error}`);
        return apiResponse(400, { message: "Failed to validate phone number" });
      }

      logger.error(`Error sending OTP code: ${error}`);
      throw new Error(`Error sending OTP`);
    }
  }

  const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
  const next_endpoint = `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}`;

  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "onmouuid = :onmouuid",
      "phone_number = :phoneNumber",
      "verify_code = :verifyCode",
      "otp_sms_expiry_time = :otpExpiryTime",
      "otp_sms_send_count = :otpSendCount",
      "next_endpoint = :nextEndpoint",
    ].join(", ")}`,
    ExpressionAttributeValues: {
      ":onmouuid": onmouuid,
      ":phoneNumber": phone_number,
      ":verifyCode": verifyCode,
      ":otpExpiryTime": otpExpiryTime,
      ":otpSendCount": otp_sms_send_count + 1, // 0 + 1
      ":nextEndpoint": next_endpoint,
    },
  });

  return apiResponse(200, { message: "OTP sent successfully", next_endpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(otpPasscodeSendOTP);
