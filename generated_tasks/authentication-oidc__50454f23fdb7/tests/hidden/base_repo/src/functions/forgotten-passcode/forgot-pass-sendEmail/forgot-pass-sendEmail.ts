import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  FIVE_MINUTES,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
} from "@libs/config";
import { generateVerifyCode } from "@libs/sms";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
});

const forgotPassSendEmail = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": transaction_id },
  });
  if (!queryTransactionsTableRes?.Items?.length) {
    logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
    return apiResponse(400, { message: "Something went wrong" });
  }
  const transactionRecord = queryTransactionsTableRes.Items[0];
  const { onmouuid, auth_flow } = transactionRecord;
  if (!onmouuid) {
    throw new Error("Transaction does not have onmouuid");
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
      domain: "auth_forgotten_passcode",
      action: "otp_email_send",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  if (!auth_flow) {
    throw new Error("Transaction does not have auth_flow");
  }
  if (
    auth_flow !== FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW &&
    auth_flow !== FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW
  ) {
    throw new Error(
      `Transaction auth_flow: ${auth_flow}, expected ${FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW} or ${FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW}`,
    );
  }
  logger.addContext("auth_flow", auth_flow);

  if (hasRecordExpired(transactionRecord.ttl)) {
    throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
  }
  if (!transactionRecord.next_endpoint) {
    throw new Error("Transaction does not have next_endpoint");
  }
  if (transactionRecord.create_refresh_token) {
    throw new Error("Transaction has create_refresh_token=true");
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

  if (!transactionRecord.otp_sms_verified) {
    throw new Error("SMS OTP is not verified");
  }
  if (!("otp_email_send_count" in transactionRecord)) {
    throw new Error("Transaction missing otp_sms_send_count");
  }
  const { otp_email_send_count } = transactionRecord;
  if (otp_email_send_count !== 0) {
    throw new Error(
      `Transaction otp_email_send_count should be > 0 but is ${otp_email_send_count}`,
    );
  }
  if (!("otp_email_attempt_count" in transactionRecord)) {
    throw new Error("Transaction missing otp_email_attempt_count");
  }
  const { otp_email_attempt_count } = transactionRecord;
  if (otp_email_attempt_count !== 0) {
    throw new Error(
      `Transaction otp_email_attempt_count should be 0 but is ${otp_email_attempt_count}`,
    );
  }
  if ("otp_email_expiry_time" in transactionRecord) {
    throw new Error(`otp_email_expiry_time in transaction`);
  }
  if (transactionRecord.otp_email_attempt_count > 0) {
    throw new Error(`Transaction should have otp_email_attempt_count of 0`);
  }
  if (transactionRecord.otp_email_verified) {
    throw new Error("Email OTP has already been verified");
  }

  if (!transactionRecord.phone_number) {
    throw new Error("Transaction missing phone_number");
  }
  const { phone_number } = transactionRecord;
  logger.addContext("phone_number", phone_number);
  if (!transactionRecord.email_address) {
    throw new Error("Transaction missing email_address");
  }
  const { email_address } = transactionRecord;
  logger.addContext("email_address", email_address);
  if (!transactionRecord.first_name) {
    throw new Error("Transaction missing first_name");
  }
  const { first_name } = transactionRecord;

  if (transactionRecord.auth_code) {
    throw new Error("Transaction already been used for an auth code");
  }

  if (transactionRecord.next_endpoint !== `${transaction_id}/forgotten-passcode/email/send`) {
    throw new Error(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/forgotten-passcode/email/send, but received: ${transactionRecord.next_endpoint}`,
    );
  }

  const { SecretString } = await getSecret(`sendgrid_prod`);
  if (!SecretString) {
    throw new Error("Sendgrid secrets string is undefined");
  }
  const { ApiKey, ChangePasscodeTemplateId } = JSON.parse(SecretString);
  if (!ApiKey) {
    throw new Error("Missing sendgrid API key");
  }
  if (!ChangePasscodeTemplateId) {
    throw new Error("Missing sendgrid change passcode template ID");
  }

  const isTestEmail = checkIfTestEmail(email_address);
  const verifyCode = isTestEmail ? 1111 : generateVerifyCode();

  const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
  const next_endpoint = `${transaction_id}/forgotten-passcode/email/verify`;

  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "phone_number = :phoneNumber",
      "verify_code = :verifyCode",
      "otp_email_expiry_time = :otpExpiryTime",
      "otp_email_send_count = :otpSendCount",
      "next_endpoint = :nextEndpoint",
    ].join(", ")}`,
    ExpressionAttributeValues: {
      ":phoneNumber": phone_number,
      ":verifyCode": verifyCode,
      ":otpExpiryTime": otpExpiryTime,
      ":otpSendCount": otp_email_send_count + 1, // 0 + 1
      ":nextEndpoint": next_endpoint,
    },
  });

  if (!isTestEmail) {
    await sendEmail({
      api_key: ApiKey,
      template_id: ChangePasscodeTemplateId,
      email_address,
      first_name,
      transaction_id,
      verify_code: verifyCode,
    });
  }

  return apiResponse(200, { message: "OTP sent successfully", next_endpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(forgotPassSendEmail);
