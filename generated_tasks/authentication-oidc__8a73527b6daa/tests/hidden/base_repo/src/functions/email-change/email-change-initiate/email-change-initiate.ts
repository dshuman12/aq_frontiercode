import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  FIVE_MINUTES,
} from "@libs/constants";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { generateVerifyCode } from "@libs/sms";
import { getLogger } from "@libs/logger";
import { TransactionsService } from "@services/transaction/transaction";
import { toHttpResponse } from "@onmoapp/core-banking";
import { AuthorizerEvent, checkRateLimit } from "@libs/shared";

type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id?: string };
  requestContext: { authorizer: { onmouuid: string } };
};

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  const { transaction_id } = event.pathParameters;

  const transactionsService = new TransactionsService(logger);

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

    const { onmouuid: authOnmouuid } = event.requestContext.authorizer;
    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }
    logger.addContext({ authOnmouuid });

    const transactionRecord = await transactionsService.transaction(transaction_id);
    if (!transactionRecord.ok) return toHttpResponse(transactionRecord);

    const {
      onmouuid,
      auth_flow,
      extra_scope_flow,
      new_email,
      ttl,
      next_endpoint,
      code_challenge,
      scope,
      device_id,
      first_name,
    } = transactionRecord.data;

    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ onmouuid });

    if (onmouuid !== authOnmouuid) {
      logger.warn("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
      return formatJSONResponse({ statusCode: 403, body: { message: "Unauthorized" } });
    }

    const rateLimiter = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_extra_scope",
        action: "authorize",
      },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    // Validate transaction record
    if (!auth_flow) {
      throw new Error("[suspicious_activity] Transaction does not have auth_flow");
    }
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW && auth_flow !== "email_change") {
      throw new Error(
        `[suspicious_activity] Transaction auth_flow: ${auth_flow}, expected ${EXTRA_SCOPE_AUTH_FLOW} or email_change`,
      );
    }

    if (auth_flow === EXTRA_SCOPE_AUTH_FLOW) {
      if (!extra_scope_flow) {
        throw new Error("Transaction does not have extra_scope_flow");
      }
      if (extra_scope_flow !== EMAIL_CHANGE_FLOW) {
        throw new Error(
          `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected ${EMAIL_CHANGE_FLOW}`,
        );
      }
    }
    logger.addContext({ auth_flow, extra_scope_flow });

    if (hasRecordExpired(ttl)) {
      logger.warn(`Transaction has expired. TTL: ${ttl}`);
      logger.error(`Something went wrong: Transaction has expired`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    if (!next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (!code_challenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    if (!scope) {
      throw new Error("Transaction does not have scope");
    }
    if (!device_id) {
      throw new Error("Transaction does not have device_id");
    }
    if (!new_email) {
      throw new Error("Transaction does not have new_email");
    }
    logger.addContext({ new_email });

    if (next_endpoint !== `${transaction_id}/email-change/initiate`) {
      logger.error(
        `Something went wrong: Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/email-change/initiate, but received: ${next_endpoint}`,
      );
      return formatJSONResponse({
        statusCode: 400,
        body: {
          message: "Something went wrong",
        },
      });
    }

    if (!first_name) {
      throw new Error("Transaction missing first_name");
    }

    logger.info(`Attempting to retrieve SendGrid secrets`);
    const { SecretString } = await getSecret(`sendgrid_prod`);
    if (!SecretString) {
      throw new Error("Sendgrid secrets string is undefined");
    }
    logger.info(`Successfully retrieved SendGrid secrets`);

    try {
      const secretData = JSON.parse(SecretString);
      logger.info(`SendGrid secret data successfully parsed`);

      const { ApiKey, EmailChangeTemplateId } = secretData;
      if (!ApiKey) {
        throw new Error("Missing sendgrid API key");
      }

      logger.info(`EmailChangeTemplateId: ${EmailChangeTemplateId}`);

      if (!EmailChangeTemplateId) {
        throw new Error("Missing sendgrid email change template ID");
      }
      logger.info(`Required SendGrid configuration found`);

      // For test emails, use a fixed code
      const isTestEmail = checkIfTestEmail(new_email);
      const verifyCode = isTestEmail ? 1111 : generateVerifyCode();

      const emailExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
      const next_endpoint = `${transaction_id}/email-change/redirect`;

      // Update transaction record with verification code
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression: `set ${[
          "verify_code = :verifyCode",
          "email_validation_expiry_time = :emailExpiryTime",
          "email_validation_send_count = :emailSendCount",
          "email_validation_attempt_count = :emailAttemptCount",
          "next_endpoint = :nextEndpoint",
          "first_name = :firstName",
        ].join(", ")}`,
        ExpressionAttributeValues: {
          ":verifyCode": verifyCode,
          ":emailExpiryTime": emailExpiryTime,
          ":emailSendCount": 1,
          ":emailAttemptCount": 0,
          ":nextEndpoint": next_endpoint,
          ":firstName": first_name,
        },
      });
      logger.info(`Updated transaction with verification code`);

      // Send email with verification code
      if (!isTestEmail) {
        logger.info(`Sending verification email to new email address`);
        try {
          await sendEmail({
            api_key: ApiKey,
            template_id: EmailChangeTemplateId,
            email_address: new_email,
            first_name,
            transaction_id,
            verify_code: verifyCode,
          });
          logger.info(`Verification email sent successfully`);
        } catch (emailError: any) {
          logger.error(`Failed to send verification email`);
          // Only log status code, not the full error details that might contain sensitive info
          if (emailError?.response?.status) {
            logger.error(`SendGrid API Status: ${emailError.response.status}`);
          }
          throw new Error("Failed to send verification email");
        }
      } else {
        logger.info(`Test email detected, skipping actual email sending`);
      }

      logger.info(`Email verification process completed successfully`);
      return formatJSONResponse({
        statusCode: 200,
        body: {
          message: "Verification email sent successfully",
          next_endpoint,
          email: new_email,
        },
      });
    } catch (secretParseError: any) {
      logger.error(`Error processing SendGrid configuration`);
      throw new Error("Error processing email configuration");
    }
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
