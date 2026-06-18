import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  FIVE_MINUTES,
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/config";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { generateVerifyCode } from "@libs/sms";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
});

const emailChangeEmailResend = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);
  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

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

  const { onmouuid, auth_flow, extra_scope_flow, new_email } = transactionRecord;
  if (!onmouuid) {
    throw new Error("Transaction does not have onmouuid");
  }
  logger.addContext("onmouuid", onmouuid);

  if (onmouuid !== authOnmouuid) {
    logger.warn(
      `[suspicious_activity] User ownership validation failed. Transaction onmouuid: ${onmouuid}, Auth onmouuid: ${authOnmouuid}`,
    );
    return apiResponse(401, { message: "Unauthorized" });
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
      domain: "auth_extra_scope",
      action: "authorize",
    });
  } catch (error: any) {
    logger.error(`Rate limit error: ${serializeError(error)}`);
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  if (!auth_flow) {
    throw new Error("[suspicious_activity] Transaction does not have auth_flow");
  }

  const isValidEmailChangeTransaction =
    (auth_flow === EXTRA_SCOPE_AUTH_FLOW && extra_scope_flow === EMAIL_CHANGE_FLOW) ||
    auth_flow === "email_change";

  if (!isValidEmailChangeTransaction) {
    logger.error(
      `[suspicious_activity] Invalid transaction for email resend. auth_flow: ${auth_flow}, extra_scope_flow: ${extra_scope_flow}`,
    );
    return apiResponse(400, { message: "Something went wrong" });
  }

  logger.addContext("auth_flow", auth_flow);
  logger.addContext("extra_scope_flow", extra_scope_flow);

  if (hasRecordExpired(transactionRecord.ttl)) {
    logger.warn(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    return apiResponse(400, { message: "Something went wrong" });
  }

  const { next_endpoint } = transactionRecord;

  if (!new_email) {
    throw new Error("Transaction does not have new_email");
  }
  logger.addContext("new_email", new_email);

  if (next_endpoint !== `${transaction_id}/email-change/redirect`) {
    logger.error(
      `Invalid next endpoint. Expected: ${transaction_id}/email-change/redirect, received: ${next_endpoint}`,
    );
    return apiResponse(400, {
      message: "Something went wrong",
    });
  }

  if (!transactionRecord.first_name) {
    throw new Error("Transaction missing first_name");
  }
  const { first_name } = transactionRecord;

  const email_validation_attempt_count = transactionRecord.email_validation_attempt_count ?? 0;
  const email_validation_send_count = transactionRecord.email_validation_send_count ?? 0;

  if (email_validation_attempt_count >= OTP_ATTEMPT_LIMIT) {
    throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
  }

  if (email_validation_send_count >= OTP_SEND_LIMIT) {
    logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
    return apiResponse(422, {
      error_code: OTP_SEND_LIMIT_REACHED,
      next_endpoint: "authorize/email-change",
    });
  }

  logger.addContext("email_validation_send_count", email_validation_send_count);

  const { SecretString } = await getSecret(`sendgrid_prod`);
  if (!SecretString) {
    throw new Error("Sendgrid secrets string is undefined");
  }

  const { ApiKey, EmailChangeTemplateId } = JSON.parse(SecretString);
  if (!ApiKey) {
    throw new Error("Missing sendgrid API key");
  }
  if (!EmailChangeTemplateId) {
    throw new Error("Missing sendgrid email change template ID");
  }

  const isTestEmail = checkIfTestEmail(new_email);
  const verifyCode = isTestEmail ? 1111 : generateVerifyCode();

  const emailExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
  const nextEndpoint = `${transaction_id}/email-change/redirect`;

  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "verify_code = :verifyCode",
      "email_validation_expiry_time = :emailExpiryTime",
      "email_validation_send_count = :emailSendCount",
      "email_validation_attempt_count = :emailAttemptCount",
      "next_endpoint = :nextEndpoint",
    ].join(", ")}`,
    ExpressionAttributeValues: {
      ":verifyCode": verifyCode,
      ":emailExpiryTime": emailExpiryTime,
      ":emailSendCount": email_validation_send_count + 1,
      ":emailAttemptCount": 0,
      ":nextEndpoint": nextEndpoint,
    },
  });

  if (!isTestEmail) {
    await sendEmail({
      api_key: ApiKey,
      template_id: EmailChangeTemplateId,
      email_address: new_email,
      first_name,
      transaction_id,
      verify_code: verifyCode,
    });
  }

  return apiResponse(200, {
    message: "Verification email resent successfully",
    next_endpoint: nextEndpoint,
    email: new_email,
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(emailChangeEmailResend);
