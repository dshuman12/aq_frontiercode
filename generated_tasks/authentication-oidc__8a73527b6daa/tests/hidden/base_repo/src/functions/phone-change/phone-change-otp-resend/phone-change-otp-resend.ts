import {
  EXTRA_SCOPE_AUTH_FLOW,
  FIVE_MINUTES,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/constants";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { checkIfTestNumber, generateOTPMessageBody, generateVerifyCode, sendSMS } from "@libs/sms";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

type HandlerEvent = {
  pathParameters: { transaction_id?: string };
  requestContext: { authorizer: { onmouuid: string } };
};

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

    const { onmouuid: authOnmouuid } = event?.requestContext?.authorizer;
    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }
    logger.addContext({ authOnmouuid });

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: auth_transactions_table,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${auth_transactions_table}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];
    const { onmouuid, auth_flow, extra_scope_flow, new_phone_number } = transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ onmouuid });

    if (onmouuid !== authOnmouuid) {
      logger.warn("[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid");
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
      throw new Error("Transaction does not have auth_flow");
    }

    const isValidPhoneChangeTransaction =
      auth_flow === EXTRA_SCOPE_AUTH_FLOW && extra_scope_flow === PHONE_NUMBER_CHANGE_FLOW;

    if (!isValidPhoneChangeTransaction) {
      logger.error(
        `Invalid transaction for phone change OTP resend. auth_flow: ${auth_flow}, extra_scope_flow: ${extra_scope_flow}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    logger.addContext({ auth_flow, extra_scope_flow });

    if (hasRecordExpired(transactionRecord.ttl)) {
      logger.warn(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    const { next_endpoint } = transactionRecord;

    if (!new_phone_number) {
      throw new Error("Transaction does not have new_phone_number");
    }
    logger.addContext({ new_phone_number });

    const expectedVerifyEndpoint = `${transaction_id}/phone-change/otp/verify`;

    if (next_endpoint !== expectedVerifyEndpoint) {
      logger.error(
        `Something went wrong: Transaction is not valid for this endpoint. Expected next endpoint: ${expectedVerifyEndpoint}, but received: ${next_endpoint}`,
      );
      return formatJSONResponse({
        statusCode: 400,
        body: {
          message: "Something went wrong",
        },
      });
    }

    const otp_sms_attempt_count = transactionRecord.otp_sms_attempt_count ?? 0;
    const otp_sms_send_count = transactionRecord.otp_sms_send_count ?? 0;

    if (otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
    }

    if (otp_sms_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
      return formatJSONResponse({
        statusCode: 422,
        body: {
          error_code: OTP_SEND_LIMIT_REACHED,
          next_endpoint: "authorize/phone-change",
        },
      });
    }

    const isTestNumber = checkIfTestNumber(new_phone_number);
    const verifyCode = isTestNumber ? 1111 : generateVerifyCode();

    if (!isTestNumber) {
      try {
        await sendSMS({
          phoneNumber: new_phone_number,
          messageBody: generateOTPMessageBody(verifyCode, env),
        });

        logger.info(`Sent OTP code ${verifyCode} to ${new_phone_number}`);
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
    const nextEndpoint = `${transaction_id}/phone-change/otp/verify`;

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
        phone_number: new_phone_number,
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
