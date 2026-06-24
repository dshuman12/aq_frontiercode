import {
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  FIVE_MINUTES,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/config";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { checkIfTestNumber, generateOTPMessageBody, generateVerifyCode, sendSMS } from "@libs/sms";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({
      onmouuid: z.string(),
      scope: z.string(),
    }),
  }),
});

const phoneChangeInitiate = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
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
  const { onmouuid, auth_flow, extra_scope_flow, new_phone_number } = transactionRecord;
  if (!onmouuid) {
    throw new Error("Transaction does not have onmouuid");
  }
  logger.addContext("onmouuid", onmouuid);

  if (onmouuid !== authOnmouuid) {
    logger.warn("[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid");
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
  logger.addContext("new_phone_number", new_phone_number);

  if (transactionRecord.next_endpoint !== `${transaction_id}/phone-change/initiate`) {
    throw new Error(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/phone-change/initiate, but received: ${transactionRecord.next_endpoint}`,
    );
  }

  // Validate phone number format - using a basic regex validation since validatePhoneNumber doesn't exist
  const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneNumberRegex.test(new_phone_number)) {
    logger.warn(`Invalid phone number format: ${new_phone_number}`);
    return apiResponse(400, { message: "Invalid phone number format" });
  }

  // Check if test number
  const isTestNumber = checkIfTestNumber(new_phone_number);
  // Generate verification code using existing function
  const verifyCode = isTestNumber ? 1111 : generateVerifyCode();
  logger.addContext("verifyCode", verifyCode);

  const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
  const next_endpoint = `${transaction_id}/phone-change/otp/verify`;

  // Update transaction record with OTP code
  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
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

  // Send SMS with OTP code
  if (!isTestNumber) {
    try {
      await sendSMS({
        phoneNumber: new_phone_number,
        messageBody: generateOTPMessageBody(verifyCode, ENV),
      });
    } catch (smsError: any) {
      if (smsError?.message?.startsWith("ValidationError:")) {
        logger.warn(`Error sending OTP code: ${serializeError(smsError)}`);
        return apiResponse(400, { message: "Failed to validate phone number" });
      }

      logger.error(`Failed to send OTP SMS`);
      // Only log status code, not the full error details that might contain sensitive info
      if (smsError?.response?.status) {
        logger.error(`SMS API Status: ${smsError.response.status}`);
      }
      throw new Error(`Failed to send OTP SMS`);
    }
  }

  return apiResponse(200, {
    message: "OTP sent successfully to new phone number",
    next_endpoint,
    phone_number: new_phone_number.slice(-4), // Return only last 4 digits for security
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(phoneChangeInitiate);
