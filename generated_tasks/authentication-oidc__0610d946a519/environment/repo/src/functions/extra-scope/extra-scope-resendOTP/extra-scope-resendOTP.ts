import {
  AUTH_TRANSACTIONS_TABLE,
  FIVE_MINUTES,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/constants";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { checkIfTestNumber, generateVerifyCode } from "@libs/sms";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { checkRateLimit, ExtraScopeEvent, sendOTP, voidTransaction } from "@libs/shared";
import { ensureRequestIntegrity, ensureResendOTPTransactionIntegrity } from "@libs/integrity";
import { TransactionsService } from "@services/transaction/transaction";
import { toHttpResponse } from "@onmoapp/core-banking";
import { getLogger } from "@libs/logger";

export const handler = async (event: ExtraScopeEvent) => {
  const logger = getLogger();

  const transactionService = new TransactionsService(logger);

  const requestIntegrityResponse = ensureRequestIntegrity(event, logger);
  if (!requestIntegrityResponse.ok) {
    return toHttpResponse(requestIntegrityResponse);
  }
  const { transactionId, authorizedUuid } = requestIntegrityResponse.data;

  try {
    const rateLimitResponse = await checkRateLimit(
      {
        onmouuid: authorizedUuid,
        domain: "auth_extra_scope",
        action: "otp_sms_send",
      },
      logger,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const transactionRecord = await transactionService.transaction(transactionId);
    if (!transactionRecord.ok) return toHttpResponse(transactionRecord);

    const { phone_number, otp_sms_send_count } = transactionRecord.data;

    const resendOTPIntegrityResponse = ensureResendOTPTransactionIntegrity(
      transactionRecord.data,
      transactionId,
      logger,
    );
    if (resendOTPIntegrityResponse) {
      await voidTransaction(transactionId, logger);
      return resendOTPIntegrityResponse;
    }

    if (otp_sms_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
      await voidTransaction(transactionId, logger);
      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: OTP_SEND_LIMIT_REACHED, next_endpoint: "authorize/extra-scope" },
      });
    }

    logger.addContext({ otp_sms_send_count });

    const isTestNumber = checkIfTestNumber(phone_number);
    const verifyCode = isTestNumber ? 1111 : generateVerifyCode();
    if (!isTestNumber) {
      const response = await sendOTP(phone_number, verifyCode, logger);
      if (response) {
        return response;
      }
    }

    const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
    const nextEndpoint = `${transactionId}/extra-scope/otp/verify`;

    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id: transactionId },
      UpdateExpression: `set ${[
        "verify_code = :verifyCode",
        "otp_sms_expiry_time = :otpExpiryTime",
        "otp_sms_send_count = :otpSendCount",
        "otp_sms_attempt_count = :otpAttemptCount",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":verifyCode": verifyCode,
        ":otpExpiryTime": otpExpiryTime,
        ":otpSendCount": otp_sms_send_count + 1,
        ":otpAttemptCount": 0,
        ":nextEndpoint": nextEndpoint,
      },
    });
    logger.info(`Updated transaction, returning 200`);

    return formatJSONResponse({
      statusCode: 200,
      body: { message: "OTP resent successfully", next_endpoint: nextEndpoint },
    });
  } catch (error: any) {
    if (transactionId) {
      await voidTransaction(transactionId, logger);
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
