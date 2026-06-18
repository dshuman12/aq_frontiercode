import { AUTH_TRANSACTIONS_TABLE, ENV, FIVE_MINUTES } from "@libs/constants";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { checkIfTestNumber, generateOTPMessageBody, generateVerifyCode, sendSMS } from "@libs/sms";
import { TransactionsService } from "@services/transaction/transaction";
import { LMSFailure, toHttpResponse } from "@onmoapp/core-banking";
import { UserRecordsService } from "@services/user/user";
import { getLogger } from "@libs/logger";
import {
  ensureBaseTransactionIntegrity,
  ensureRequestIntegrity,
  ensureSendOTPTransactionIntegrity,
} from "@libs/integrity";
import { checkRateLimit, ExtraScopeEvent, voidTransaction } from "@libs/shared";

export const handler = async (event: ExtraScopeEvent) => {
  const logger = getLogger();

  const requestIntegrityResponse = ensureRequestIntegrity(event, logger);
  if (!requestIntegrityResponse.ok) {
    return toHttpResponse(requestIntegrityResponse);
  }

  const { transactionId, authorizedUuid } = requestIntegrityResponse.data;

  try {
    const rateLimitResponse = await checkRateLimit(
      { onmouuid: authorizedUuid, action: "otp_sms_send", domain: "auth_extra_scope" },
      logger,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const transactionsService = new TransactionsService(logger);

    const transactionRecord = await transactionsService.transaction(transactionId);
    if (!transactionRecord.ok) {
      return toHttpResponse(transactionRecord);
    }

    const { onmouuid: transactionOnmouuid, otp_sms_send_count } = transactionRecord.data;
    logger.addContext({ transactionOnmouuid });

    const nextEndpoint = `${transactionId}/extra-scope/otp/send`;
    const baseIntegrityResponse = ensureBaseTransactionIntegrity(
      transactionRecord,
      nextEndpoint,
      authorizedUuid,
      logger,
      {},
    );
    if (!baseIntegrityResponse.ok) {
      await voidTransaction(transactionId, logger);
      return toHttpResponse(baseIntegrityResponse);
    }

    const sendOTPIntegrityResponse = ensureSendOTPTransactionIntegrity(transactionRecord, logger);
    if (sendOTPIntegrityResponse) {
      return sendOTPIntegrityResponse;
    }

    const userService = new UserRecordsService(logger);

    const userRecord = await userService.byId(authorizedUuid);
    if (!userRecord.ok) return toHttpResponse(userRecord);

    const phoneNumber = userRecord.data.mobile;
    if (!phoneNumber)
      return toHttpResponse(
        LMSFailure({
          type: "VALIDATION_ERROR",
          message: "user record has no phone number",
        }),
      );

    const isTestNumber = checkIfTestNumber(phoneNumber);
    const verifyCode = isTestNumber ? 1111 : generateVerifyCode();
    if (!isTestNumber) {
      try {
        await sendSMS({
          phoneNumber: phoneNumber,
          messageBody: generateOTPMessageBody(verifyCode, ENV),
        });

        logger.info(`Sent OTP code ${verifyCode} to ${phoneNumber}`);
      } catch (error: any) {
        if (error?.message?.startsWith("ValidationError:")) {
          logger.warn(`Error sending OTP code: ${error}`);
          return formatJSONResponse({
            statusCode: 400,
            body: { message: "Failed to validate phone number" },
          });
        }

        logger.error(`Error sending OTP code: ${error}`);
        throw new Error(`Error sending OTP`);
      }
    }

    const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
    const next_endpoint = `${transactionId}/extra-scope/otp/verify`;

    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transactionId },
      UpdateExpression: `set ${[
        "phone_number = :phoneNumber",
        "verify_code = :verifyCode",
        "otp_sms_expiry_time = :otpExpiryTime",
        "otp_sms_send_count = :otpSendCount",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":phoneNumber": phoneNumber,
        ":verifyCode": verifyCode,
        ":otpExpiryTime": otpExpiryTime,
        ":otpSendCount": otp_sms_send_count + 1, // 0 + 1
        ":nextEndpoint": next_endpoint,
      },
    });
    logger.info(`Updated transaction, returning 200`);

    return formatJSONResponse({
      statusCode: 200,
      body: { message: "OTP sent successfully", next_endpoint },
    });
  } catch (error: any) {
    if (transactionId) {
      await voidTransaction(transactionId, logger);
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
