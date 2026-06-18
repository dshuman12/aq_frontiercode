import {
  AUTH_TRANSACTIONS_TABLE,
  EMAIL_CHANGE_FLOW,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  FIVE_MINUTES,
  USER_TABLE,
} from "@libs/config";
import { getForceHalHeader } from "@libs/gatewayUtils";
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
import { BankingService } from "@services/banking/bankingService";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
});

const extraScopeSendOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  try {
    const rateLimiter = new RateLimiter();
    const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
      await rateLimiter.checkLimits({
        onmouuid: authOnmouuid,
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
      onmouuid: authOnmouuid,
      domain: "auth_extra_scope",
      action: "otp_sms_send",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": transaction_id },
  });
  if (!queryTransactionsTableRes?.Items?.length) {
    logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const transactionRecord = queryTransactionsTableRes.Items[0];
  if (!transactionRecord.onmouuid) {
    logger.warn("Transaction does not have onmouuid");
    return apiResponse(400, { message: "Bad Request" });
  }
  const {
    onmouuid: transactionOnmouuid,
    otp_sms_attempt_count,
    otp_sms_send_count,
  } = transactionRecord;
  logger.addContext("transactionOnmouuid", transactionOnmouuid);

  if (transactionOnmouuid !== authOnmouuid) {
    logger.warn("[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid");
    return apiResponse(403, { message: "Bad Request" });
  }

  const { auth_flow, extra_scope_flow } = transactionRecord;
  try {
    if (!auth_flow) {
      logger.warn("[suspicious_activity] Transaction does not have auth_flow");
      return apiResponse(400, { message: "Bad Request" });
    }
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW) {
      logger.warn(
        `[suspicious_activity] Transaction auth_flow: ${auth_flow}, expected: ${EXTRA_SCOPE_AUTH_FLOW}`,
      );
      return apiResponse(400, { message: "Bad Request" });
    }
    logger.addContext("auth_flow", auth_flow);
    if (!extra_scope_flow) {
      logger.warn("[suspicious_activity] Transaction does not have extra_scope_flow");
      return apiResponse(400, { message: "Bad Request" });
    }
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW
    ) {
      logger.warn(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or ${EMAIL_CHANGE_FLOW}`,
      );
      return apiResponse(400, { message: "Something went wrong" });
    }
    logger.addContext("extra_scope_flow", extra_scope_flow);

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (transactionRecord.create_refresh_token) {
      throw new Error("Transaction has create_refresh_token=true");
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

    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction missing otp_sms_send_count");
    }
    if (otp_sms_send_count !== 0) {
      throw new Error(`Transaction otp_sms_send_count should be 0 but is ${otp_sms_send_count}`);
    }
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction missing otp_sms_send_count");
    }

    if (otp_sms_attempt_count !== 0) {
      throw new Error(`Transaction otp_sms_attempt_count should be 0 but is ${otp_sms_send_count}`);
    }
    if ("otp_sms_expiry_time" in transactionRecord) {
      throw new Error(`otp_sms_expiry_time in transaction`);
    }
    if (transactionRecord.phone_number) {
      throw new Error("Transaction already has phone_number");
    }
    if (transactionRecord.auth_code) {
      throw new Error("Transaction already been used for an auth code");
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/extra-scope/otp/send`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/extra-scope/otp/send, but received: ${transactionRecord.next_endpoint}`,
      );
    }
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": transactionOnmouuid },
  });
  if (!queryUserTableRes?.Items?.length) {
    logger.warn(`[suspicious_activity] No record in ${USER_TABLE} found`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const userRecord = queryUserTableRes.Items[0];

  const { phonenumber: phone_number } = userRecord;

  const bankingService = await BankingService.init(transactionOnmouuid, forceHal);

  const customerDetails = await bankingService.customerSummary();
  if (!customerDetails.ok) {
    logger.error(
      `Error fetching core banking customer details: ${serializeError(customerDetails.error)}`,
    );
    throw new Error("Error fetching core banking customer details");
  }

  if (customerDetails.data.id !== transactionOnmouuid) {
    logger.warn(
      `Customer id in ${USER_TABLE} table does not match the one registered to client account`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  if (customerDetails.data.mobile !== phone_number) {
    logger.warn(
      `Phone number in ${USER_TABLE} table does not match the one registered to credit card account`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }

  const isTestNumber = checkIfTestNumber(phone_number);
  const verifyCode = isTestNumber ? 1111 : generateVerifyCode();

  if (!isTestNumber) {
    try {
      await sendSMS({
        phoneNumber: phone_number,
        messageBody: generateOTPMessageBody(verifyCode, ENV),
      });
    } catch (error: any) {
      if (error?.message?.startsWith("ValidationError:")) {
        logger.warn(`Error sending OTP code: ${error}`);
        return apiResponse(400, { message: "Failed to validate phone number" });
      }

      logger.error(`Error sending OTP code: ${error}`);
      throw new Error(`Error sending OTP`);
    }
  }

  const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
  const next_endpoint = `${transaction_id}/extra-scope/otp/verify`;

  await updateItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Key: { transaction_id },
    UpdateExpression: `set ${[
      "phone_number = :phoneNumber",
      "verify_code = :verifyCode",
      "otp_sms_expiry_time = :otpExpiryTime",
      "otp_sms_send_count = :otpSendCount",
      "next_endpoint = :nextEndpoint",
    ].join(", ")}`,
    ExpressionAttributeValues: {
      ":phoneNumber": phone_number,
      ":verifyCode": verifyCode,
      ":otpExpiryTime": otpExpiryTime,
      ":otpSendCount": otp_sms_send_count + 1, // 0 + 1
      ":nextEndpoint": next_endpoint,
    },
  });

  return apiResponse(200, { message: "OTP sent successfully", next_endpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(extraScopeSendOTP);
