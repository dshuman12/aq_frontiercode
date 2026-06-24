import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  FIVE_MINUTES,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/constants";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { generateVerifyCode } from "@libs/sms";
import { getLogger } from "@libs/logger";
import { AuthorizerEvent } from "@libs/shared";

export type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id?: string };
};

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  logger.info("Email change email resend function started");

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
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });

    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];

    const { onmouuid, auth_flow, extra_scope_flow, new_email } = transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ onmouuid });

    if (onmouuid !== authOnmouuid) {
      logger.warn(
        `[suspicious_activity] User ownership validation failed. Transaction onmouuid: ${onmouuid}, Auth onmouuid: ${authOnmouuid}`,
      );
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
      logger.error(`Rate limit error: ${error?.message || error}`);
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    if (!auth_flow) {
      throw new Error("[suspicious_activity] Transaction does not have auth_flow");
    }

    const isValidEmailChangeTransaction =
      (auth_flow === EXTRA_SCOPE_AUTH_FLOW && extra_scope_flow === EMAIL_CHANGE_FLOW) ||
      auth_flow === "email_change";

    if (!isValidEmailChangeTransaction) {
      logger.error(
        `[suspicious_activity] Invalid transaction for email resend. auth_flow: ${auth_flow}, extra_scope_flow: ${extra_scope_flow}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    logger.addContext({ auth_flow, extra_scope_flow });

    if (hasRecordExpired(transactionRecord.ttl)) {
      logger.warn(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    const { next_endpoint } = transactionRecord;

    if (!new_email) {
      throw new Error("Transaction does not have new_email");
    }
    logger.addContext({ new_email });

    if (next_endpoint !== `${transaction_id}/email-change/redirect`) {
      logger.error(
        `Invalid next endpoint. Expected: ${transaction_id}/email-change/redirect, received: ${next_endpoint}`,
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

    if (email_validation_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);
      return formatJSONResponse({
        statusCode: 422,
        body: {
          error_code: OTP_SEND_LIMIT_REACHED,
          next_endpoint: "authorize/email-change",
        },
      });
    }

    logger.addContext({ email_validation_send_count });

    const { SecretString } = await getSecret(`sendgrid_prod`);
    if (!SecretString) {
      throw new Error("Sendgrid secrets string is undefined");
    }

    const { ApiKey, EmailChangeTemplateId } = JSON.parse(SecretString);
    if (!ApiKey) {
      throw new Error("Missing sendgrid API key");
    }
    if (!EmailChangeTemplateId) {
      throw new Error("Missing sendgrid email change template ID");
    }

    const isTestEmail = checkIfTestEmail(new_email);
    const verifyCode = isTestEmail ? 1111 : generateVerifyCode();

    const emailExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
    const nextEndpoint = `${transaction_id}/email-change/redirect`;

    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
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

    if (!isTestEmail) {
      await sendEmail({
        api_key: ApiKey,
        template_id: EmailChangeTemplateId,
        email_address: new_email,
        first_name,
        transaction_id,
        verify_code: verifyCode,
      });
      logger.info(`Verification email sent to ${new_email}`);
    }

    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "Verification email resent successfully",
        next_endpoint: nextEndpoint,
        email: new_email,
      },
    });
  } catch (error: any) {
    logger.error(`Email change resend error: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
