import { putItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
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
  BIOMETRICS_AUTH_FLOW,
  SIXTY_SECONDS,
} from "@libs/config";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { createVerify } from "crypto";
import { generateAuthCode } from "@libs/crypto";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

const bodySchema = z.object({
  device_id: z.string(),
  signed_challenge: z.string(),
});
const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  body: jsonBody(bodySchema),
});

const biometricsVerify = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { signed_challenge, device_id } = parsedEvent.data.body;

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
      domain: "auth_login",
      action: "biometrics_verify",
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.RATE_LIMIT_SERVICE_ERROR);
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  if (!auth_flow) {
    throw new Error("Transaction does not have auth_flow");
  }
  if (auth_flow !== BIOMETRICS_AUTH_FLOW) {
    throw new Error(`Transaction auth_flow: ${auth_flow}, expected: ${BIOMETRICS_AUTH_FLOW}`);
  }
  logger.addContext("auth_flow", auth_flow);

  if (hasRecordExpired(transactionRecord.ttl)) {
    throw new Error(
      `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
    );
  }
  if (!transactionRecord.next_endpoint) {
    throw new Error("Transaction does not have next_endpoint");
  }
  if (!("create_refresh_token" in transactionRecord)) {
    throw new Error("Transaction does not have create_refresh_token");
  }
  if (!transactionRecord.create_refresh_token) {
    throw new Error("Transaction not marked with create_refresh_token=true");
  }
  if (!transactionRecord.unsigned_challenge) {
    throw new Error("Transaction missing unsigned_challenge");
  }
  if (!transactionRecord.fe_public_key) {
    throw new Error("Transaction missing fe_public_key");
  }

  if (
    !transactionRecord.code_challenge ||
    !transactionRecord.scope ||
    !transactionRecord.device_id
  ) {
    throw new Error(`Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`);
  }
  const { scope, code_challenge, unsigned_challenge, fe_public_key } = transactionRecord;
  if (transactionRecord.auth_code) {
    throw new Error("Transaction already been used for an auth code");
  }
  if (transactionRecord.biometrics_verified) {
    throw new Error("Biometrics has already been verified");
  }
  if (device_id !== transactionRecord.device_id) {
    throw new Error("Supplied device_id does not match transaction device_id");
  }

  if (transactionRecord.next_endpoint !== `${transaction_id}/biometrics/verify`) {
    throw new Error(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/otp-passcode/passcode/verify, but received: ${transactionRecord.next_endpoint}`,
    );
  }

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(unsigned_challenge);

    const isVerified = verifier.verify(
      `-----BEGIN PUBLIC KEY-----\n${fe_public_key}\n-----END PUBLIC KEY-----`,
      signed_challenge,
      "base64",
    );
    if (!isVerified) {
      throw new Error("Supplied challenge does not match stored challenge");
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.BIOMETRICS_VERIFICATION_ERROR);
    throw new Error(`Failed to verify supplied challenge: ${error?.message || error}`);
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
        "biometrics_verified = :biometricsVerified",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":authCode": authCode,
        ":biometricsVerified": true,
        ":nextEndpoint": token_endpoint,
      },
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(
      `Error updating transaction with auth code and biometrics_verified=true: ${error?.message || error}`,
    );
  }

  const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
  try {
    await putItemMethod({
      TableName: AUTH_CODES_TABLE,
      Item: {
        auth_code: authCode,
        onmouuid,
        transaction_id,
        scope,
        code_challenge,
        ttl,
        create_refresh_token: transactionRecord.create_refresh_token,
      },
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(`Error creating auth code record: ${error?.message || error}`);
  }

  return apiResponse(200, { auth_code: authCode, next_endpoint: "token" });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(biometricsVerify);
