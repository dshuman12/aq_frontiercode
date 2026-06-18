import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { hasRecordExpired } from "@libs/utils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import {
  AUTH_TRANSACTIONS_TABLE,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EMAIL_CHANGE_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  OTP_SEND_LIMIT,
} from "@libs/config";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  verify_code: z.number(),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const extraScopeVerifyOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  const { verify_code: suppliedVerifyCode } = parsedEvent.data.body;
  logger.addContext("suppliedVerifyCode", suppliedVerifyCode);

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
      action: "otp_sms_verify",
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
    return apiResponse(400, { message: "Something went wrong" });
  }
  const transactionRecord = queryTransactionsTableRes.Items[0];
  const {
    onmouuid: transactionOnmouuid,
    auth_flow,
    extra_scope_flow,
    verify_code: storedVerifyCode,
    otp_sms_attempt_count,
    otp_sms_send_count,
  } = transactionRecord;

  if (!transactionOnmouuid) {
    logger.warn("Transaction does not have onmouuid");
    return apiResponse(400, { message: "Bad Request" });
  }
  logger.addContext("transactionOnmouuid", transactionOnmouuid);

  try {
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
      throw new Error("[suspicious_activity] Transaction does not have extra_scope_flow");
    }
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  try {
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW
    ) {
      throw new Error(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or ${EMAIL_CHANGE_FLOW}`,
      );
    }
    logger.addContext("extra_scope_flow", extra_scope_flow);
    logger.addContext("storedVerifyCode", storedVerifyCode);

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(
        `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
      );
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (transactionRecord.create_refresh_token) {
      throw new Error("Transaction has create_refresh_token=true");
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

    logger.addContext("otp_sms_send_count", otp_sms_send_count);
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_attempt_count");
    }

    logger.addContext("otp_sms_attempt_count", otp_sms_attempt_count);
    if (!("passcode_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_attempt_count");
    }
    if (!("passcode_verified" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_attempt_count");
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

    if (transactionRecord.passcode_attempt_count > 0) {
      throw new Error(`Transaction should have passcode_attempt_count of 0`);
    }
    if (transactionRecord.passcode_verified) {
      throw new Error("Passcode has already been verified");
    }
    if (transactionRecord.otp_sms_verified) {
      throw new Error("OTP has already been verified");
    }
    if (transactionRecord.auth_code) {
      throw new Error("Transaction already been used for an auth code");
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/extra-scope/otp/verify`) {
      throw new Error("Transaction next_endpoint does not match this endpoint");
    }
    if (otp_sms_send_count < 1) {
      throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
    }
    if (otp_sms_send_count > OTP_SEND_LIMIT) {
      throw new Error(`Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`);
    }
    if (otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(
        `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
      );
    }
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  if (hasRecordExpired(transactionRecord.otp_sms_expiry_time)) {
    logger.warn("OTP has expired");

    // otp send limit reached -> restart auth flow
    if (otp_sms_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }

      return apiResponse(422, {
        error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
        next_endpoint: "authorize/extra-scope",
      });
    }
    // otp send limit not yet reached -> resend
    else {
      const otp_resend_endpoint = `${transaction_id}/extra-scope/otp/resend`;
      try {
        await updateItemMethod({
          TableName: AUTH_TRANSACTIONS_TABLE,
          Key: { transaction_id },
          UpdateExpression: "set next_endpoint = :next_endpoint",
          ExpressionAttributeValues: { ":next_endpoint": otp_resend_endpoint },
        });
      } catch (error: any) {
        throw new Error(`Error updating transaction: ${error?.message || error}`);
      }

      return apiResponse(422, {
        error_code: OTP_EXPIRED_RESEND,
        next_endpoint: otp_resend_endpoint,
      });
    }
  }

  const new_otp_sms_attempt_count = otp_sms_attempt_count + 1;
  logger.addContext("otp_sms_attempt_count", new_otp_sms_attempt_count);

  if (suppliedVerifyCode !== storedVerifyCode) {
    logger.warn("Supplied verify code does not match stored verify code");

    if (new_otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);

      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }

      return apiResponse(422, {
        error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
        next_endpoint: "authorize/extra-scope",
      });
    }

    const otp_verify_endpoint = `${transaction_id}/extra-scope/otp/verify`;
    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression:
          "set otp_sms_attempt_count = :otpAttemptCount, next_endpoint = :next_endpoint",
        ExpressionAttributeValues: {
          ":otpAttemptCount": new_otp_sms_attempt_count,
          ":next_endpoint": otp_verify_endpoint,
        },
      });
    } catch (error: any) {
      throw new Error(`Error updating transaction: ${error?.message || error}`);
    }
    return apiResponse(422, {
      error_code: OTP_INVALID_REATTEMPT,
      next_endpoint: otp_verify_endpoint,
    });
  }

  const nextEndpoint = `${transaction_id}/extra-scope/passcode/verify`;
  try {
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "otp_sms_attempt_count = :otpAttemptCount",
        "otp_sms_verified = :otpVerified",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":otpAttemptCount": new_otp_sms_attempt_count,
        ":otpVerified": true,
        ":nextEndpoint": nextEndpoint,
      },
    });
  } catch (error: any) {
    throw new Error(
      `Error updating transaction with otp_sms_verified=true: ${error?.message || error}`,
    );
  }

  return apiResponse(200, { next_endpoint: nextEndpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(extraScopeVerifyOTP);
