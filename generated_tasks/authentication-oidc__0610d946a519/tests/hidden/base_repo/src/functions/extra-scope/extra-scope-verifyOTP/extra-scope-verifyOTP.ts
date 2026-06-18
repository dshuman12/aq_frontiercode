import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { hasRecordExpired } from "@libs/utils";
import { formatJSONResponse } from "@libs/gatewayUtils";
import {
  AUTH_TRANSACTIONS_TABLE,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  OTP_SEND_LIMIT,
} from "@libs/constants";
import { checkRateLimit, ExtraScopeEvent, voidTransaction } from "@libs/shared";
import { ensureRequestIntegrity, ensureVerifyOTPTransactionIntegrity } from "@libs/integrity";
import { TransactionsService } from "@services/transaction/transaction";
import { getLogger } from "@libs/logger";

type HandlerEvent = {
  body: string;
} & ExtraScopeEvent;
type ParsedRequestBody = { verify_code?: number };

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  const { transaction_id } = event.pathParameters;

  const transactionService = new TransactionsService(logger);

  try {
    const requestIntegrityResponse = ensureRequestIntegrity(event, logger);
    if (!requestIntegrityResponse.ok) {
      logger.error(requestIntegrityResponse.error);
      return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
    }

    const authorizedUuid = event.requestContext.authorizer.onmouuid;
    const rateLimitResponse = await checkRateLimit(
      {
        onmouuid: authorizedUuid,
        domain: "auth_extra_scope",
        action: "otp_sms_verify",
      },
      logger,
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { verify_code: suppliedVerifyCode }: ParsedRequestBody = JSON.parse(event.body);
    if (!suppliedVerifyCode) {
      logger.warn("Missing suppliedVerifyCode in request");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ suppliedVerifyCode });

    const transactionRecord = await transactionService.transaction(transaction_id);
    if (!transactionRecord.ok) {
      logger.error(transactionRecord.error);
      return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
    }

    const {
      verify_code: storedVerifyCode,
      otp_sms_attempt_count,
      otp_sms_send_count,
      otp_sms_expiry_time,
    } = transactionRecord.data;

    const verifyOTPIntegrityResponse = ensureVerifyOTPTransactionIntegrity(
      transactionRecord.data,
      logger,
    );
    if (verifyOTPIntegrityResponse) {
      return verifyOTPIntegrityResponse;
    }

    if (hasRecordExpired(otp_sms_expiry_time)) {
      logger.warn("OTP has expired");

      // otp send limit reached -> restart auth flow
      if (otp_sms_send_count! >= OTP_SEND_LIMIT) {
        logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
        await voidTransaction(transaction_id, logger);
        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
            next_endpoint: "authorize/extra-scope",
          },
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

        return formatJSONResponse({
          statusCode: 422,
          body: { error_code: OTP_EXPIRED_RESEND, next_endpoint: otp_resend_endpoint },
        });
      }
    }

    const new_otp_sms_attempt_count = otp_sms_attempt_count! + 1;
    logger.addContext({ otp_sms_attempt_count: new_otp_sms_attempt_count });

    if (suppliedVerifyCode !== storedVerifyCode) {
      logger.warn("Supplied verify code does not match stored verify code");

      if (new_otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
        logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
        await voidTransaction(transaction_id, logger);
        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
            next_endpoint: "authorize/extra-scope",
          },
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
      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: OTP_INVALID_REATTEMPT, next_endpoint: otp_verify_endpoint },
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
    logger.info("Updated transaction with otp_verifed=true");

    return formatJSONResponse({ statusCode: 200, body: { next_endpoint: nextEndpoint } });
  } catch (error: any) {
    if (transaction_id) {
      await voidTransaction(transaction_id, logger);
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
