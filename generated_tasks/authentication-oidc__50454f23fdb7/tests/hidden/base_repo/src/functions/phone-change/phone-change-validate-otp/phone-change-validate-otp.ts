import { getForceHalHeader } from "@libs/gatewayUtils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
  EXTRA_SCOPE_AUTH_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  OTP_SEND_LIMIT,
  PHONE_NUMBER_CHANGE_FLOW,
  USER_TABLE,
} from "@libs/config";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { BankingService } from "@services/banking/bankingService";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  verify_code: z.union([z.string(), z.number()]),
});

const eventSchema = z.object({
  pathParameters: z.object({
    transaction_id: z.string(),
  }),
  requestContext: z.object({
    authorizer: z.object({
      onmouuid: z.string(),
      scope: z.string(),
    }),
  }),
  body: jsonBody(bodySchema),
});

const phoneChangeValidateOtp = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid, scope: authScope } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  if (!authScope.includes(AUTH_SERVICES_SCOPE)) {
    logger.warn(`Invalid scope: ${authScope}, expected ${AUTH_SERVICES_SCOPE}`);
    return apiResponse(401, { message: "Unauthorized" });
  }

  const { verify_code } = parsedEvent.data.body;
  logger.addContext("verify_code", verify_code);

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
    verify_code: stored_verify_code,
    phone_validation_expiry_time,
    phone_validation_status,
    next_endpoint,
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
    logger.warn(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    return apiResponse(400, { message: "Something went wrong" });
  }

  if (!next_endpoint) {
    throw new Error("Transaction does not have next_endpoint");
  }

  if (next_endpoint !== `${transaction_id}/phone-change/otp/verify`) {
    logger.warn(
      `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/phone-change/otp/verify, but received: ${next_endpoint}`,
    );
    return apiResponse(400, { message: "Something went wrong" });
  }

  if (!stored_verify_code) {
    throw new Error("Transaction does not have verify_code");
  }

  if (!phone_validation_expiry_time) {
    throw new Error("Transaction does not have phone_validation_expiry_time");
  }

  if (!new_phone_number) {
    throw new Error("Transaction does not have new_phone_number");
  }
  logger.addContext("new_phone_number", new_phone_number);

  if (phone_validation_status !== "pending") {
    throw new Error(
      `Transaction phone_validation_status is ${phone_validation_status}, expected pending`,
    );
  }

  // Check if the OTP verification has expired
  const currentTime = getCurrentTimestampInSeconds();
  if (currentTime > phone_validation_expiry_time) {
    logger.warn(
      `OTP verification has expired. Expiry time: ${phone_validation_expiry_time}, current time: ${currentTime}`,
    );

    // Check if we need to track send count for expiry logic
    const phone_validation_send_count = transactionRecord.phone_validation_send_count || 1;

    // OTP send limit reached -> restart flow
    if (phone_validation_send_count >= OTP_SEND_LIMIT) {
      logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${serializeError(error)}`);
      }

      return apiResponse(422, {
        error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
        next_endpoint: `${transaction_id}/phone-change/otp/send`,
      });
    }
    // OTP send limit not yet reached -> resend
    else {
      const otp_resend_endpoint = `${transaction_id}/phone-change/otp/send`;
      try {
        await updateItemMethod({
          TableName: AUTH_TRANSACTIONS_TABLE,
          Key: { transaction_id },
          UpdateExpression: "set next_endpoint = :next_endpoint",
          ExpressionAttributeValues: { ":next_endpoint": otp_resend_endpoint },
        });
      } catch (error: any) {
        throw new Error(`Error updating transaction: ${error?.message || error}`);
      }

      return apiResponse(422, {
        error_code: OTP_EXPIRED_RESEND,
        next_endpoint: otp_resend_endpoint,
      });
    }
  }

  // Get current attempt count and increment it
  const phone_validation_attempt_count = transactionRecord.phone_validation_attempt_count || 0;
  const new_phone_validation_attempt_count = phone_validation_attempt_count + 1;
  logger.addContext("phone_validation_attempt_count", new_phone_validation_attempt_count);

  // Verify OTP code
  if (verify_code.toString() !== stored_verify_code.toString()) {
    logger.warn(
      `Invalid verification code. Expected: ${stored_verify_code}, received: ${verify_code}`,
    );

    if (new_phone_validation_attempt_count >= OTP_ATTEMPT_LIMIT) {
      logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);

      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${serializeError(error)}`);
      }

      return apiResponse(422, {
        error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
        next_endpoint: `${transaction_id}/phone-change/otp/send`,
      });
    }

    const otp_verify_endpoint = `${transaction_id}/phone-change/otp/verify`;
    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression:
          "set phone_validation_attempt_count = :attemptCount, next_endpoint = :next_endpoint",
        ExpressionAttributeValues: {
          ":attemptCount": new_phone_validation_attempt_count,
          ":next_endpoint": otp_verify_endpoint,
        },
      });
    } catch (error: any) {
      throw new Error(`Error updating transaction: ${error?.message || error}`);
    }

    return apiResponse(422, {
      error_code: OTP_INVALID_REATTEMPT,
      next_endpoint: otp_verify_endpoint,
    });
  }

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });

  if (!queryUserTableRes?.Items?.length) {
    logger.warn(`[suspicious_activity] No user record found in ${USER_TABLE}`);
    throw new Error(`No user record found in ${USER_TABLE}`);
  }

  const bankingService = await BankingService.init(onmouuid, forceHal);

  // Get customer details to fetch email
  const customerSummary = await bankingService.customerSummary();
  if (!customerSummary.ok) {
    logger.error(`Failed to fetch customer summary: ${serializeError(customerSummary.error)}`);
    throw new Error("Failed to fetch customer summary");
  }

  const email_address = customerSummary.data.email;
  if (!email_address) {
    logger.error(`Missing email address in customer details`);
    throw new Error("Missing primary email address in customer details");
  }

  // OTP verification successful - now proceed to email verification
  const next_endpoint_email = `${transaction_id}/phone-change/email/send`;

  // Update transaction record with phone validation success and user email
  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "phone_validation_status = :phoneValidationStatus",
      "verification_steps_completed = list_append(if_not_exists(verification_steps_completed, :emptyList), :phoneStep)",
      "next_endpoint = :nextEndpoint",
      "phone_validation_verified_time = :verifiedTime",
      "phone_validation_attempt_count = :attemptCount",
      "email = :email",
    ].join(", ")}`,
    ExpressionAttributeValues: {
      ":phoneValidationStatus": "verified",
      ":emptyList": [],
      ":phoneStep": ["PHONE_VALIDATED"],
      ":nextEndpoint": next_endpoint_email,
      ":verifiedTime": currentTime,
      ":attemptCount": new_phone_validation_attempt_count,
      ":email": email_address,
    },
  });

  return apiResponse(200, {
    message: "Phone number verification successful",
    next_endpoint: next_endpoint_email,
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(phoneChangeValidateOtp);
