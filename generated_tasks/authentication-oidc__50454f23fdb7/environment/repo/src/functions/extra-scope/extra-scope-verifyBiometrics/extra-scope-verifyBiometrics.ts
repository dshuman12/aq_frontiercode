import { putItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
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
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_BIOMETRICS_FLOW,
  SIXTY_SECONDS,
} from "@libs/config";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { createVerify } from "crypto";
import { generateAuthCode } from "@libs/crypto";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

const bodySchema = z.object({
  signed_challenge: z.string(),
  device_id: z.string(),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const extraScopeVerifyBiometrics = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }

  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  const { signed_challenge, device_id } = parsedEvent.data.body;

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
      action: "biometrics_verify",
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
  const { onmouuid: transactionOnmouuid, auth_flow, extra_scope_flow } = transactionRecord;
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
  if (extra_scope_flow !== EXTRA_SCOPE_BIOMETRICS_FLOW) {
    throw new Error(
      `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_BIOMETRICS_FLOW}`,
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
  if (!transactionRecord.code_challenge) {
    throw new Error("Transaction does not have code_challenge");
  }
  if (!transactionRecord.scope) {
    throw new Error("Transaction does not have scope");
  }
  if (!transactionRecord.device_id) {
    throw new Error("Transaction does not have device_id");
  }
  if (!transactionRecord.unsigned_challenge) {
    throw new Error("Transaction missing unsigned_challenge");
  }
  if (!transactionRecord.fe_public_key) {
    throw new Error("Transaction missing fe_public_key");
  }

  if (transactionRecord.auth_code) {
    throw new Error("Transaction already been used for an auth code");
  }
  if (transactionRecord.biometrics_verified) {
    throw new Error("Biometrics has already been verified");
  }

  if (device_id !== transactionRecord.device_id) {
    throw new Error("Supplied device_id does not match transaction device_id");
  }
  if (transactionRecord.next_endpoint !== `${transaction_id}/extra-scope/biometrics/verify`) {
    throw new Error(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/extra-scope/biometrics/verify, but received: ${transactionRecord.next_endpoint}`,
    );
  }
  const { scope, code_challenge, unsigned_challenge, fe_public_key } = transactionRecord;

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

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(
  extraScopeVerifyBiometrics,
);
