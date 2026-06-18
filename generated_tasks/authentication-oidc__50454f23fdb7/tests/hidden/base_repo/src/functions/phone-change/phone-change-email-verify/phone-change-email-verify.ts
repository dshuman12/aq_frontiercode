import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
  EXTRA_SCOPE_AUTH_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/config";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  verify_code: z.union([z.string(), z.number()]),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({
      onmouuid: z.string(),
      scope: z.string(),
    }),
  }),
  body: jsonBody(bodySchema),
});

const phoneChangeEmailVerify = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { verify_code } = parsedEvent.data.body;
  logger.addContext("verify_code", verify_code);

  const { onmouuid: authOnmouuid, scope: authScope } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  if (!authScope.includes(AUTH_SERVICES_SCOPE)) {
    logger.warn(`Invalid scope: ${authScope}, expected ${AUTH_SERVICES_SCOPE}`);
    return apiResponse(401, { message: "Unauthorized" });
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
  const { onmouuid, auth_flow, extra_scope_flow, new_phone_number, next_endpoint } =
    transactionRecord;
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
      domain: "auth_extra_scope",
      action: "authorize",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  if (!auth_flow) {
    throw new Error("Transaction does not have auth_flow");
  }
  if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW) {
    throw new Error(`Transaction auth_flow: ${auth_flow}, expected ${EXTRA_SCOPE_AUTH_FLOW}`);
  }
  logger.addContext("auth_flow", auth_flow);

  if (!extra_scope_flow || extra_scope_flow !== PHONE_NUMBER_CHANGE_FLOW) {
    throw new Error(
      `Transaction extra_scope_flow: ${extra_scope_flow}, expected ${PHONE_NUMBER_CHANGE_FLOW}`,
    );
  }

  if (hasRecordExpired(transactionRecord.ttl)) {
    throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
  }

  if (!next_endpoint) {
    throw new Error("Transaction does not have next_endpoint");
  }

  if (next_endpoint !== `${transaction_id}/phone-change/email/verify`) {
    logger.warn(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/phone-change/email/verify, but received: ${next_endpoint}`,
    );
    return apiResponse(400, { message: "Something went wrong" });
  }

  if (!transactionRecord.verify_code) {
    throw new Error("Transaction does not have verify_code");
  }
  const { verify_code: storedVerifyCode } = transactionRecord;
  logger.addContext("storedVerifyCode", storedVerifyCode);

  if (!transactionRecord.email_validation_expiry_time) {
    throw new Error("Transaction does not have email_validation_expiry_time");
  }

  const { email_validation_expiry_time } = transactionRecord;
  const currentTime = getCurrentTimestampInSeconds();

  if (currentTime > email_validation_expiry_time) {
    throw new Error("Verification code has expired");
  }

  if (!new_phone_number) {
    throw new Error("Transaction does not have new_phone_number");
  }
  logger.addContext("new_phone_number", new_phone_number);

  if (transactionRecord.email_validation_status === "VALIDATED") {
    throw new Error("Email has already been validated");
  }

  if (verify_code.toString() !== storedVerifyCode.toString()) {
    logger.warn("Incorrect verification code provided");
    return apiResponse(400, { message: "Incorrect verification code" });
  }

  // Email verified - update transaction record and set up next step for passcode verification
  const next_endpoint_passcode = `${transaction_id}/extra-scope/passcode/verify`;

  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "email_validation_status = :validationStatus",
      "verification_steps_completed = list_append(if_not_exists(verification_steps_completed, :emptyList), :emailStep)",
      "next_endpoint = :nextEndpoint",
      "email_validation_verified_time = :verifiedTime",
    ].join(", ")} remove verify_code`,
    ExpressionAttributeValues: {
      ":validationStatus": "VALIDATED",
      ":emptyList": [],
      ":emailStep": ["EMAIL_VALIDATED"],
      ":nextEndpoint": next_endpoint_passcode,
      ":verifiedTime": currentTime,
    },
  });

  return apiResponse(200, {
    message: "Email verification successful",
    next_endpoint: next_endpoint_passcode,
    new_phone_number,
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(phoneChangeEmailVerify);
