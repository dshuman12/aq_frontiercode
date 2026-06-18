import {
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  FIVE_MINUTES,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/constants";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { checkIfTestNumber, generateOTPMessageBody, generateVerifyCode, sendSMS } from "@libs/sms";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { AuthorizerEvent } from "@libs/shared";

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

export type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id?: string };
};

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });

    const { onmouuid: authOnmouuid } = event?.requestContext?.authorizer;
    if (!authOnmouuid) {
      logger.warn("Missing onmouuid from authorizer");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ authOnmouuid });

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
    const { onmouuid, auth_flow, extra_scope_flow, phone_number } = transactionRecord;
    if (!onmouuid) {
      logger.warn("Transaction does not have onmouuid");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ onmouuid });

    if (onmouuid !== authOnmouuid) {
      logger.warn("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
      return formatJSONResponse({ statusCode: 403, body: { message: "Unauthorized" } });
    }

    try {
      const rateLimiter = new RateLimiter();
      const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
        await rateLimiter.checkLimits({
          onmouuid,
          to_check: [
            { domain: "auth_general" },
            { domain: "auth_login" },
            { domain: "auth_extra_scope" },
            { domain: "auth_biometrics_registration" },
          ],
        });
      if (rate_limited || super_rate_limited) {
        const all_limited_actions = [...new Set([...limited_actions, ...super_limited_actions])];
        logger.warn(`Rate limited for actions: ${JSON.stringify(all_limited_actions)}`);

        const expiry_time = super_rate_limited
          ? "no_expiry"
          : Math.max(...limited_actions.map((action) => action.rate_limit_expiry ?? 0));
        return formatJSONResponse({ statusCode: 429, body: { expiry_time } });
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
      logger.warn("[suspicious_activity] Transaction does not have auth_flow");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    const isValidEmailChangeTransaction =
      (auth_flow === EXTRA_SCOPE_AUTH_FLOW && extra_scope_flow === EMAIL_CHANGE_FLOW) ||
      auth_flow === "email_change";

    if (!isValidEmailChangeTransaction) {
      logger.warn(
        `[suspicious_activity] Invalid transaction for OTP resend. auth_flow: ${auth_flow}, extra_scope_flow: ${extra_scope_flow}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    logger.addContext({ auth_flow, extra_scope_flow });

    if (hasRecordExpired(transactionRecord.ttl)) {
      logger.warn(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    const { next_endpoint } = transactionRecord;

    if (!phone_number) {
      logger.warn("Transaction does not have phone_number");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ phone_number });

    if (next_endpoint !== `${transaction_id}/extra-scope/otp/resend`) {
      logger.warn(
        `Something went wrong: Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/extra-scope/otp/resend, but received: ${next_endpoint}`,
      );
      return formatJSONResponse({
        statusCode: 400,
        body: {
          message: "Something went wrong",
        },
      });
    }

    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_attempt_count");
    }
    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_send_count");
    }

    if (transactionRecord.otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
    }

    if (transactionRecord.otp_sms_send_count < 1) {
      throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
    }

    if (transactionRecord.otp_sms_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
      return formatJSONResponse({
        statusCode: 422,
        body: {
          error_code: OTP_SEND_LIMIT_REACHED,
          next_endpoint: "authorize/email-change",
        },
      });
    }

    const { otp_sms_send_count } = transactionRecord;
    logger.addContext({ otp_sms_send_count });

    const isTestNumber = checkIfTestNumber(phone_number);
    const verifyCode = isTestNumber ? 1111 : generateVerifyCode();

    if (!isTestNumber) {
      try {
        await sendSMS({
          phoneNumber: phone_number,
          messageBody: generateOTPMessageBody(verifyCode, env),
        });

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
    const nextEndpoint = `${transaction_id}/extra-scope/otp/verify`;

    await updateItemMethod({
      TableName: auth_transactions_table,
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
        ":nextEndpoint": nextEndpoint,
      },
    });
    logger.info(`Updated transaction`);

    logger.info(`Returning 200`);
    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "OTP resent successfully",
        next_endpoint: nextEndpoint,
        phone_number: phone_number,
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
