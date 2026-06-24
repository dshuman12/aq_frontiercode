import { putItemMethod } from "@onmoapp/onmo-dynamodb";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds, toLMSResult } from "@libs/utils";
import {
  AUTH_TRANSACTIONS_TABLE,
  BIOMETRICS_CHANGE_SCOPE,
  BIOMETRICS_REGISTRATION_AUTH_FLOW,
  EXCLUSIVE_SCOPES_PARAM,
  SIXTY_SECONDS,
} from "@libs/constants";
import { getParameter } from "@onmoapp/onmo-ssm";
import { generateUnsignedChallenge } from "@libs/crypto";

import { toHttpResponse } from "@onmoapp/core-banking";
import { UserRecordsService } from "@services/user/user";
import { z } from "zod";
import { AuthorizerEvent, checkRateLimit, jsonCodec } from "@libs/shared";
import { getLogger } from "@libs/logger";
import { TransactionsService } from "@services/transaction/transaction";
import { BankingService } from "@services/banking/bankingService";

const newScopes = [BIOMETRICS_CHANGE_SCOPE];

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  const forcedCodePath = event.headers?.["x-force-hal"];
  try {
    const { onmouuid: authOnmouuid } = event?.requestContext?.authorizer;
    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }
    logger.addContext({ authOnmouuid });

    // rate limit
    const limit = await checkRateLimit(
      {
        onmouuid: authOnmouuid,
        domain: "auth_biometrics_registration",
        action: "initiate",
      },
      logger,
    );
    if (limit !== undefined) return limit;

    const eventSchema = z.object({
      onmouuid: z.string().refine((id) => id === authOnmouuid),
      device_id: z.string(),
      code_challenge: z.string(),
    });

    const payload = jsonCodec(eventSchema).safeDecode(event.body);

    if (!payload.success) return toHttpResponse(toLMSResult(payload));

    const { onmouuid: requestOnmouuid, device_id, code_challenge } = payload.data;

    const { Parameter: exclusiveParameter } = await getParameter({ Name: EXCLUSIVE_SCOPES_PARAM });

    if (!exclusiveParameter?.Value) {
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

    // Services
    const userRecordsService = new UserRecordsService(logger);
    const bankingService = await BankingService.init(requestOnmouuid, logger, forcedCodePath);
    const transactionsService = new TransactionsService();

    const userRecord = await userRecordsService.byId(requestOnmouuid);

    if (!userRecord.ok) return toHttpResponse(userRecord);

    // TODO: collate sec checks
    if (device_id !== userRecord.data.deviceId) {
      throw new Error("Request device id does not match on user record");
    }

    // check customer

    const customerSummary = await bankingService.customerSummary();
    if (!customerSummary.ok) return toHttpResponse(customerSummary);

    // if any, delete all current transaction for this onmouuid with same scopes
    const removeTransByIdRes = await transactionsService.deleteByOnmoId(requestOnmouuid, [
      {
        newScopes,
        exclusiveScopes,
      },
    ]);
    if (!removeTransByIdRes) return toHttpResponse(removeTransByIdRes);

    // if any, delete all current transaction for this device_id
    const removeTransRes = await transactionsService.deleteByDeviceId(device_id);
    if (!removeTransRes.ok) return toHttpResponse(removeTransRes);

    const transaction_id = uuidv4();
    const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
    const next_endpoint = `${transaction_id}/biometrics/register`;
    const unsigned_challenge = generateUnsignedChallenge();

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        device_id,
        onmouuid: requestOnmouuid,
        code_challenge,
        next_endpoint,
        unsigned_challenge,
        auth_flow: BIOMETRICS_REGISTRATION_AUTH_FLOW,
        ttl,
      },
    });

    return formatJSONResponse({
      statusCode: 200,
      body: { transaction_id, next_endpoint, unsigned_challenge },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
