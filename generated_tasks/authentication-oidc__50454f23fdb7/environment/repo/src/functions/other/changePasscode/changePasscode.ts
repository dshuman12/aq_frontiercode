import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  getItemMethod,
  putItemMethod,
  deleteItemMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { backupLegacyPasscodeRecords, generatePasscodeHash } from "@libs/passcode";
import { LEGACY_AUTH_TABLE, LEGACY_RSA_TABLE, AUTH_HASHES_TABLE } from "@libs/config";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  onmouuid: z.string(),
  passcode: z.string(),
});

const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const changePasscode = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { onmouuid: authOnmouuid } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);

  const { onmouuid: requestOnmouuid, passcode } = parsedEvent.data.body;
  logger.addContext("requestOnmouuid", requestOnmouuid);

  if (requestOnmouuid !== authOnmouuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
  }

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
      domain: "auth_forgotten_passcode",
      action: "change_passcode",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const [authResponse, rsaResponse] = await Promise.all([
    getItemMethod({ TableName: LEGACY_AUTH_TABLE, Key: { onmouuid: requestOnmouuid } }),
    getItemMethod({ TableName: LEGACY_RSA_TABLE, Key: { onmouuid: requestOnmouuid } }),
  ]);
  const hasAuthRecord = !!authResponse.Item;
  const hasRsaRecord = !!rsaResponse.Item;

  if (hasAuthRecord && hasRsaRecord) {
    const { salt, hash } = generatePasscodeHash(passcode);
    try {
      await putItemMethod({
        TableName: AUTH_HASHES_TABLE,
        Item: { onmouuid: requestOnmouuid, salt, hash, created: new Date().toISOString() },
      });

      await backupLegacyPasscodeRecords({ onmouuid: requestOnmouuid });

      await Promise.all([
        deleteItemMethod({ TableName: LEGACY_AUTH_TABLE, Key: { onmouuid: requestOnmouuid } }),
        deleteItemMethod({ TableName: LEGACY_RSA_TABLE, Key: { onmouuid: requestOnmouuid } }),
      ]);

      return apiResponse(200, { message: "Passcode updated and migrated to new system" });
    } catch (error: any) {
      try {
        await deleteItemMethod({
          TableName: AUTH_HASHES_TABLE,
          Key: { onmouuid: requestOnmouuid },
        });
      } catch (rollbackError: any) {
        logger.error(`Failed to rollback hash creation: ${serializeError(rollbackError)}`);
      }
      throw new Error("Failed to migrate passcode systems");
    }
  } else {
    const { salt, hash } = generatePasscodeHash(passcode);
    try {
      await updateItemMethod({
        TableName: AUTH_HASHES_TABLE,
        Key: { onmouuid: requestOnmouuid },
        UpdateExpression: "set salt = :salt, #hash = :hash, last_updated = :last_updated",
        ExpressionAttributeNames: { "#hash": "hash" },
        ExpressionAttributeValues: {
          ":salt": salt,
          ":hash": hash,
          ":last_updated": new Date().toISOString(),
        },
      });

      return apiResponse(200, { message: "Passcode changed" });
    } catch (error: any) {
      throw new Error(`Failed to update passcode: ${error?.message || error}`);
    }
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(changePasscode);
