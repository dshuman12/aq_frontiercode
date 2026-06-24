import {
  AUTH_TRANSACTIONS_TABLE,
  EMAIL_CHANGE_FLOW,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  FIVE_MINUTES,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/config";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { checkIfTestNumber, generateOTPMessageBody, generateVerifyCode, sendSMS } from "@libs/sms";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
});

const extraScopeResendOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

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
      domain: "auth_extra_scope",
      action: "otp_sms_send",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
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
  const {
    onmouuid: transactionOnmouuid,
    auth_flow,
    extra_scope_flow,
    phone_number,
  } = transactionRecord;

  try {
    if (!transactionOnmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext("transactionOnmouuid", transactionOnmouuid);

    if (transactionOnmouuid !== authOnmouuid) {
      throw new Error(
        "[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid",
      );
    }

    if (!auth_flow) {
      throw new Error("[suspicious_activity] Transaction does not have auth_flow");
    }
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW) {
      throw new Error(
        `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${EXTRA_SCOPE_AUTH_FLOW}`,
      );
    }
    logger.addContext("auth_flow", auth_flow);
    if (!extra_scope_flow) {
      throw new Error("Transaction does not have extra_scope_flow");
    }
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW
    ) {
      throw new Error(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or ${EMAIL_CHANGE_FLOW}`,
      );
    }
    logger.addContext("extra_scope_flow", extra_scope_flow);

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    const { next_endpoint } = transactionRecord;
    if (transactionRecord.create_refresh_token) {
      throw new Error("Transaction has create_refresh_token=true");
    }

    if (!transactionRecord.phone_number) {
      throw new Error("Transaction does not have phone_number");
    }
    logger.addContext("phone_number", phone_number);
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

    if (!transactionRecord.code_challenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    if (!transactionRecord.scope) {
      throw new Error("Transaction does not have scope");
    }
    if (!transactionRecord.device_id) {
      throw new Error("Transaction does not have device_id");
    }
    if ("auth_code" in transactionRecord) {
      throw new Error(`auth_code in transaction`);
    }
    if (transactionRecord.otp_sms_verified) {
      throw new Error("OTP has already been verified");
    }

    if (next_endpoint === `${transaction_id}/extra-scope/otp/verify`) {
      // Resend OTP reason: failed verify OTP attempt
    } //
    else if (next_endpoint === `${transaction_id}/extra-scope/otp/resend`) {
      // Resend OTP reason: OTP expired or manually requested to resend
    } //
    else {
      throw new Error(
        `Expected transaction next_endpoint of ${transaction_id}/extra-scope/otp/verify or ${transaction_id}/extra-scope/otp/resend, but received: ${next_endpoint}`,
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
      next_endpoint: "authorize/extra-scope",
    });
  }
  const { otp_sms_send_count } = transactionRecord;
  logger.addContext("otp_sms_send_count", otp_sms_send_count);

  const isTestNumber = checkIfTestNumber(phone_number);
  const verifyCode = isTestNumber ? 1111 : generateVerifyCode();

  if (!isTestNumber) {
    try {
      await sendSMS({
        phoneNumber: phone_number,
        messageBody: generateOTPMessageBody(verifyCode, ENV),
      });
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
  const nextEndpoint = `${transaction_id}/extra-scope/otp/verify`;

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
      ":nextEndpoint": nextEndpoint,
    },
  });

  return apiResponse(200, { message: "OTP resent successfully", next_endpoint: nextEndpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(extraScopeResendOTP);
