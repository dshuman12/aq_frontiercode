import {
  deleteItemMethod,
  putItemMethod,
  queryTableMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { hasRecordExpired } from "@libs/utils";
import {
  AUTH_KEYS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  BIOMETRICS_REGISTRATION_AUTH_FLOW,
} from "@libs/constants";
import { generateCodeChallenge } from "@libs/crypto";
import { createVerify } from "crypto";
import { parseRegCompleteEvent } from "@functions/biometrics/biometrics-reg-complete/utils";
import { APIGatewayEvent } from "aws-lambda";
import { toHttpResponse } from "@onmoapp/core-banking";
import { getLogger } from "@libs/logger";
import { checkRateLimit } from "@libs/shared";
import { TransactionsService } from "@services/transaction/transaction";

export const handler = async (event: APIGatewayEvent) => {
  const logger = getLogger();

  const eventResult = parseRegCompleteEvent(event);

  if (!eventResult.ok) {
    return toHttpResponse(eventResult);
  }

  const { fePublicKey, signedChallenge, codeVerifier, transactionId, onmoId } = eventResult.data;

  const transactionsService = new TransactionsService(logger);

  try {
    logger.addContext({ transactionId });

    const rateLimiter = checkRateLimit(
      { onmouuid: onmoId, domain: "auth_biometrics_registration", action: "complete" },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    const transactionRecordRes = await transactionsService.transaction(transactionId);

    if (!transactionRecordRes.ok) {
      return toHttpResponse(eventResult);
    }

    const {
      onmouuid: transactionOnmoId,
      device_id,
      auth_flow,
      unsigned_challenge,
      code_challenge,
      ttl,
      next_endpoint,
    } = transactionRecordRes.data;
    logger.addContext({
      transactionOnmoId,
      device_id,
      auth_flow,
      unsigned_challenge,
      code_challenge,
    });

    if (transactionOnmoId !== onmoId) {
      throw new Error(
        "[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid",
      );
    }

    if (auth_flow !== BIOMETRICS_REGISTRATION_AUTH_FLOW) {
      throw new Error(
        `Transaction auth_flow: ${auth_flow}, expected: ${BIOMETRICS_REGISTRATION_AUTH_FLOW}`,
      );
    }

    //TODO: how do we handle ttl not being present is it a validation fail
    if (hasRecordExpired(ttl)) {
      throw new Error(`Transaction has expired. TTL: ${ttl}`);
    }

    if (!next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }

    if (next_endpoint !== `${transactionId}/biometrics/register`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transactionId}/biometrics/register, but received: ${next_endpoint}`,
      );
    }

    if (!unsigned_challenge) {
      throw new Error("Unsigned challenge is not valid");
    }

    const generatedCodeChallenge = generateCodeChallenge(codeVerifier);
    if (generatedCodeChallenge !== code_challenge) {
      throw new Error(`Supplied code_verifier does not match stored code_challenge`);
    }
    logger.info("Request & transaction is valid, verifying signed challenge...");

    try {
      const verifier = createVerify("RSA-SHA256");
      verifier.update(unsigned_challenge);

      const isVerified = verifier.verify(
        `-----BEGIN PUBLIC KEY-----\n${fePublicKey}\n-----END PUBLIC KEY-----`,
        signedChallenge,
        "base64",
      );
      if (!isVerified) {
        throw new Error("Supplied challenge does not match stored challenge");
      }

      logger.info("Signed challenge verified");
    } catch (error: any) {
      throw new Error(`Failed to verify supplied challenge: ${error?.message || error}`);
    }

    try {
      logger.info("Checking for duplicate device_id auth key record(s)");
      const queryAuthKeyTableRes = await queryTableMethod({
        TableName: AUTH_KEYS_TABLE,
        IndexName: "device_id-index",
        KeyConditionExpression: "device_id = :device_id",
        ExpressionAttributeValues: { ":device_id": device_id },
      });
      if (queryAuthKeyTableRes?.Items?.length) {
        logger.warn(
          `${queryAuthKeyTableRes.Count} record(s) found, voiding device_id for record(s)`,
        );

        for (const { onmouuid: authKeyRecordOnmouuid } of queryAuthKeyTableRes.Items) {
          await updateItemMethod({
            TableName: AUTH_KEYS_TABLE,
            Key: { onmouuid: authKeyRecordOnmouuid },
            UpdateExpression: "set device_id = :voided, last_updated = :last_updated",
            ExpressionAttributeValues: {
              ":voided": "VOIDED",
              ":last_updated": new Date().toISOString(),
            },
          });
          logger.info("Voided auth key");
        }
      } else {
        logger.info("No auth key records found for device_id");
      }
    } catch (error: any) {
      logger.warn(`Error in device_id uniqueness process: ${error?.message || error}`);
    }

    await putItemMethod({
      TableName: AUTH_KEYS_TABLE,
      Item: {
        onmouuid: transactionOnmoId,
        device_id: device_id,
        fe_public_key: fePublicKey,
        last_updated: new Date().toISOString(),
      },
    });
    logger.info(`Added user FE biometric public key to ${AUTH_KEYS_TABLE} table`);

    try {
      logger.info("Voiding completed transaction");
      await deleteItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Key: { transaction_id: transactionId },
      });
      logger.info("Transaction successfully voided");
    } catch (error: any) {
      logger.error(`Failed to void completed transaction: ${error?.message || error}`);
    }

    return formatJSONResponse({ statusCode: 200, body: { message: "Registration successful" } });
  } catch (error: any) {
    if (transactionId) {
      logger.info("Voiding transaction");
      try {
        await deleteItemMethod({
          TableName: AUTH_TRANSACTIONS_TABLE,
          Key: { transaction_id: transactionId },
        });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
