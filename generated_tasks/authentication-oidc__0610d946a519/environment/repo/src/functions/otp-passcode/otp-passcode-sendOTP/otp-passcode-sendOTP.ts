import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds, hasRecordExpired, toLMSResult } from "@libs/utils";
import { deleteItemMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  COMPLETED_STATUS,
  ENV,
  EXCLUSIVE_SCOPES_PARAM,
  FIRST_TIME_LOGIN_FLOW,
  FIVE_MINUTES,
  OTP_PASSCODE_AUTH_FLOW,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
  USER_TABLE,
} from "@libs/constants";
import { checkIfTestNumber, generateVerifyCode } from "@libs/sms";
import { APP_TESTER_NUMBER, AppTesterLoginConfig } from "@libs/testConstants";
import { getParameter } from "@onmoapp/onmo-ssm";
import { AuthorizerEvent, checkRateLimit } from "@libs/shared";
import { toHttpResponse } from "@onmoapp/core-banking";
import { getLogger } from "@libs/logger";
import { TransactionsService } from "@services/transaction/transaction";
import { UserRecordsService } from "@services/user/user";
import { z } from "zod";
import { TransactionRecordSchema } from "@services/transaction/interface";
import { runNotificationProvider } from "@libs/featureFlag";
import { BankingService } from "@services/banking/bankingService";

type ParsedRequestBody = { phone_number: string };

// FOR APP TESTER
const app_tester_login_config = process.env.APP_TESTER_LOGIN_CONFIG as string;

type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id?: string };
};

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  const { transaction_id } = event.pathParameters;
  const forcedCodePath = event.headers?.["x-force-hal"];

  const transactionsService = new TransactionsService(logger);
  const userRecordsService = new UserRecordsService(logger);

  try {
    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });
    const { phone_number }: ParsedRequestBody = JSON.parse(event.body);
    if (!phone_number) {
      logger.warn("Missing phone_number in request body");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ phone_number });
    logger.info(`Received valid request body: ${event.body}`);

    // FOR APP TESTER
    let isAppTesterNumber = false;
    if (phone_number === APP_TESTER_NUMBER) {
      logger.warn("***** THIS IS APP TESTER NUMBER *****");
      isAppTesterNumber = true;
    }

    const transactionRecord = await transactionsService.transaction(transaction_id);
    if (!transactionRecord.ok)
      return toHttpResponse(transactionRecord, { status: 400, body: { message: "Bad Request" } });

    //TODO: bring in to transactions service.
    const transaction = TransactionRecordSchema.extend({
      auth_code: z
        .string()
        .optional()
        .refine((val) => val === undefined),
      auth_flow: z.string().refine((val) => val === OTP_PASSCODE_AUTH_FLOW),
      login_flow: z.string().refine((val) => val === FIRST_TIME_LOGIN_FLOW),
      ttl: z.number().refine((val) => !hasRecordExpired(val)),
      next_endpoint: z.string().refine((val) => val === `${transaction_id}/otp-passcode/otp/send`),
      create_refresh_token: z.boolean().refine((val) => val),
      code_challenge: z.string(),
      scope: z.string(),
      device_id: z.string(),
      otp_sms_send_count: z.number().refine((val) => val === 0),
      otp_sms_attempt_count: z.number().refine((val) => val === 0),
      otp_sms_expiry_time: z
        .number()
        .optional()
        .refine((val) => val === undefined),
      phone_number: z
        .string()
        .optional()
        .refine((val) => val === undefined),
      onmouuid: z.undefined("onmouuid should be undefined on first time login"),
    }).safeParse(transactionRecord.data);

    if (!transaction.success)
      return toHttpResponse(toLMSResult(transaction), { body: { message: "Bad Request" } });

    const userRecords = await userRecordsService.byPhoneNumber(phone_number);

    if (!userRecords.ok || !userRecords.data.length) {
      if (transaction_id) {
        logger.info("Voiding transaction");
        const delRes = await transactionsService.delete(transaction_id);
        if (!delRes.ok) return toHttpResponse(delRes);
      }
      logger.warn(`[suspicious_activity] No record in ${USER_TABLE} found for phone_number`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    const completedStatusRecords = userRecords.data.filter(
      (record) => record.onboardedStatus === COMPLETED_STATUS,
    );
    if (completedStatusRecords.length === 0) {
      if (transaction_id) {
        logger.info("Voiding transaction");
        const deleteRes = await transactionsService.delete(transaction_id);
        if (!deleteRes.ok) {
          logger.error(`Failed to void transaction`);
          return toHttpResponse(deleteRes);
        }
        logger.info("Transaction successfully voided");
      }
      logger.warn(`No fully onboarded record found in ${USER_TABLE} for phone_number`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (completedStatusRecords.length > 1) {
      throw new Error(`Multiple fully onboarded records found in ${USER_TABLE} for phone_number`);
    }
    const userRecord = completedStatusRecords[0];
    const { id: onmouuid } = userRecord;

    if (!userRecord.creditAccountId) {
      // It would actually fail regardless but here for regression
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    logger.addContext({ onmouuid });

    const { Parameter: exclusiveParameter } = await getParameter({ Name: EXCLUSIVE_SCOPES_PARAM });
    if (!exclusiveParameter?.Value) {
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

    // if any, delete all other current transaction for this onmouuid with same scopes
    const remTransByIdRes = await transactionsService.deleteByOnmoId(userRecord.id, [
      {
        newScopes: transactionRecord.data.scope?.split(",") ?? [],
        exclusiveScopes,
      },
    ]);
    if (!remTransByIdRes.ok) return toHttpResponse(remTransByIdRes);

    const rateLimiter = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_login",
        action: "otp_sms_send",
      },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    logger.info("Initialising core banking adapter");
    const bankingServiceClient = await BankingService.init(onmouuid, logger, forcedCodePath);
    const account = await bankingServiceClient.creditAccountSummary();
    if (!account.ok) {
      logger.error(account);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    const { state } = account.data;

    // check that account state is supported for app login
    if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(state)) {
      logger.warn(
        `Credit card account in ${USER_TABLE} table is not in valid state. Account state is: ${account.data} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    const customerDetails = await bankingServiceClient.customerSummary();
    if (!customerDetails.ok) return toHttpResponse(customerDetails);

    if (customerDetails.data.id !== onmouuid) {
      logger.warn(
        `[suspicious_activity] [suspicious_activity]Customer id in ${USER_TABLE} table does not match the one registered to client account`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (customerDetails.data.mobile !== phone_number) {
      logger.warn(
        `Phone number in ${USER_TABLE} table does not match the one registered to credit card account`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    const isTestNumber = checkIfTestNumber(phone_number);
    let verifyCode;

    // FOR APP TESTER
    if (isAppTesterNumber) {
      try {
        const { Parameter: appTesterParam } = await getParameter({
          Name: app_tester_login_config,
        });
        if (!appTesterParam?.Value) {
          throw new Error(`Failed to fetch app tester login config parameter from ssm`);
        }
        const { enabled, sms_otp, passcode } = JSON.parse(
          appTesterParam.Value,
        ) as AppTesterLoginConfig;
        logger.addContext({ APP_TESTER_SMS_OTP: sms_otp, APP_TESTER_PASSCODE: passcode });

        if (!sms_otp) {
          throw new Error("Missing sms otp in SSM param");
        }
        if (!passcode) {
          throw new Error("Missing passcode in SSM param");
        }
        if (!enabled) {
          throw new Error("App tester login config is disabled");
        }
        verifyCode = sms_otp;

        logger.warn("App tester login config retrieved successfully");
      } catch (error: any) {
        throw new Error("Failed to get app tester login config");
      }
    }
    // FOR TEST NUMBERS (staging only)
    else if (isTestNumber) {
      verifyCode = 1111;
    }
    // NORMAL VERIFY CODE
    else {
      verifyCode = generateVerifyCode();
    }
    logger.addContext({ verifyCode });

    if (!isTestNumber && !isAppTesterNumber) {
      try {
        await runNotificationProvider(
          onmouuid,
          verifyCode,
          phone_number,
          "passcode-send-otp",
          ENV,
          logger,
        );

        logger.info(`Sent OTP code ${verifyCode} to ${phone_number}`);
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
    }

    const otpExpiryTime = getCurrentTimestampInSeconds() + FIVE_MINUTES;
    const next_endpoint = `${transaction_id}/otp-passcode/otp/verify`;

    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "onmouuid = :onmouuid",
        "phone_number = :phoneNumber",
        "verify_code = :verifyCode",
        "otp_sms_expiry_time = :otpExpiryTime",
        "otp_sms_send_count = :otpSendCount",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":onmouuid": onmouuid,
        ":phoneNumber": phone_number,
        ":verifyCode": verifyCode,
        ":otpExpiryTime": otpExpiryTime,
        ":otpSendCount": transaction.data.otp_sms_send_count + 1, // 0 + 1
        ":nextEndpoint": next_endpoint,
      },
    });
    logger.info(`Updated transaction, returning 200`);

    return formatJSONResponse({
      statusCode: 200,
      body: { message: "OTP sent successfully", next_endpoint },
    });
  } catch (error: any) {
    if (transaction_id) {
      logger.info("Voiding transaction");
      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
