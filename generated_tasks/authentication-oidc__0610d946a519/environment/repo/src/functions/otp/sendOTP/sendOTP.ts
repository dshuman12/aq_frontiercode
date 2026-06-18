import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { hasRecordExpired } from "@libs/utils";
import { AUTH_TRANSACTIONS_TABLE, ENV, OTP_AUTH_FLOW } from "@libs/constants";
import { checkIfTestNumber, generateVerifyCode, sendSMS } from "@libs/sms";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { AuthorizerEvent } from "@libs/shared";
import { getLogger } from "@libs/logger";
import { UserRecordsService } from "@services/user/user";
import { TransactionsService } from "@services/transaction/transaction";
import { toHttpResponse } from "@onmoapp/core-banking";
import { BankingService } from "@services/banking/bankingService";

type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id: string };
};
type ParsedRequestBody = { onmouuid?: string };

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  const userRecordsService = new UserRecordsService(logger);
  const transactionsService = new TransactionsService(logger);
  const forcedCodePath = event.headers?.["x-force-hal"];

  try {
    const { transaction_id } = event.pathParameters;
    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });

    const { onmouuid: requestOnmoId }: ParsedRequestBody = JSON.parse(event.body);
    if (!requestOnmoId) {
      logger.warn("Missing onmouuid in request body");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ requestOnmoId });

    const userRecord = await userRecordsService.byId(requestOnmoId);
    if (!userRecord.ok) return toHttpResponse(userRecord, { status: 400 });

    logger.addContext({ user: userRecord.data });

    const queryTransactionsTableRes = await transactionsService.transaction(transaction_id);
    if (!queryTransactionsTableRes.ok)
      return toHttpResponse(queryTransactionsTableRes, { status: 400 });

    const transactionRecord = queryTransactionsTableRes.data;

    const { auth_flow, otp_sms_verified, onmouuid, ttl } = transactionRecord;

    if (hasRecordExpired(ttl)) {
      logger.warn(
        `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (otp_sms_verified) {
      logger.warn(
        `[suspicious_activity] Transaction with transaction_id ${transaction_id} has already had otp verified`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (onmouuid !== requestOnmoId) {
      logger.warn("[suspicious_activity] Onmouuid on transaction does not match provided one");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (auth_flow !== OTP_AUTH_FLOW) {
      logger.warn(
        `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_AUTH_FLOW}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ auth_flow });

    logger.info("Initialising core banking adapter");
    // get customer summary
    const service = await BankingService.init(onmouuid, logger, forcedCodePath);
    const customerSummary = await service.customerSummary();
    if (!customerSummary.ok) return toHttpResponse(customerSummary);

    const { mobile: mobile_phone } = customerSummary.data;

    const isTestNumber = checkIfTestNumber(mobile_phone);
    const verifyCode = isTestNumber ? 1111 : generateVerifyCode();

    if (mobile_phone !== userRecord.data.mobile) {
      logger.warn(
        `[suspicious_activity] user phone number does not match LMS: ${mobile_phone} - User Table: ${userRecord.data.mobile}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression:
          "set verify_code = :verifyCodeValue, otp_sms_verified = :otpVerifiedValue",
        ExpressionAttributeValues: { ":verifyCodeValue": verifyCode, ":otpVerifiedValue": false },
      });
    } catch (error: any) {
      throw new Error(
        `Error updating the transaction with the OTP code ${error?.message || error}`,
      );
    }
    logger.info(`Updated transaction with OTP code ${verifyCode}`);

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
          return formatJSONResponse({
            statusCode: 400,
            body: { message: "Failed to validate phone number" },
          });
        }

        logger.error(`Error sending OTP code: ${error}`);
        throw new Error(`Error sending OTP`);
      }
      logger.info(`Sent OTP code ${verifyCode} to ${mobile_phone}`);
    }

    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "OTP sent successfully",
        next_endpoint: `${transaction_id}/otp/verify`,
        last_four_digits: mobile_phone.replaceAll(" ", "").slice(-4),
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
