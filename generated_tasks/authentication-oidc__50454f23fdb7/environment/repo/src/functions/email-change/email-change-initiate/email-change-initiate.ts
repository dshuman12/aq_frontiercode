import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  FIVE_MINUTES,
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
} from "@libs/config";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { generateVerifyCode } from "@libs/sms";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string(), scope: z.string() }),
  }),
});

const emailChangeInitiate = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid, scope: authScope } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  if (!authScope.includes(AUTH_SERVICES_SCOPE)) {
    logger.warn(`Invalid scope: ${authScope}, expected ${AUTH_SERVICES_SCOPE}`);
    return apiResponse(401, { message: "Unauthorized" });
  }

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": transaction_id },
  });
  if (!queryTransactionsTableRes?.Items?.length) {
    logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
    return apiResponse(400, { message: "Something went wrong" });
  }
  const transactionRecord = queryTransactionsTableRes.Items[0];
  const { onmouuid, auth_flow, extra_scope_flow, new_email } = transactionRecord;
  if (!onmouuid) {
    throw new Error("Transaction does not have onmouuid");
  }
  logger.addContext("onmouuid", onmouuid);

  if (onmouuid !== authOnmouuid) {
    logger.warn("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
    return apiResponse(401, { message: "Unauthorized" });
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
      return apiResponse(429, { expiry_time });
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
  logger.addContext("auth_flow", auth_flow);
  logger.addContext("extra_scope_flow", extra_scope_flow);

  if (hasRecordExpired(transactionRecord.ttl)) {
    logger.warn(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    logger.error(`Something went wrong: Transaction has expired`);
    return apiResponse(400, { message: "Something went wrong" });
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
  if (!new_email) {
    throw new Error("Transaction does not have new_email");
  }
  logger.addContext("new_email", new_email);

  if (transactionRecord.next_endpoint !== `${transaction_id}/email-change/initiate`) {
    logger.error(
      `Something went wrong: Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/email-change/initiate, but received: ${transactionRecord.next_endpoint}`,
    );
    return apiResponse(400, {
      message: "Something went wrong",
    });
  }

  if (!transactionRecord.first_name) {
    throw new Error("Transaction missing first_name");
  }
  const { first_name } = transactionRecord;

  const { SecretString } = await getSecret(`sendgrid_prod`);
  if (!SecretString) {
    throw new Error("Sendgrid secrets string is undefined");
  }

  try {
    const secretData = JSON.parse(SecretString);

    const { ApiKey, EmailChangeTemplateId } = secretData;
    if (!ApiKey) {
      throw new Error("Missing sendgrid API key");
    }

    if (!EmailChangeTemplateId) {
      throw new Error("Missing sendgrid email change template ID");
    }

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

    // Send email with verification code
    if (!isTestEmail) {
      try {
        await sendEmail({
          api_key: ApiKey,
          template_id: EmailChangeTemplateId,
          email_address: new_email,
          first_name,
          transaction_id,
          verify_code: verifyCode,
        });
      } catch (emailError: any) {
        logger.error(`Failed to send verification email`);
        // Only log status code, not the full error details that might contain sensitive info
        if (emailError?.response?.status) {
          logger.error(`SendGrid API Status: ${emailError.response.status}`);
        }
        throw new Error("Failed to send verification email");
      }
    }

    return apiResponse(200, {
      message: "Verification email sent successfully",
      next_endpoint,
      email: new_email,
    });
  } catch (secretParseError: any) {
    logger.error(`Error processing SendGrid configuration`);
    throw new Error("Error processing email configuration");
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(emailChangeInitiate);
