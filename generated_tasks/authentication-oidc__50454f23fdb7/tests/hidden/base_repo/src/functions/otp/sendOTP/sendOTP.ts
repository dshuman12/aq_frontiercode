import { AUTH_TRANSACTIONS_TABLE, ENV, OTP_AUTH_FLOW, USER_TABLE } from "@libs/config";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { checkIfTestNumber, generateVerifyCode, sendSMS } from "@libs/sms";
import { hasRecordExpired } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { BankingService } from "@services/banking/bankingService";
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
  onmouuid: z.string(),
});
const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  body: jsonBody(bodySchema),
});

const sendOTP = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);

  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  const { onmouuid } = parsedEvent.data.body;
  logger.addContext("onmouuid", onmouuid);

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryUserTableRes?.Items?.length) {
    logger.warn(`[suspicious_activity] User not found in ${USER_TABLE}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { phonenumber } = queryUserTableRes.Items![0];

  if (!phonenumber) {
    logger.warn(`Missing phonenumber for user in ${USER_TABLE}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  logger.addContext("phone_number", phonenumber);

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
  const { auth_flow } = transactionRecord;

  if (hasRecordExpired(transactionRecord.ttl)) {
    logger.warn(
      `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  if (transactionRecord.otp_sms_verified) {
    logger.warn(
      `[suspicious_activity] Transaction with transaction_id ${transaction_id} has already had otp verified`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  if (!transactionRecord.onmouuid) {
    logger.warn("Transaction does not have onmouuid");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (transactionRecord.onmouuid !== onmouuid) {
    logger.warn("[suspicious_activity] Onmouuid on transaction does not match provided one");
    return apiResponse(400, { message: "Bad Request" });
  }

  if (!auth_flow) {
    logger.warn("[suspicious_activity] Missing auth_flow in transaction");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (auth_flow !== OTP_AUTH_FLOW) {
    logger.warn(
      `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_AUTH_FLOW}`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  logger.addContext("auth_flow", auth_flow);

  const bankingService = await BankingService.init(onmouuid, forceHal);

  const customerSummary = await bankingService.customerSummary();
  if (!customerSummary.ok) {
    logger.error(`Error getting customer summary: ${serializeError(customerSummary.error)}`);
    throw new Error("Error getting customer summary");
  }

  const mobile_phone = customerSummary.data.mobile;
  const customerId = customerSummary.data.id;
  if (!mobile_phone) {
    logger.warn("Missing mobile number on customer details");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (!customerId) {
    logger.warn("Missing customer id on customer details");
    return apiResponse(400, { message: "Bad Request" });
  }
  if (mobile_phone !== phonenumber) {
    logger.warn(
      `[suspicious_activity] phonenumber in ${USER_TABLE} does not match on customer details`,
    );
    return apiResponse(400, { message: "Bad Request" });
  }
  if (customerId !== onmouuid) {
    logger.warn("[suspicious_activity] Onmouuid does not match customer id on customer details");
    return apiResponse(400, { message: "Bad Request" });
  }

  const isTestNumber = checkIfTestNumber(mobile_phone);
  const verifyCode = isTestNumber ? 1111 : generateVerifyCode();

  try {
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: "set verify_code = :verifyCodeValue, otp_sms_verified = :otpVerifiedValue",
      ExpressionAttributeValues: { ":verifyCodeValue": verifyCode, ":otpVerifiedValue": false },
    });
  } catch (error: any) {
    throw new Error(`Error updating the transaction with the OTP code ${error?.message || error}`);
  }

  if (!isTestNumber) {
    const messageBody = [
      `Your Onmo verification code is ${verifyCode}`,
      `${ENV === "prod" ? "@onmo.app" : "@staging.onmo.app"} #${verifyCode}`,
    ].join("\n\n");

    try {
      await sendSMS({ phoneNumber: mobile_phone, messageBody });
    } catch (error: any) {
      if (error?.message?.startsWith("ValidationError:")) {
        logger.warn(`Error sending OTP code: ${error}`);
        return apiResponse(400, { message: "Failed to validate phone number" });
      }

      logger.error(`Error sending OTP code: ${error}`);
      throw new Error(`Error sending OTP`);
    }
  }

  return apiResponse(200, {
    message: "OTP sent successfully",
    next_endpoint: `${transaction_id}/otp/verify`,
    last_four_digits: mobile_phone.replaceAll(" ", "").slice(-4),
  });
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(sendOTP);
