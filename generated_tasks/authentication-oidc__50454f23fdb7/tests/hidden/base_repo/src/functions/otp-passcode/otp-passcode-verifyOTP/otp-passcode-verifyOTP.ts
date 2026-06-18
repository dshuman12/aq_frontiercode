import { deleteItemMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { getFirstTimeLoginScenario } from "@libs/passcode";
import { getTransactionById, checkAndRecordRateLimit, handleExpiredOTP } from "./util";
import { validateTransactionForOTPVerify } from "./validate-transaction";
import {
  AUTH_TRANSACTIONS_TABLE,
  OTP_ATTEMPT_LIMIT,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
} from "@libs/config";
import { OTP_PASSCODE_OTP_VERIFY } from "../otp-passcode.constants";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  phone_number: z.string(),
  verify_code: z.number(),
});
const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  body: jsonBody(bodySchema),
});

const otpPasscodeVerifyOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { phone_number, verify_code: suppliedVerifyCode } = parsedEvent.data.body;
  logger.addContext("phone_number", phone_number);

  let transactionRecord: Record<string, any>;
  try {
    transactionRecord = await getTransactionById({
      transaction_id,
      auth_transactions_table: AUTH_TRANSACTIONS_TABLE,
    });
  } catch (error: any) {
    if (error.message === "Transaction not found") {
      return apiResponse(400, { message: "Bad Request" });
    }
    throw error;
  }
  const { onmouuid, otp_sms_attempt_count, verify_code: storedVerifyCode } = transactionRecord;

  if (!onmouuid) {
    logger.warn("Transaction does not have onmouuid");
    return apiResponse(400, { message: "Bad Request" });
  }
  logger.addContext("onmouuid", onmouuid);

  const rateLimitResponse = await checkAndRecordRateLimit({
    onmouuid,
    action: "otp_sms_verify",
    domain: "auth_login",
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    validateTransactionForOTPVerify({
      transactionRecord,
      transaction_id,
      phone_number,
      storedVerifyCode,
    });
  } catch (error: any) {
    logger.warn(error.message);
    return apiResponse(400, { message: "Bad Request" });
  }

  const expiredOTPResponse = await handleExpiredOTP({
    transactionRecord,
    transaction_id,
    auth_transactions_table: AUTH_TRANSACTIONS_TABLE,
  });
  if (expiredOTPResponse) {
    return expiredOTPResponse;
  }

  const new_otp_sms_attempt_count = otp_sms_attempt_count + 1;
  logger.addContext("otp_sms_attempt_count", new_otp_sms_attempt_count);

  if (suppliedVerifyCode !== storedVerifyCode) {
    logger.warn("Supplied verify code does not match stored verify code");

    if (new_otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);

      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }

      return apiResponse(422, {
        error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
        next_endpoint: "authorize/otp-passcode",
      });
    }

    const otp_verify_endpoint = `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}`;
    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression:
          "set otp_sms_attempt_count = :otpAttemptCount, next_endpoint = :next_endpoint",
        ExpressionAttributeValues: {
          ":otpAttemptCount": new_otp_sms_attempt_count,
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

  try {
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "otp_sms_attempt_count = :otpAttemptCount",
        "otp_sms_verified = :otpVerified",
        "passcode_attempt_count = :passcodeAttemptCount",
        "passcode_verified = :passcodeVerified",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":otpAttemptCount": new_otp_sms_attempt_count,
        ":otpVerified": true,
        ":passcodeAttemptCount": 0,
        ":passcodeVerified": false,
        ":nextEndpoint": `${transaction_id}/otp-passcode/passcode/verify`,
      },
    });
  } catch (error: any) {
    throw new Error(
      `Error updating transaction with otp_sms_verified=true passcode_verified=false: ${error?.message || error}`,
    );
  }

  const loginScenario = await getFirstTimeLoginScenario({ onmouuid });
  logger.addContext("login_scenario", loginScenario);
  logger.info(`Resolved login scenario ${loginScenario}`);

  return apiResponse(200, {
    next_endpoint: `${transaction_id}/otp-passcode/passcode/verify`,
    login_scenario: loginScenario,
  });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(otpPasscodeVerifyOTP);
