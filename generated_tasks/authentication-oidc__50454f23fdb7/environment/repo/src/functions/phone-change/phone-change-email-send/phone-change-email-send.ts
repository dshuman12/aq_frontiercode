import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { checkIfTestEmail, sendEmail } from "@libs/email";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  API_VERSION,
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  FIFTEEN_MINUTES,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/config";
import { generateVerifyCode } from "@libs/sms";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { z } from "zod";

const hostname = ENV === "prod" ? `https://auth.onmo.app` : `https://auth.staging.onmo.app`;

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({
      onmouuid: z.string(),
      scope: z.string(),
    }),
  }),
});

const phoneChangeEmailSend = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
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

  // Query transaction record
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": transaction_id },
  });
  if (!queryTransactionsTableRes?.Items?.length) {
    logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
    return apiResponse(400, { message: "Transaction not found" });
  }

  const transactionRecord = queryTransactionsTableRes.Items[0];
  const {
    onmouuid,
    auth_flow,
    extra_scope_flow,
    new_phone_number,
    phone_validation_status,
    next_endpoint,
    email,
  } = transactionRecord;

  if (!onmouuid) {
    throw new Error("Transaction does not have onmouuid");
  }
  logger.addContext("onmouuid", onmouuid);

  if (onmouuid !== authOnmouuid) {
    logger.warn("[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid");
    return apiResponse(401, { message: "Unauthorized" });
  }

  // Check rate limiting
  try {
    const rateLimiter = new RateLimiter();
    const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
      await rateLimiter.checkLimits({
        onmouuid,
        to_check: [
          { domain: "auth_general" },
          { domain: "auth_login" },
          { domain: "auth_extra_scope" },
          { domain: "auth_forgotten_passcode" },
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
  logger.addContext("auth_flow", auth_flow);
  logger.addContext("extra_scope_flow", extra_scope_flow);

  if (hasRecordExpired(transactionRecord.ttl)) {
    throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
  }

  if (!next_endpoint) {
    throw new Error("Transaction does not have next_endpoint");
  }

  if (next_endpoint !== `${transaction_id}/phone-change/email/send`) {
    throw new Error(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/phone-change/email/send, but received: ${next_endpoint}`,
    );
  }

  if (!new_phone_number) {
    throw new Error("Transaction does not have new_phone_number");
  }
  logger.addContext("new_phone_number", new_phone_number);

  if (!email) {
    throw new Error("Transaction does not have email address");
  }
  logger.addContext("email", email);

  if (phone_validation_status !== "verified") {
    throw new Error(
      `Transaction phone_validation_status is ${phone_validation_status}, expected verified`,
    );
  }

  // Check for first_name in transaction record
  if (!transactionRecord.first_name) {
    throw new Error("Transaction missing first_name");
  }
  const { first_name } = transactionRecord;

  // Get SendGrid secrets for email sending
  const { SecretString } = await getSecret(`sendgrid_prod`);
  if (!SecretString) {
    throw new Error("Sendgrid secrets string is undefined");
  }

  try {
    const secretData = JSON.parse(SecretString);

    const { ApiKey, PhoneChangeTemplateId } = secretData;
    if (!ApiKey) {
      throw new Error("Missing sendgrid API key");
    }

    if (!PhoneChangeTemplateId) {
      throw new Error("Missing sendgrid phone change template ID");
    }

    // For test emails, use a fixed code
    const isTestEmail = checkIfTestEmail(email);
    const verifyCode = isTestEmail ? 1111 : generateVerifyCode();
    const emailExpiryTime = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
    const next_endpoint_email_redirect = `${transaction_id}/phone-change/email/redirect`;

    // Update transaction record with email verification details
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "verify_code = :verifyCode",
        "email_validation_expiry_time = :emailExpiryTime",
        "email_validation_status = :emailValidationStatus",
        "email_validation_send_count = :emailSendCount",
        "email_validation_attempt_count = :emailAttemptCount",
        "next_endpoint = :nextEndpoint",
        "first_name = :firstName",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":verifyCode": verifyCode,
        ":emailExpiryTime": emailExpiryTime,
        ":emailValidationStatus": "pending",
        ":emailSendCount": 1,
        ":emailAttemptCount": 0,
        ":nextEndpoint": next_endpoint_email_redirect,
        ":firstName": first_name,
      },
    });

    // Send verification email
    if (!isTestEmail) {
      try {
        await sendEmail({
          api_key: ApiKey,
          template_id: PhoneChangeTemplateId,
          email_address: email,
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
        throw new Error(`Failed to send verification email`);
      }
    }

    return apiResponse(200, {
      message: "OTP sent successfully",
      next_endpoint: next_endpoint_email_redirect,
      email_masked: `${email.charAt(0)}*****${email.split("@")[0].slice(-1)}@${email.split("@")[1]}`,
      template_id: PhoneChangeTemplateId,
      redirect_url: `${hostname}/oidc/${API_VERSION || "v5"}/${next_endpoint_email_redirect}?verify_code=${verifyCode}`,
    });
  } catch (secretParseError: any) {
    logger.error(`Error processing SendGrid configuration`);
    throw new Error("Error processing email configuration");
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(phoneChangeEmailSend);
