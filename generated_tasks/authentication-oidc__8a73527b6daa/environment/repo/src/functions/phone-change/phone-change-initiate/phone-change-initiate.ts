import { EXTRA_SCOPE_AUTH_FLOW, FIVE_MINUTES, PHONE_NUMBER_CHANGE_FLOW } from "@libs/constants";
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
  logger.info(`Received event: ${JSON.stringify(event)}`);

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });
    logger.info(`Processing transaction ${transaction_id}`);

    const { onmouuid: authOnmouuid } = event?.requestContext?.authorizer;
    if (!authOnmouuid) {
      logger.error("Missing onmouuid from authorizer");
      throw new Error("Missing onmouuid from authorizer");
    }
    logger.addContext({ authOnmouuid });
    logger.info(`Authenticated user: ${authOnmouuid}`);

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
      throw new Error(
        "[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid",
      );
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

    // Validate transaction record
    if (!auth_flow) {
      throw new Error("Transaction does not have auth_flow");
    }
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW) {
      throw new Error(`Transaction auth_flow: ${auth_flow}, expected ${EXTRA_SCOPE_AUTH_FLOW}`);
    }
    if (!extra_scope_flow) {
      throw new Error("Transaction does not have extra_scope_flow");
    }
    if (extra_scope_flow !== PHONE_NUMBER_CHANGE_FLOW) {
      throw new Error(
        `Transaction extra_scope_flow: ${extra_scope_flow}, expected ${PHONE_NUMBER_CHANGE_FLOW}`,
      );
    }
    logger.addContext({ auth_flow, extra_scope_flow });

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (!transactionRecord.code_challenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    if (!transactionRecord.scope) {
      throw new Error("Transaction does not have scope");
    }
    if (!transactionRecord.device_id) {
      throw new Error("Transaction does not have device_id");
    }
    if (!new_phone_number) {
      throw new Error("Transaction does not have new_phone_number");
    }
    logger.addContext({ new_phone_number });

    if (transactionRecord.next_endpoint !== `${transaction_id}/phone-change/initiate`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/phone-change/initiate, but received: ${transactionRecord.next_endpoint}`,
      );
    }

    // Validate phone number format - using a basic regex validation since validatePhoneNumber doesn't exist
    const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneNumberRegex.test(new_phone_number)) {
      logger.warn(`Invalid phone number format: ${new_phone_number}`);
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Invalid phone number format" },
      });
    }

    // Check if test number
    const isTestNumber = checkIfTestNumber(new_phone_number);
    // Generate verification code using existing function
    const verifyCode = isTestNumber ? 1111 : generateVerifyCode();
    logger.addContext({ verifyCode });

    const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
    const next_endpoint = `${transaction_id}/phone-change/otp/verify`;

    // Update transaction record with OTP code
    await updateItemMethod({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "verify_code = :verifyCode",
        "phone_validation_expiry_time = :otpExpiryTime",
        "next_endpoint = :nextEndpoint",
        "phone_validation_status = :phoneValidationStatus",
        "otp_sms_send_count = :otpSendCount",
        "otp_sms_attempt_count = :otpAttemptCount",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":verifyCode": verifyCode,
        ":otpExpiryTime": otpExpiryTime,
        ":nextEndpoint": next_endpoint,
        ":phoneValidationStatus": "pending",
        ":otpSendCount": 1,
        ":otpAttemptCount": 0,
      },
    });
    logger.info(`Updated transaction with verification code`);

    // Send SMS with OTP code
    if (!isTestNumber) {
      logger.info(`Sending OTP SMS to new phone number`);
      try {
        await sendSMS({
          phoneNumber: new_phone_number,
          messageBody: generateOTPMessageBody(verifyCode, env),
        });

        logger.info(`OTP SMS sent successfully`);
      } catch (smsError: any) {
        if (smsError?.message?.startsWith("ValidationError:")) {
          logger.warn(`Error sending OTP code: ${smsError}`);
          return formatJSONResponse({
            statusCode: 400,
            body: { message: "Failed to validate phone number" },
          });
        }

        logger.error(`Failed to send OTP SMS`);
        // Only log status code, not the full error details that might contain sensitive info
        if (smsError?.response?.status) {
          logger.error(`SMS API Status: ${smsError.response.status}`);
        }
        throw new Error(`Failed to send OTP SMS`);
      }
    } else {
      logger.info(`Test phone number detected, skipping actual SMS sending`);
    }

    logger.info(`Phone number verification process initiated successfully`);
    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "OTP sent successfully to new phone number",
        next_endpoint,
        phone_number: new_phone_number.slice(-4), // Return only last 4 digits for security
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    logger.error(`Error stack: ${error?.stack || "No stack trace available"}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
