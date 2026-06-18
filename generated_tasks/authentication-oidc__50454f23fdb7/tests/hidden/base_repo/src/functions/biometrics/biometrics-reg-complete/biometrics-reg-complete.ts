import {
  deleteItemMethod,
  putItemMethod,
  queryTableMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { hasRecordExpired } from "@libs/utils";
import {
  AUTH_KEYS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  BIOMETRICS_REGISTRATION_AUTH_FLOW,
} from "@libs/config";
import { generateCodeChallenge } from "@libs/crypto";
import { createVerify } from "crypto";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
const bodySchema = z.object({
  fe_public_key: z.string(),
  signed_challenge: z.string(),
  code_verifier: z.string(),
});
const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const biometricsRegComplete = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);
  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);
  const { fe_public_key, signed_challenge, code_verifier } = parsedEvent.data.body;

  try {
    try {
      const rateLimiter = new RateLimiter();
      const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
        await rateLimiter.checkLimits({
          onmouuid: authOnmouuid,
          to_check: [
            { domain: "auth_general" },
            { domain: "auth_login" },
            { domain: "auth_extra_scope" },
            { domain: "auth_forgotten_passcode" },
            { domain: "auth_biometrics_registration" },
          ],
        });
      if (rate_limited || super_rate_limited) {
        const all_limited_actions = [...new Set([...limited_actions, ...super_limited_actions])];
        logger.warn(`Rate limited for actions: ${JSON.stringify(all_limited_actions)}`);

        const expiry_time = super_rate_limited
          ? "no_expiry"
          : Math.max(...limited_actions.map((action) => action.rate_limit_expiry ?? 0));
        return apiResponse(429, { expiry_time });
      }
      await rateLimiter.recordAction({
        onmouuid: authOnmouuid,
        domain: "auth_biometrics_registration",
        action: "complete",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
      return apiResponse(400, { message: "Something went wrong" });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];
    if (!transactionRecord.onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    const {
      onmouuid: transactionOnmouuid,
      device_id,
      auth_flow,
      unsigned_challenge,
      code_challenge,
    } = transactionRecord;
    logger.addContext("transactionOnmouuid", transactionOnmouuid);

    if (transactionOnmouuid !== authOnmouuid) {
      throw new Error(
        "[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid",
      );
    }

    if (!auth_flow) {
      throw new Error("Transaction does not have auth_flow");
    }
    if (auth_flow !== BIOMETRICS_REGISTRATION_AUTH_FLOW) {
      throw new Error(
        `Transaction auth_flow: ${auth_flow}, expected: ${BIOMETRICS_REGISTRATION_AUTH_FLOW}`,
      );
    }
    logger.addContext("auth_flow", auth_flow);

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (!code_challenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    if (!device_id) {
      throw new Error("Transaction does not have device_id");
    }
    if (!unsigned_challenge) {
      throw new Error("Transaction does not have unsigned_challenge");
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/biometrics/register`) {
      throw new Error(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/biometrics/register, but received: ${transactionRecord.next_endpoint}`,
      );
    }
    const generatedCodeChallenge = generateCodeChallenge(code_verifier);
    if (generatedCodeChallenge !== code_challenge) {
      throw new Error(`Supplied code_verifier does not match stored code_challenge`);
    }

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
    } catch (error: any) {
      throw new Error(`Failed to verify supplied challenge: ${error?.message || error}`);
    }

    try {
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
        onmouuid: transactionOnmouuid,
        device_id,
        fe_public_key,
        last_updated: new Date().toISOString(),
      },
    });

    try {
      await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
    } catch (error: any) {
      logger.error(`Failed to void transaction: ${error?.message || error}`);
    }

    return apiResponse(200, { message: "Registration successful" });
  } catch (error: any) {
    if (transaction_id) {
      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return apiResponse(500, { message: "Something went wrong" });
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(biometricsRegComplete);
