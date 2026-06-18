import { putItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { TransactionRecord } from "@shared-types/records";
import { generateAuthCode } from "@libs/crypto";
import {
  AUTH_CODES_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  OTP_AUTH_FLOW,
  SIXTY_SECONDS,
} from "@libs/config";
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
  onmouuid: z.string(),
  verify_code: z.number(),
});

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  body: jsonBody(bodySchema),
});

const verifyOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid, verify_code: suppliedVerifyCode } = parsedEvent.data.body;
  logger.addContext("onmouuid", onmouuid);

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
  const { auth_flow } = transactionRecord;

  if (hasRecordExpired(transactionRecord.ttl)) {
    logger.warn(
      `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  if (!transactionRecord.onmouuid) {
    logger.warn("Transaction does not have onmouuid");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (transactionRecord.onmouuid !== onmouuid) {
    logger.warn("[suspicious_activity] Onmouuid on transaction does not match provided one");
    return apiResponse(400, { message: "Bad Request" });
  }

  if (!auth_flow) {
    logger.warn("[suspicious_activity] Missing auth_flow in transaction");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (auth_flow !== OTP_AUTH_FLOW) {
    logger.warn(
      `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_AUTH_FLOW}`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  logger.addContext("auth_flow", auth_flow);

  if (
    !transactionRecord.verify_code ||
    !transactionRecord.code_challenge ||
    !transactionRecord.scope ||
    !("otp_sms_verified" in transactionRecord)
  ) {
    logger.warn(`[suspicious_activity] Transaction missing required attributes`);
    return apiResponse(400, { message: "Bad Request" });
  }

  if (transactionRecord.otp_sms_verified) {
    logger.warn("OTP has already been verified");
    return apiResponse(400, { message: "Bad Request" });
  }

  if (transactionRecord.auth_code) {
    logger.warn("Transaction already been used for an auth code");
    return apiResponse(400, { message: "Something went wrong" });
  }

  const {
    verify_code: storedVerifyCode,
    code_challenge,
    scope,
  } = transactionRecord as TransactionRecord;
  logger.addContext("storedVerifyCode", storedVerifyCode);

  if (suppliedVerifyCode !== storedVerifyCode) {
    logger.warn(`Supplied verify code does not match stored verify code`);
    return apiResponse(400, { message: "Invalid OTP" });
  }

  const authCode = generateAuthCode();
  logger.addContext("authCode", authCode);

  try {
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: "set auth_code = :auth_code, otp_sms_verified = :otp_sms_verified",
      ExpressionAttributeValues: { ":auth_code": authCode, ":otp_sms_verified": true },
    });
  } catch (error: any) {
    throw new Error(
      `Error updating transaction with auth code and otp_sms_verified=true: ${error?.message || error}`,
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
      },
    });
    return apiResponse(200, {
      auth_code: authCode,
      next_endpoint: `${transaction_id}/token`,
    });
  } catch (error: any) {
    throw new Error(`Error creating auth code record: ${error?.message || error}`);
  }
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(verifyOTP);
