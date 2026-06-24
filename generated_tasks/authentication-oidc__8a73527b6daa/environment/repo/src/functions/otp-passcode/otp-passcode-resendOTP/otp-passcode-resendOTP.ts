import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { deleteItemMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  FIRST_TIME_LOGIN_FLOW,
  FIVE_MINUTES,
  OTP_ATTEMPT_LIMIT,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/constants";
import { runNotificationProvider } from "@libs/featureFlag";
import { checkIfTestNumber, generateVerifyCode } from "@libs/sms";
import { APP_TESTER_NUMBER, AppTesterLoginConfig } from "@libs/testConstants";
import { getParameter } from "@onmoapp/onmo-ssm";
import { checkRateLimit } from "@libs/shared";
import { getLogger } from "@libs/logger";
import { TransactionsService } from "@services/transaction/transaction";
import { toHttpResponse } from "@onmoapp/core-banking";

type ParsedRequestBody = { phone_number: string };

// FOR APP TESTER
const app_tester_login_config = process.env.APP_TESTER_LOGIN_CONFIG as string;

export const handler = async (event: {
  pathParameters: { transaction_id?: string };
  body: string;
}) => {
  const logger = getLogger();

  const { transaction_id } = event.pathParameters;

  const transactionService = new TransactionsService(logger);

  try {
    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });
    const { phone_number }: ParsedRequestBody = JSON.parse(event.body);
    if (!phone_number) {
      logger.warn("Missing phone_number in request body");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ phone_number });
    logger.info(`Received valid request body: ${event.body}`);

    // FOR APP TESTER
    let isAppTesterNumber = false;
    if (phone_number === APP_TESTER_NUMBER) {
      logger.warn("***** THIS IS APP TESTER NUMBER *****");
      isAppTesterNumber = true;
    }

    const transaction = await transactionService.transaction(transaction_id);
    if (!transaction.ok) {
      return toHttpResponse(transaction);
    }
    const transactionRecord = transaction.data;
    const { onmouuid, auth_flow, login_flow } = transactionRecord;

    if (!onmouuid) {
      logger.warn("Transaction does not have onmouuid");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ onmouuid });

    const rateLimit = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_login",
        action: "otp_sms_send",
      },
      logger,
    );

    if (rateLimit) return rateLimit;

    try {
      if (!auth_flow) {
        throw new Error("[suspicious_activity] Transaction does not have auth_flow");
      }
      if (auth_flow !== OTP_PASSCODE_AUTH_FLOW) {
        throw new Error(
          `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_PASSCODE_AUTH_FLOW}`,
        );
      }
      logger.addContext({ auth_flow });
      if (!login_flow) {
        throw new Error("[suspicious_activity] Transaction does not have login_flow");
      }
      if (login_flow !== FIRST_TIME_LOGIN_FLOW) {
        throw new Error(
          `[suspicious_activity] Transaction login_flow: ${login_flow}, expected: ${FIRST_TIME_LOGIN_FLOW}`,
        );
      }
      logger.addContext({ login_flow });

      if (hasRecordExpired(transactionRecord.ttl)) {
        throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
      }
      if (!transactionRecord.next_endpoint) {
        throw new Error("Transaction does not have next_endpoint");
      }
      const { next_endpoint } = transactionRecord;
      if (!("create_refresh_token" in transactionRecord)) {
        throw new Error("Transaction does not have create_refresh_token");
      }
      if (!transactionRecord.create_refresh_token) {
        throw new Error("Transaction not marked with create_refresh_token=true");
      }

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

      if (
        !transactionRecord.code_challenge ||
        !transactionRecord.scope ||
        !transactionRecord.device_id
      ) {
        throw new Error(
          `[suspicious_activity] Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`,
        );
      }
      if ("auth_code" in transactionRecord) {
        throw new Error(`auth_code in transaction`);
      }
      if (transactionRecord.otp_sms_verified) {
        throw new Error("[suspicious_activity] OTP has already been verified");
      }

      if (next_endpoint === `${transaction_id}/otp-passcode/otp/verify`) {
        logger.info(`** Resend OTP reason: failed verify OTP attempt **`);
      } //
      else if (next_endpoint === `${transaction_id}/otp-passcode/otp/resend`) {
        logger.info(`** Resend OTP reason: OTP expired or manually requested to resend **`);
      } //
      else {
        throw new Error(
          `Expected transaction next_endpoint of ${transaction_id}/otp-passcode/otp/verify or ${transaction_id}/otp-passcode/otp/resend, but received: ${next_endpoint}`,
        );
      }

      if (transactionRecord.phone_number !== phone_number) {
        throw new Error(
          "[suspicious_activity] Phone number on transaction does not match provided one",
        );
      }
      if (transactionRecord.otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
        throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
      }
      if (transactionRecord.otp_sms_send_count < 1) {
        throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
      }
    } catch (error: any) {
      logger.warn(error.message);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (transactionRecord.otp_sms_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

      logger.info("Voiding transaction");
      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }

      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: OTP_SEND_LIMIT_REACHED, next_endpoint: "authorize/otp-passcode" },
      });
    }
    const { otp_sms_send_count } = transactionRecord;
    logger.addContext({ otp_sms_send_count });

    const isTestNumber = checkIfTestNumber(phone_number);
    let verifyCode;

    // FOR APP TESTER
    if (isAppTesterNumber) {
      try {
        const { Parameter: appTesterParam } = await getParameter({
          Name: app_tester_login_config,
        });
        if (!appTesterParam?.Value) {
          throw new Error(`Failed to fetch app tester login config parameter from ssm`);
        }
        const { enabled, sms_otp, passcode } = JSON.parse(
          appTesterParam.Value,
        ) as AppTesterLoginConfig;
        logger.addContext({ APP_TESTER_SMS_OTP: sms_otp, APP_TESTER_PASSCODE: passcode });

        if (!sms_otp) {
          throw new Error("Missing sms otp in SSM param");
        }
        if (!passcode) {
          throw new Error("Missing passcode in SSM param");
        }
        if (!enabled) {
          throw new Error("App tester login config is disabled");
        }
        verifyCode = sms_otp;

        logger.warn("App tester login config retrieved successfully");
      } catch (error: any) {
        throw new Error("Failed to get app tester login config");
      }
    }
    // FOR TEST NUMBERS (staging only)
    else if (isTestNumber) {
      verifyCode = 1111;
    }
    // NORMAL VERIFY CODE
    else {
      verifyCode = generateVerifyCode();
    }
    logger.addContext({ verifyCode });

    if (!isTestNumber && !isAppTesterNumber) {
      try {
        await runNotificationProvider(
          onmouuid,
          verifyCode,
          phone_number,
          "passcode-resend-otp",
          ENV,
          logger,
        );

        logger.info(`Sent OTP code ${verifyCode} to ${phone_number}`);
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

    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
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
        ":nextEndpoint": `${transaction_id}/otp-passcode/otp/verify`,
      },
    });
    logger.info(`Updated transaction, returning 200`);

    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "OTP resent successfully",
        next_endpoint: `${transaction_id}/otp-passcode/otp/verify`,
      },
    });
  } catch (error: any) {
    if (transaction_id) {
      logger.info("Voiding transaction");
      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
