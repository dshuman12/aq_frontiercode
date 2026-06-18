import {
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  EXCLUSIVE_SCOPES_PARAM,
  FIFTEEN_MINUTES,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  NON_CONFLICT_SCOPES_PARAM,
  PASSCODE_CHANGE_SCOPE,
} from "@libs/constants";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { noScopeConflict } from "@libs/scopes";
import { getCurrentTimestampInSeconds, toLMSResult } from "@libs/utils";
import { putItemMethod } from "@onmoapp/onmo-dynamodb";
import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { getParameter } from "@onmoapp/onmo-ssm";
import { v4 as uuidv4 } from "uuid";
import { AuthorizerEvent, checkRateLimit, jsonCodec } from "@libs/shared";
import { toHttpResponse } from "@onmoapp/core-banking";
import { UserRecordsService } from "@services/user/user";
import { TransactionsService } from "@services/transaction/transaction";
import { z } from "zod";
import { BankingService } from "@services/banking/bankingService";

const eventSchema = z.object({
  onmouuid: z.string(),
  device_id: z.string(),
  code_challenge: z.string(),
});

const newScopes = [PASSCODE_CHANGE_SCOPE];

export const handler = async (event: AuthorizerEvent) => {
  const logger = new Logger({ ENV }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");
  const forcedCodePath = event.headers?.["x-force-hal"];
  try {
    const { onmouuid: authOnmouuid, scope: authScope } = event.requestContext.authorizer;

    const payload = jsonCodec(eventSchema).safeDecode(event.body);
    if (!payload.success) return toHttpResponse(toLMSResult(payload));

    const { onmouuid: requestOnmouuid, device_id, code_challenge } = payload.data;
    logger.addContext({ requestOnmouuid });

    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }

    const rateLimit = await checkRateLimit(
      {
        onmouuid: authOnmouuid,
        domain: "auth_forgotten_passcode",
        action: "authorize",
      },
      logger,
    );
    if (rateLimit) return rateLimit;

    if (!device_id) {
      throw new Error("Missing device_id in request");
    }
    if (!authScope) {
      throw new Error("Missing scope from authorizer");
    }
    if (!requestOnmouuid) {
      throw new Error("Missing onmouuid in request");
    }
    if (!code_challenge) {
      throw new Error("Missing code_challenge in request");
    }
    if (requestOnmouuid !== authOnmouuid) {
      throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
    }
    const newAndPrevScopes = [...newScopes, ...authScope.split(",")];

    const [{ Parameter: nonConflictParameter }, { Parameter: exclusiveParameter }] =
      await Promise.all([
        getParameter({ Name: NON_CONFLICT_SCOPES_PARAM }),
        getParameter({ Name: EXCLUSIVE_SCOPES_PARAM }),
      ]);
    if (!nonConflictParameter?.Value || !exclusiveParameter?.Value) {
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const nonConflictGroups = JSON.parse(nonConflictParameter.Value) as string[][];
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

    // check for conflict with change-passcode scope & existing scopes
    const noScopeConflicts = noScopeConflict({
      newScopes: newAndPrevScopes,
      nonConflictGroups,
    });
    if (!noScopeConflicts) {
      throw new Error(`Conflict in ${PASSCODE_CHANGE_SCOPE} scope`);
    }

    // Services
    const bankingService = await BankingService.init(requestOnmouuid, logger, forcedCodePath);
    const userRecordsService = new UserRecordsService(logger);
    const transactionsService = new TransactionsService(logger);
    // get user record for verification...

    const userRecord = await userRecordsService.byId(requestOnmouuid);
    if (!userRecord.ok) return toHttpResponse(userRecord);

    // get customerSummary

    const customerSummary = await bankingService.customerSummary();

    if (!customerSummary.ok) return toHttpResponse(customerSummary);

    const {
      firstName: first_name,
      email: email_address,
      mobile: phone_number,
    } = customerSummary.data;

    // if any, delete all current transaction for this onmouuid with same scopes
    const remTransById = await transactionsService.deleteByOnmoId(authOnmouuid, [
      {
        newScopes,
        exclusiveScopes,
      },
    ]);
    if (!remTransById.ok) return toHttpResponse(remTransById);

    // if any, delete all current transaction for this device_id

    const remTransByDevice = await transactionsService.deleteByDeviceId(device_id);
    if (!remTransByDevice.ok) return toHttpResponse(remTransByDevice);

    const transaction_id = uuidv4();
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
    const next_endpoint = `${transaction_id}/forgotten-passcode/otp/send`;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        device_id,
        onmouuid: requestOnmouuid,
        phone_number,
        email_address,
        first_name,
        create_refresh_token: false,
        scope: newAndPrevScopes.join(","),
        code_challenge,
        next_endpoint,
        auth_flow: FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
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
