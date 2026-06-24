import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { deleteItemMethod, putItemMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { BIOMETRICS_AUTH_FLOW, SIXTY_SECONDS } from "@libs/constants";
import { getCurrentTimestampInSeconds, hasRecordExpired, toLMSResult } from "@libs/utils";
import { createVerify } from "crypto";
import { generateAuthCode } from "@libs/crypto";
import { checkRateLimit, jsonCodec } from "@libs/shared";
import { z } from "zod";
import { toHttpResponse } from "@onmoapp/core-banking";
import { TransactionsService } from "@services/transaction/transaction";

type ParsedRequestBody = { signed_challenge: string; device_id: string };

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;

export const handler = async (event: {
  pathParameters: { transaction_id?: string };
  body: string;
}) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

    const payload = jsonCodec(
      z.object({
        signed_challenge: z.string(),
        device_id: z.string(),
      }),
    ).safeDecode(event.body);

    if (!payload.success) return toHttpResponse(toLMSResult(payload));

    const { signed_challenge, device_id }: ParsedRequestBody = payload.data;

    const transactionsService = new TransactionsService(logger);

    const transaction = await transactionsService.transaction(transaction_id);

    if (!transaction.ok) return toHttpResponse(transaction);
    const transactionRecord = transaction.data;
    const { onmouuid, auth_flow } = transactionRecord;

    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }

    logger.addContext({ onmouuid });

    const rateLimit = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_login",
        action: "biometrics_verify",
      },
      logger,
    );

    if (rateLimit) return rateLimit;

    if (!auth_flow) {
      throw new Error("Transaction does not have auth_flow");
    }
    if (auth_flow !== BIOMETRICS_AUTH_FLOW) {
      throw new Error(`Transaction auth_flow: ${auth_flow}, expected: ${BIOMETRICS_AUTH_FLOW}`);
    }
    logger.addContext({ auth_flow });

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(
        `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
      );
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (!("create_refresh_token" in transactionRecord)) {
      throw new Error("Transaction does not have create_refresh_token");
    }
    if (!transactionRecord.create_refresh_token) {
      throw new Error("Transaction not marked with create_refresh_token=true");
    }
    if (!transactionRecord.unsigned_challenge) {
      throw new Error("Transaction missing unsigned_challenge");
    }
    if (!transactionRecord.fe_public_key) {
      throw new Error("Transaction missing fe_public_key");
    }

    if (
      !transactionRecord.code_challenge ||
      !transactionRecord.scope ||
      !transactionRecord.device_id
    ) {
      throw new Error(`Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`);
    }
    const { scope, code_challenge, unsigned_challenge, fe_public_key } = transactionRecord;
    if (transactionRecord.auth_code) {
      throw new Error("Transaction already been used for an auth code");
    }
    if (transactionRecord.biometrics_verified) {
      throw new Error("Biometrics has already been verified");
    }
    if (device_id !== transactionRecord.device_id) {
      throw new Error("Supplied device_id does not match transaction device_id");
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/biometrics/verify`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/otp-passcode/passcode/verify, but received: ${transactionRecord.next_endpoint}`,
      );
    }
    logger.info("Request & transaction is valid, verifying signed challenge...");

    try {
      const verifier = createVerify("RSA-SHA256");
      verifier.update(unsigned_challenge);

      const isVerified = verifier.verify(
        `-----BEGIN PUBLIC KEY-----\n${fe_public_key}\n-----END PUBLIC KEY-----`,
        signed_challenge,
        "base64",
      );
      if (!isVerified) {
        throw new Error("Supplied challenge does not match stored challenge");
      }

      logger.info("Signed challenge verified");
    } catch (error: any) {
      throw new Error(`Failed to verify supplied challenge: ${error?.message || error}`);
    }

    const token_endpoint = "token";
    const authCode = generateAuthCode();
    logger.addContext({ authCode });

    try {
      await updateItemMethod({
        TableName: auth_transactions_table,
        Key: { transaction_id },
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

    const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
    try {
      await putItemMethod({
        TableName: auth_codes_table,
        Item: {
          auth_code: authCode,
          onmouuid,
          transaction_id,
          scope,
          code_challenge,
          ttl,
          create_refresh_token: transactionRecord.create_refresh_token,
        },
      });
    } catch (error: any) {
      throw new Error(`Error creating auth code record: ${error?.message || error}`);
    }
    logger.info(
      `Auth code record created in ${auth_codes_table} with ttl ${ttl}, returning 200 and the auth code ${authCode}`,
    );

    return formatJSONResponse({
      statusCode: 200,
      body: { auth_code: authCode, next_endpoint: "token" },
    });
  } catch (error: any) {
    if (transaction_id) {
      logger.info("Voiding transaction");
      try {
        await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
