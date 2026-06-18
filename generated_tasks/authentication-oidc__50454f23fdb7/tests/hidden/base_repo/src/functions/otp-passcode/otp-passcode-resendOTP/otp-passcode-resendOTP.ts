import {
  APP_TESTER_LOGIN_CONFIG,
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  FIRST_TIME_LOGIN_FLOW,
  FIVE_MINUTES,
  OTP_ATTEMPT_LIMIT,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/config";
import { runNotificationProvider } from "@libs/featureFlag";
import { checkIfTestNumber, generateVerifyCode } from "@libs/sms";
import { APP_TESTER_NUMBER, AppTesterLoginConfig } from "@libs/testConstants";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { getParameter } from "@onmoapp/onmo-ssm";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { OTP_PASSCODE_OTP_VERIFY, OTP_PASSCODE_OTP_RESEND } from "../otp-passcode.constants";

const bodySchema = z.object({
  phone_number: z.string().trim().min(1),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  body: jsonBody(bodySchema),
});

const otpPasscodeResendOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
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
  const { onmouuid, auth_flow, login_flow } = transactionRecord;
  if (!onmouuid) {
    logger.warn("Transaction does not have onmouuid");
    return apiResponse(400, { message: "Bad Request" });
  }
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
      domain: "auth_login",
      action: "otp_sms_send",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

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
    const { next_endpoint } = transactionRecord;
    if (!("create_refresh_token" in transactionRecord)) {
      throw new Error("Transaction does not have create_refresh_token");
    }
    if (!transactionRecord.create_refresh_token) {
      throw new Error("Transaction not marked with create_refresh_token=true");
    }

    if (!transactionRecord.phone_number) {
      throw new Error("Transaction does not have phone_number");
    }
    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }
    if (!("otp_sms_verified" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_verified");
    }
    if (!("otp_sms_expiry_time" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_expiry_time");
    }
    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_send_count");
    }
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_attempt_count");
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
    if ("auth_code" in transactionRecord) {
      throw new Error(`auth_code in transaction`);
    }
    if (transactionRecord.otp_sms_verified) {
      throw new Error("[suspicious_activity] OTP has already been verified");
    }
    if (
      next_endpoint !== `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}` &&
      next_endpoint !== `${transaction_id}/${OTP_PASSCODE_OTP_RESEND}`
    ) {
      throw new Error(
        `Expected transaction next_endpoint of ${transaction_id}/${OTP_PASSCODE_OTP_VERIFY} or ${transaction_id}/${OTP_PASSCODE_OTP_RESEND}, but received: ${next_endpoint}`,
      );
    }

    if (transactionRecord.phone_number !== phone_number) {
      throw new Error(
        "[suspicious_activity] Phone number on transaction does not match provided one",
      );
    }
    if (transactionRecord.otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
    }
    if (transactionRecord.otp_sms_send_count < 1) {
      throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
    }
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  if (transactionRecord.otp_sms_send_count >= OTP_SEND_LIMIT) {
    logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

    try {
      await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
    } catch (error: any) {
      logger.error(`Failed to void transaction: ${error?.message || error}`);
    }

    return apiResponse(422, {
      error_code: OTP_SEND_LIMIT_REACHED,
      next_endpoint: "authorize/otp-passcode",
    });
  }
  const { otp_sms_send_count } = transactionRecord;
  logger.addContext("otp_sms_send_count", otp_sms_send_count);

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
      await runNotificationProvider(onmouuid, verifyCode, phone_number, "passcode-resend-otp", ENV);
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

  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "verify_code = :verifyCode",
      "otp_sms_expiry_time = :otpExpiryTime",
      "otp_sms_send_count = :otpSendCount",
      "otp_sms_attempt_count = :otpAttemptCount",
      "next_endpoint = :nextEndpoint",
    ].join(", ")}`,

    ExpressionAttributeValues: {
      ":verifyCode": verifyCode,
      ":otpExpiryTime": otpExpiryTime,
      ":otpSendCount": otp_sms_send_count + 1,
      ":otpAttemptCount": 0,
      ":nextEndpoint": `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}`,
    },
  });

  return apiResponse(200, {
    message: "OTP resent successfully",
    next_endpoint: `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}`,
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(otpPasscodeResendOTP);
