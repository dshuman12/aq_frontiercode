import {
  deleteItemMethod,
  putItemMethod,
  queryTableMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import {
  AUTH_CODES_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  PASSCODE_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  SIXTY_SECONDS,
  OTP_ATTEMPT_LIMIT,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EXTRA_SCOPE_PASSCODE_FLOW,
  EMAIL_CHANGE_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/config";
import { generateAuthCode } from "@libs/crypto";
import { verifyHashedPasscode } from "@libs/passcode";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

const bodySchema = z.object({
  passcode: z.string(),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const extraScopeVerifyPasscode = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  const { passcode: suppliedPasscode } = parsedEvent.data.body;
  if (!/^\d+$/.test(suppliedPasscode)) {
    logger.warn("Supplied passcode contains non-numeric characters");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (suppliedPasscode.length !== 6) {
    logger.warn(`Supplied passcode should be 6 digits but has ${suppliedPasscode.length}`);
    return apiResponse(400, { message: "Bad Request" });
  }

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
      action: "passcode_verify",
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.RATE_LIMIT_SERVICE_ERROR);
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
    passcode_attempt_count,
    scope,
    code_challenge,
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
      throw new Error("[suspicious_activity] Transaction does not have extra_scope_flow");
    }
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EXTRA_SCOPE_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW &&
      extra_scope_flow !== PHONE_NUMBER_CHANGE_FLOW
    ) {
      throw new Error(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or: ${EXTRA_SCOPE_PASSCODE_FLOW} or: ${EMAIL_CHANGE_FLOW} or: ${PHONE_NUMBER_CHANGE_FLOW}`,
      );
    }
    logger.addContext("extra_scope_flow", extra_scope_flow);

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
    if (!("passcode_verified" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_verified");
    }
    if (!("passcode_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_attempt_count");
    }

    logger.addContext("passcode_attempt_count", passcode_attempt_count);

    if (!transactionRecord.code_challenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    if (!transactionRecord.scope) {
      throw new Error("Transaction does not have scope");
    }
    if (!transactionRecord.device_id) {
      throw new Error("Transaction does not have device_id");
    }

    if (transactionRecord.auth_code) {
      throw new Error("Transaction already been used for an auth code");
    }
    if (transactionRecord.passcode_verified) {
      throw new Error("Passcode has already been verified");
    }
    if (passcode_attempt_count >= PASSCODE_ATTEMPT_LIMIT) {
      throw new Error(
        `Transaction has already reached total passcode attempt limit of ${PASSCODE_ATTEMPT_LIMIT}`,
      );
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/extra-scope/passcode/verify`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/extra-scope/passcode/verify, but received: ${transactionRecord.next_endpoint}`,
      );
    }

    if (extra_scope_flow === EXTRA_SCOPE_OTP_PASSCODE_FLOW) {
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
      if (transactionRecord.otp_sms_send_count < 1) {
        throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
      }
      if (transactionRecord.otp_sms_send_count > OTP_SEND_LIMIT) {
        throw new Error(
          `Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`,
        );
      }
      if (transactionRecord.otp_sms_attempt_count > OTP_ATTEMPT_LIMIT) {
        throw new Error(
          `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
        );
      }
      if (!transactionRecord.otp_sms_verified) {
        throw new Error("OTP has not been verified");
      }
    }

    if (extra_scope_flow === EXTRA_SCOPE_PASSCODE_FLOW) {
      if (transactionRecord.phone_number) {
        throw new Error("Transaction has phone_number, not expected");
      }
      if (transactionRecord.verify_code) {
        throw new Error("Transaction has verify_code, not expected");
      }
      if ("otp_sms_verified" in transactionRecord) {
        throw new Error("Transaction has otp_sms_verified, not expected");
      }
      if ("otp_sms_expiry_time" in transactionRecord) {
        throw new Error("Transaction has otp_sms_expiry_time, not expected");
      }
      if ("otp_sms_send_count" in transactionRecord) {
        throw new Error("Transaction has otp_sms_send_count, not expected");
      }
      if ("otp_sms_attempt_count" in transactionRecord) {
        throw new Error("Transaction has otp_sms_attempt_count, not expected");
      }
    }
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  const new_passcode_attempt_count = passcode_attempt_count + 1;
  logger.addContext("passcode_attempt_count", new_passcode_attempt_count);

  const passcodesMatch = await verifyHashedPasscode({
    passcode: suppliedPasscode,
    onmouuid: transactionOnmouuid,
  });

  if (!passcodesMatch) {
    logger.warn("Supplied passcode does not match stored passcode");

    if (new_passcode_attempt_count >= PASSCODE_ATTEMPT_LIMIT) {
      logger.warn(
        `Transaction has reached total passcode attempt limit of ${PASSCODE_ATTEMPT_LIMIT}`,
      );

      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }

      return apiResponse(422, {
        error_code: PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
        next_endpoint: `authorize/extra-scope`,
      });
    }

    const passcode_verify_endpoint = `${transaction_id}/extra-scope/passcode/verify`;
    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression:
          "set passcode_attempt_count = :passcodeAttemptCount, next_endpoint = :nextEndpoint",
        ExpressionAttributeValues: {
          ":passcodeAttemptCount": new_passcode_attempt_count,
          ":nextEndpoint": passcode_verify_endpoint,
        },
      });
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
      throw new Error(`Error updating transaction: ${error?.message || error}`);
    }
    return apiResponse(422, {
      error_code: PASSCODE_INVALID_REATTEMPT,
      next_endpoint: passcode_verify_endpoint,
    });
  }

  const token_endpoint = "token";
  const authCode = generateAuthCode();
  logger.addContext("authCode", authCode);

  try {
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "auth_code = :authCode",
        "passcode_attempt_count = :passcodeAttemptCount",
        "passcode_verified = :passcodeVerified",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":authCode": authCode,
        ":passcodeAttemptCount": new_passcode_attempt_count,
        ":passcodeVerified": true,
        ":nextEndpoint": token_endpoint,
      },
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(
      `Error updating transaction with auth code and passcode_verified=true: ${error?.message || error}`,
    );
  }

  const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
  try {
    await putItemMethod({
      TableName: AUTH_CODES_TABLE,
      Item: {
        auth_code: authCode,
        onmouuid: transactionOnmouuid,
        transaction_id,
        scope,
        code_challenge,
        create_refresh_token: false,
        ttl,
      },
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(`Error creating auth code record: ${error?.message || error}`);
  }

  return apiResponse(200, { auth_code: authCode, next_endpoint: "token" });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(extraScopeVerifyPasscode);
