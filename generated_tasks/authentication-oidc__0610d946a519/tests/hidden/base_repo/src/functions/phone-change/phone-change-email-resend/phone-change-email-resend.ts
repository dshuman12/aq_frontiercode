import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  FIFTEEN_MINUTES,
  PHONE_NUMBER_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/constants";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { generateVerifyCode } from "@libs/sms";

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
    const { onmouuid, auth_flow, extra_scope_flow, new_phone_number, email } = transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ onmouuid });

    if (onmouuid !== authOnmouuid) {
      logger.warn("[suspicious_activity] Authorizer onmouuid does not match query onmouuid");
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
        `Invalid transaction for phone change email resend. auth_flow: ${auth_flow}, extra_scope_flow: ${extra_scope_flow}`,
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

    if (!email) {
      throw new Error("Transaction does not have email");
    }
    logger.addContext({ email });

    const expectedRedirectEndpoint = `${transaction_id}/phone-change/email/redirect`;

    if (next_endpoint !== expectedRedirectEndpoint) {
      logger.error(
        `Something went wrong: Transaction is not valid for this endpoint. Expected next endpoint: ${expectedRedirectEndpoint}, but received: ${next_endpoint}`,
      );
      return formatJSONResponse({
        statusCode: 400,
        body: {
          message: "Something went wrong",
        },
      });
    }

    if (!transactionRecord.first_name) {
      throw new Error("Transaction missing first_name");
    }
    const { first_name } = transactionRecord;

    const email_validation_attempt_count = transactionRecord.email_validation_attempt_count ?? 0;
    const email_validation_send_count = transactionRecord.email_validation_send_count ?? 0;

    if (email_validation_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
    }

    if (email_validation_send_count < 1) {
      throw new Error(`Transaction should have email_validation_send_count of at least 1`);
    }

    if (email_validation_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
      return formatJSONResponse({
        statusCode: 422,
        body: {
          error_code: OTP_SEND_LIMIT_REACHED,
          next_endpoint: "authorize/phone-change",
        },
      });
    }

    logger.addContext({ email_validation_send_count });

    const { SecretString } = await getSecret(`sendgrid_prod`);
    if (!SecretString) {
      throw new Error("Sendgrid secrets string is undefined");
    }
    const { ApiKey, PhoneChangeTemplateId } = JSON.parse(SecretString);
    if (!ApiKey) {
      throw new Error("Missing sendgrid API key");
    }
    if (!PhoneChangeTemplateId) {
      throw new Error("Missing sendgrid phone change template ID");
    }

    const isTestEmail = checkIfTestEmail(email);
    const verifyCode = isTestEmail ? 1111 : generateVerifyCode();

    const emailExpiryTime = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
    const nextEndpoint = `${transaction_id}/phone-change/email/redirect`;

    await updateItemMethod({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "verify_code = :verifyCode",
        "email_validation_expiry_time = :emailExpiryTime",
        "email_validation_send_count = :emailSendCount",
        "email_validation_attempt_count = :emailAttemptCount",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":verifyCode": verifyCode,
        ":emailExpiryTime": emailExpiryTime,
        ":emailSendCount": email_validation_send_count + 1,
        ":emailAttemptCount": 0,
        ":nextEndpoint": nextEndpoint,
      },
    });
    logger.info(`Updated transaction`);

    if (!isTestEmail) {
      await sendEmail({
        api_key: ApiKey,
        template_id: PhoneChangeTemplateId,
        email_address: email,
        first_name,
        transaction_id,
        verify_code: verifyCode,
      });
      logger.info(`Sent verification code ${verifyCode} to ${email}`);
    }

    logger.info(`Returning 200`);
    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "Verification email resent successfully",
        next_endpoint: nextEndpoint,
        email_masked: `${email.charAt(0)}*****${email.split("@")[0].slice(-1)}@${email.split("@")[1]}`,
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
