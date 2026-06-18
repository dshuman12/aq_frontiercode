import { queryTableMethod, deleteItemMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { apiResponse, ApiResponse } from "@onmoapp/handler-middleware";
import { hasRecordExpired } from "@libs/utils";
import { OTP_EXPIRED_RESEND, OTP_EXPIRED_SEND_LIMIT_REACHED, OTP_SEND_LIMIT } from "@libs/config";
import { OTP_PASSCODE_OTP_RESEND } from "../otp-passcode.constants";
import { logger } from "@onmoapp/logger";

// Extract types from RecordActionInput to ensure type safety
type RecordActionInput = Parameters<RateLimiter["recordAction"]>[0];

type GetTransactionByIdParams = {
  transaction_id: string;
  auth_transactions_table: string;
};

export async function getTransactionById({
  transaction_id,
  auth_transactions_table,
}: GetTransactionByIdParams): Promise<Record<string, any>> {
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": transaction_id },
  });

  if (!queryTransactionsTableRes?.Items?.length) {
    logger.warn(`No transaction found in ${auth_transactions_table}`);
    throw new Error("Transaction not found");
  }

  return queryTransactionsTableRes.Items[0];
}

type CheckAndRecordRateLimitParams = RecordActionInput;

export async function checkAndRecordRateLimit({
  onmouuid,
  action,
  domain,
}: CheckAndRecordRateLimitParams): Promise<ApiResponse | null> {
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
      domain,
      action,
    } as RecordActionInput);
    return null;
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }
}

type HandleExpiredOTPParams = {
  transactionRecord: Record<string, any>;
  transaction_id: string;
  auth_transactions_table: string;
};

export async function handleExpiredOTP({
  transactionRecord,
  transaction_id,
  auth_transactions_table,
}: HandleExpiredOTPParams): Promise<ApiResponse | null> {
  if (!hasRecordExpired(transactionRecord.otp_sms_expiry_time)) {
    return null;
  }

  logger.warn("OTP has expired");

  const otp_sms_send_count = transactionRecord.otp_sms_send_count;

  // otp send limit reached -> restart auth flow
  if (otp_sms_send_count >= OTP_SEND_LIMIT) {
    logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

    try {
      await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
    } catch (error: any) {
      logger.error(`Failed to void transaction: ${error?.message || error}`);
    }

    return apiResponse(422, {
      error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
      next_endpoint: "authorize/otp-passcode",
    });
  }

  // otp send limit not yet reached -> resend
  const otp_resend_endpoint = `${transaction_id}/${OTP_PASSCODE_OTP_RESEND}`;
  try {
    await updateItemMethod({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: "set next_endpoint = :next_endpoint",
      ExpressionAttributeValues: { ":next_endpoint": otp_resend_endpoint },
    });
  } catch (error: any) {
    throw new Error(`Error updating transaction: ${error?.message || error}`);
  }

  return apiResponse(422, { error_code: OTP_EXPIRED_RESEND, next_endpoint: otp_resend_endpoint });
}
