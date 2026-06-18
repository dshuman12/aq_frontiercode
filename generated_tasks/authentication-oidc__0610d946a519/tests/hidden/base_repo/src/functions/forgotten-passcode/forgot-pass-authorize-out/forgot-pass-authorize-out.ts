import {
  AUTH_TRANSACTIONS_TABLE,
  COMPLETED_STATUS,
  EXCLUSIVE_SCOPES_PARAM,
  FIFTEEN_MINUTES,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  PASSCODE_CHANGE_SCOPE,
  SUPPORTED_CREDIT_ACCOUNT_STATES,
  USER_TABLE,
} from "@libs/constants";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { putItemMethod } from "@onmoapp/onmo-dynamodb";
import { getParameter } from "@onmoapp/onmo-ssm";
import { v4 as uuidv4 } from "uuid";
import { AuthorizerEvent, checkRateLimit, jsonCodec } from "@libs/shared";
import { z } from "zod";
import { toHttpResponse } from "@onmoapp/core-banking";
import { UserRecordsService } from "@services/user/user";
import { TransactionsService } from "@services/transaction/transaction";
import { BankingService } from "@services/banking/bankingService";
import { getLogger } from "@libs/logger";

const newScopes = [PASSCODE_CHANGE_SCOPE];

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  const forcedCodePath = event.headers?.["x-force-hal"];
  const userRecordsService = new UserRecordsService(logger);
  const transactionsService = new TransactionsService(logger);

  try {
    const { phone_number, device_id, code_challenge } = jsonCodec(
      z.object({
        phone_number: z.string("missing required phone number from event.body"),
        device_id: z.string("missing required device_id from event.body"),
        code_challenge: z.string("missing required code_challenge from event.body"),
      }),
    ).parse(event.body);
    logger.addContext({ phone_number, device_id });

    const userRecordsResult = await userRecordsService.byPhoneNumber(phone_number);

    if (!userRecordsResult.ok) return toHttpResponse(userRecordsResult);

    const completedStatusRecords = userRecordsResult.data.filter(
      (record) => record.onboardedStatus === COMPLETED_STATUS,
    );

    if (completedStatusRecords.length === 0) {
      throw new Error(`No fully onboarded record found in ${USER_TABLE} for phone_number`);
    }
    if (completedStatusRecords.length > 1) {
      throw new Error(`Multiple fully onboarded records found in ${USER_TABLE} for phone_number`);
    }

    const userRecord = completedStatusRecords[0];

    const { id: onmouuid } = userRecord;
    logger.addContext({ onmouuid });

    const rateLimiter = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_forgotten_passcode",
        action: "authorize",
      },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    const bankingClient = await BankingService.init(onmouuid, logger, forcedCodePath);

    const accountState = await bankingClient.creditAccountSummary();
    if (!accountState.ok) return toHttpResponse(accountState);

    // check that account state is supported app forgotten passcode
    if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(accountState.data.state)) {
      throw new Error(
        `Credit card account in ${USER_TABLE} table is not in valid state. Account state is: ${accountState.data} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
      );
    }

    const customerDetails = await bankingClient.customerSummary();
    if (!customerDetails.ok) return toHttpResponse(customerDetails);

    const { email: email_address, firstName: first_name } = customerDetails.data;

    if (customerDetails.data.mobile !== phone_number) {
      throw new Error(
        `Phone number in ${USER_TABLE} table does not match the one registered to credit card account`,
      );
    }

    const { Parameter: exclusiveParameter } = await getParameter({ Name: EXCLUSIVE_SCOPES_PARAM });
    if (!exclusiveParameter?.Value) {
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

    // if any, delete all current transaction for this onmouuid with same scopes
    const removeTransById = await transactionsService.deleteByOnmoId(onmouuid, [
      {
        newScopes,
        exclusiveScopes,
      },
    ]);
    if (!removeTransById.ok) return toHttpResponse(removeTransById);

    // if any, delete all current transaction for this device_id
    const removeTransByDev = await transactionsService.deleteByDeviceId(device_id);
    if (!removeTransByDev.ok) return toHttpResponse(removeTransByDev);

    const transaction_id = uuidv4();
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
    const next_endpoint = `${transaction_id}/forgotten-passcode/otp/send`;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        device_id,
        onmouuid,
        phone_number,
        email_address,
        first_name,
        create_refresh_token: false,
        scope: newScopes.join(","),
        code_challenge,
        next_endpoint,
        auth_flow: FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
        otp_sms_send_count: 0,
        otp_sms_attempt_count: 0,
        otp_sms_verified: false,
        otp_email_send_count: 0,
        otp_email_attempt_count: 0,
        otp_email_verified: false,
        ttl,
      },
    });
    return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
