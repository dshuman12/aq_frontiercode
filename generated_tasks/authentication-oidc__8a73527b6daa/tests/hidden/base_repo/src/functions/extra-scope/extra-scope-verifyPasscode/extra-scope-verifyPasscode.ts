import { formatJSONResponse } from "@libs/gatewayUtils";
import { updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  PASSCODE_ATTEMPT_LIMIT,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
} from "@libs/constants";
import { generateAuthCode } from "@libs/crypto";
import { verifyHashedPasscode } from "@libs/passcode";
import { checkRateLimit, ExtraScopeEvent, voidTransaction, writeAuthCode } from "@libs/shared";
import {
  ensureBaseTransactionIntegrity,
  ensureRequestIntegrity,
  ensureVerifyPasscodeTransactionIntegrity,
} from "@libs/integrity";
import { getLogger } from "@libs/logger";
import { TransactionsService } from "@services/transaction/transaction";
import { toHttpResponse } from "@onmoapp/core-banking";
import { z } from "zod";

type HandlerEvent = {
  body: string;
} & ExtraScopeEvent;
type ParsedRequestBody = { passcode?: string };

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();

  const { transaction_id } = event.pathParameters;

  const transactionService = new TransactionsService(logger);

  try {
    const requestIntegrityResponse = ensureRequestIntegrity(event, logger);
    if (requestIntegrityResponse) {
      return requestIntegrityResponse;
    }

    const authorizedUuid = event.requestContext.authorizer.onmouuid;
    const rateLimitResponse = await checkRateLimit(
      {
        onmouuid: authorizedUuid,
        domain: "auth_extra_scope",
        action: "passcode_verify",
      },
      logger,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { passcode: suppliedPasscode }: ParsedRequestBody = JSON.parse(event.body);

    try {
      if (!suppliedPasscode) {
        throw new Error("Missing passcode in request");
      }
      if (!/^\d+$/.test(suppliedPasscode)) {
        throw new Error("Supplied passcode contains non-numeric characters");
      }
      if (suppliedPasscode.length !== 6) {
        throw new Error(`Supplied passcode should be 6 digits but has ${suppliedPasscode.length}`);
      }
    } catch (error: any) {
      logger.warn(error.message);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    logger.info("Got passcode from request");

    const transactionRecordResult = await transactionService.transaction(transaction_id);
    if (!transactionRecordResult.ok) return toHttpResponse(transactionRecordResult);

    const nextEndpoint = `${transaction_id}/extra-scope/passcode/verify`;
    const transactionRecord = ensureBaseTransactionIntegrity(
      transactionRecordResult.data,
      nextEndpoint,
      authorizedUuid,
      logger,
      {
        passcode_attempt_count: z.number(),
      },
    );
    if (!transactionRecord.ok) {
      return toHttpResponse(transactionRecord);
    }

    const { onmouuid: transactionOnmouuid, passcode_attempt_count } = transactionRecord.data;

    const verifyPasscodeIntegrityResponse = ensureVerifyPasscodeTransactionIntegrity(
      transactionRecordResult,
      logger,
    );
    if (verifyPasscodeIntegrityResponse) {
      return verifyPasscodeIntegrityResponse;
    }

    const new_passcode_attempt_count = passcode_attempt_count + 1;
    logger.addContext({ passcode_attempt_count: new_passcode_attempt_count });

    const passcodesMatch = await verifyHashedPasscode({
      passcode: suppliedPasscode,
      onmouuid: transactionOnmouuid,
    });

    if (!passcodesMatch) {
      logger.warn("Supplied passcode does not match stored passcode");

      if (new_passcode_attempt_count >= PASSCODE_ATTEMPT_LIMIT) {
        logger.warn(
          `Transaction has reached total passcode attempt limit of ${PASSCODE_ATTEMPT_LIMIT}`,
        );
        await voidTransaction(transaction_id, logger);
        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
            next_endpoint: `authorize/extra-scope`,
          },
        });
      }

      const passcode_verify_endpoint = `${transaction_id}/extra-scope/passcode/verify`;
      try {
        await updateItemMethod({
          TableName: AUTH_TRANSACTIONS_TABLE,
          Key: { transaction_id },
          UpdateExpression:
            "set passcode_attempt_count = :passcodeAttemptCount, next_endpoint = :nextEndpoint",
          ExpressionAttributeValues: {
            ":passcodeAttemptCount": new_passcode_attempt_count,
            ":nextEndpoint": passcode_verify_endpoint,
          },
        });
      } catch (error: any) {
        throw new Error(`Error updating transaction: ${error?.message || error}`);
      }
      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: PASSCODE_INVALID_REATTEMPT, next_endpoint: passcode_verify_endpoint },
      });
    }
    logger.info("Supplied passcode matches stored passcode");

    const token_endpoint = "token";
    const authCode = generateAuthCode();
    logger.addContext({ authCode });

    try {
      await updateItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id },
        UpdateExpression: `set ${[
          "auth_code = :authCode",
          "passcode_attempt_count = :passcodeAttemptCount",
          "passcode_verified = :passcodeVerified",
          "next_endpoint = :nextEndpoint",
        ].join(", ")}`,
        ExpressionAttributeValues: {
          ":authCode": authCode,
          ":passcodeAttemptCount": new_passcode_attempt_count,
          ":passcodeVerified": true,
          ":nextEndpoint": token_endpoint,
        },
      });
    } catch (error: any) {
      throw new Error(
        `Error updating transaction with auth code and passcode_verified=true: ${error?.message || error}`,
      );
    }
    logger.info("Updated transaction record with auth code and passcode_verified=true");

    await writeAuthCode(transactionRecordResult, transaction_id, authCode, logger);

    return formatJSONResponse({
      statusCode: 200,
      body: { auth_code: authCode, next_endpoint: "token" },
    });
  } catch (error: any) {
    if (transaction_id) {
      await voidTransaction(transaction_id, logger);
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
