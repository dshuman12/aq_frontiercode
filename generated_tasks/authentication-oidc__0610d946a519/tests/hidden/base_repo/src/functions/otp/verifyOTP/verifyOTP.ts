import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { putItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { TransactionRecord } from "@shared-types/records";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { generateAuthCode } from "@libs/crypto";
import { OTP_AUTH_FLOW, SIXTY_SECONDS } from "@libs/constants";

type ParsedRequestBody = { onmouuid?: string; verify_code?: number };

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;

export const handler = async (event: {
  pathParameters: { transaction_id?: string };
  body: string;
}) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  try {
    const { transaction_id } = event.pathParameters;
    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });

    const { onmouuid, verify_code: suppliedVerifyCode }: ParsedRequestBody = JSON.parse(event.body);
    if (!onmouuid || !suppliedVerifyCode) {
      logger.warn("Missing required attributes in request");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ onmouuid });

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: auth_transactions_table,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${auth_transactions_table}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];
    const { auth_flow } = transactionRecord;

    if (hasRecordExpired(transactionRecord.ttl)) {
      logger.warn(
        `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (!transactionRecord.onmouuid) {
      logger.warn("Transaction does not have onmouuid");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (transactionRecord.onmouuid !== onmouuid) {
      logger.warn("[suspicious_activity] Onmouuid on transaction does not match provided one");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (!auth_flow) {
      logger.warn("[suspicious_activity] Missing auth_flow in transaction");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (auth_flow !== OTP_AUTH_FLOW) {
      logger.warn(
        `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_AUTH_FLOW}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ auth_flow });

    if (
      !transactionRecord.verify_code ||
      !transactionRecord.code_challenge ||
      !transactionRecord.scope ||
      !("otp_sms_verified" in transactionRecord)
    ) {
      logger.warn(`[suspicious_activity] Transaction missing required attributes`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (transactionRecord.otp_sms_verified) {
      logger.warn("OTP has already been verified");
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Bad Request" },
      });
    }

    if (transactionRecord.auth_code) {
      logger.warn("Transaction already been used for an auth code");
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    const {
      verify_code: storedVerifyCode,
      code_challenge,
      scope,
    } = transactionRecord as TransactionRecord;
    logger.addContext({ storedVerifyCode });

    if (suppliedVerifyCode !== storedVerifyCode) {
      logger.warn(`Supplied verify code does not match stored verify code`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Invalid OTP" } });
    }

    const authCode = generateAuthCode();
    logger.addContext({ authCode });

    try {
      await updateItemMethod({
        TableName: auth_transactions_table,
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
        TableName: auth_codes_table,
        Item: {
          auth_code: authCode,
          onmouuid,
          transaction_id,
          scope,
          code_challenge,
          ttl,
        },
      });
      logger.info(
        `Auth code record created in ${auth_codes_table} with ttl ${ttl}, returning 200 and the auth code ${authCode}`,
      );
      return formatJSONResponse({
        statusCode: 200,
        body: {
          auth_code: authCode,
          next_endpoint: `${transaction_id}/token`,
        },
      });
    } catch (error: any) {
      throw new Error(`Error creating auth code record: ${error?.message || error}`);
    }
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
