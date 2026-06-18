import { formatJSONResponse } from "@libs/gatewayUtils";
import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { generateAuthCode } from "@libs/crypto";
import {
  checkRateLimit,
  ExtraScopeEvent,
  verifySignedChallenge,
  voidTransaction,
  writeAuthCode,
} from "@libs/shared";
import {
  ensureBaseTransactionIntegrity,
  ensureRequestIntegrity,
  ensureVerifyBiometricsTransactionIntegrity,
} from "@libs/integrity";
import { TransactionsService } from "@services/transaction/transaction";
import { getLogger } from "@libs/logger";
import { toHttpResponse } from "@onmoapp/core-banking";
import { AUTH_TRANSACTIONS_TABLE } from "@libs/constants";
import { z } from "zod";

type HandlerEvent = {
  body: string;
} & ExtraScopeEvent;
type ParsedRequestBody = { signed_challenge: string; device_id: string };

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  const requestIntegrityResponse = ensureRequestIntegrity(event, logger);
  if (!requestIntegrityResponse.ok) {
    return toHttpResponse(requestIntegrityResponse);
  }

  const { transactionId, authorizedUuid } = requestIntegrityResponse.data;

  const transactionService = new TransactionsService(logger);

  try {
    const rateLimitResponse = await checkRateLimit(
      {
        onmouuid: authorizedUuid,
        domain: "auth_extra_scope",
        action: "biometrics_verify",
      },
      logger,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { signed_challenge, device_id }: ParsedRequestBody = JSON.parse(event.body);
    if (!signed_challenge) {
      throw new Error("Missing signed_challenge in request");
    }
    if (!device_id) {
      throw new Error("Missing device_id in request");
    }

    const transactionRecord = await transactionService.transaction(transactionId);
    if (!transactionRecord.ok) return toHttpResponse(transactionRecord);

    const nextEndpoint = `${transactionId}/extra-scope/biometrics/verify`;
    const baseIntegrityResponse = ensureBaseTransactionIntegrity(
      transactionRecord.data,
      nextEndpoint,
      authorizedUuid,
      logger,
      {
        fe_public_key: z.string(),
        unsigned_challenge: z.string(),
      },
    );
    if (!baseIntegrityResponse.ok) {
      return toHttpResponse(baseIntegrityResponse);
    }

    const { unsigned_challenge, fe_public_key } = baseIntegrityResponse.data;

    ensureVerifyBiometricsTransactionIntegrity(transactionRecord, device_id, logger);

    logger.info("Request & transaction is valid, verifying signed challenge...");

    verifySignedChallenge(unsigned_challenge, signed_challenge, fe_public_key, logger);

    const token_endpoint = "token";
    const authCode = generateAuthCode();
    logger.addContext({ authCode });

    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transactionId },
        UpdateExpression: `set ${[
          "auth_code = :authCode",
          "biometrics_verified = :biometricsVerified",
          "next_endpoint = :nextEndpoint",
        ].join(", ")}`,
        ExpressionAttributeValues: {
          ":authCode": authCode,
          ":biometricsVerified": true,
          ":nextEndpoint": token_endpoint,
        },
      });
    } catch (error: any) {
      throw new Error(
        `Error updating transaction with auth code and biometrics_verified=true: ${error?.message || error}`,
      );
    }
    logger.info("Updated transaction record with auth code and biometrics_verified=true");

    await writeAuthCode(transactionRecord, transactionId, authCode, logger);

    return formatJSONResponse({
      statusCode: 200,
      body: { auth_code: authCode, next_endpoint: "token" },
    });
  } catch (error: any) {
    if (transactionId) {
      await voidTransaction(transactionId, logger);
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
