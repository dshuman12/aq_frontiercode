import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  deleteItemMethod,
  getItemMethod,
  putItemMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { backupLegacyPasscodeRecords, generatePasscodeHash } from "@libs/passcode";
import { AuthorizerEvent } from "@libs/shared";

type ParsedReqBody = { onmouuid: string; passcode: string };

const env = process.env.ENVIRONMENT as string;
const legacy_auth_table = process.env.LEGACY_AUTH_TABLE as string;
const legacy_rsa_table = process.env.LEGACY_RSA_TABLE as string;
const auth_hashes_table = process.env.AUTH_HASHES_TABLE as string;

export const handler = async (event: AuthorizerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  try {
    const { onmouuid: authOnmouuid } = event?.requestContext?.authorizer;
    logger.addContext({ authOnmouuid });

    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
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
        return formatJSONResponse({ statusCode: 429, body: { expiry_time } });
      }
      await rateLimiter.recordAction({
        onmouuid: authOnmouuid,
        domain: "auth_forgotten_passcode",
        action: "change_passcode",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    const { onmouuid: requestOnmouuid, passcode } = JSON.parse(event.body) as ParsedReqBody;
    logger.addContext({ requestOnmouuid });

    if (!passcode) {
      throw new Error("Missing passcode in request");
    }
    if (!requestOnmouuid) {
      throw new Error("Missing onmouuid in request");
    }
    if (requestOnmouuid !== authOnmouuid) {
      throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
    }

    const [authResponse, rsaResponse] = await Promise.all([
      getItemMethod({ TableName: legacy_auth_table, Key: { onmouuid: requestOnmouuid } }),
      getItemMethod({ TableName: legacy_rsa_table, Key: { onmouuid: requestOnmouuid } }),
    ]);
    const hasAuthRecord = !!authResponse.Item;
    const hasRsaRecord = !!rsaResponse.Item;

    if (hasAuthRecord && hasRsaRecord) {
      logger.info("User has encrypted passcode setup - migrating to hashed");

      const { salt, hash } = generatePasscodeHash(passcode);
      try {
        await putItemMethod({
          TableName: auth_hashes_table,
          Item: { onmouuid: requestOnmouuid, salt, hash, created: new Date().toISOString() },
        });
        logger.info("Successfully stored hashed passcode");

        await backupLegacyPasscodeRecords({ onmouuid: requestOnmouuid, logger });

        await Promise.all([
          deleteItemMethod({ TableName: legacy_auth_table, Key: { onmouuid: requestOnmouuid } }),
          deleteItemMethod({ TableName: legacy_rsa_table, Key: { onmouuid: requestOnmouuid } }),
        ]);
        logger.info("Successfully deleted legacy encrypted records");

        return formatJSONResponse({
          statusCode: 200,
          body: { message: "Passcode updated and migrated to new system" },
        });
      } catch (error: any) {
        try {
          await deleteItemMethod({
            TableName: auth_hashes_table,
            Key: { onmouuid: requestOnmouuid },
          });
        } catch (rollbackError: any) {
          logger.error(
            `Failed to rollback hash creation: ${rollbackError?.message || rollbackError}`,
          );
        }
        throw new Error("Failed to migrate passcode systems");
      }
    } else {
      logger.info("User has hashed passcode setup - updating hash");

      const { salt, hash } = generatePasscodeHash(passcode);
      try {
        await updateItemMethod({
          TableName: auth_hashes_table,
          Key: { onmouuid: requestOnmouuid },
          UpdateExpression: "set salt = :salt, #hash = :hash, last_updated = :last_updated",
          ExpressionAttributeNames: { "#hash": "hash" },
          ExpressionAttributeValues: {
            ":salt": salt,
            ":hash": hash,
            ":last_updated": new Date().toISOString(),
          },
        });
        logger.info("Successfully updated hashed passcode");

        return formatJSONResponse({ statusCode: 200, body: { message: "Passcode changed" } });
      } catch (error: any) {
        throw new Error(`Failed to update passcode: ${error?.message || error}`);
      }
    }
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
