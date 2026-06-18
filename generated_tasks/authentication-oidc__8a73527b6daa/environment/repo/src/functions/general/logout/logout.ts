import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { queryTableMethod, deleteItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";

type HandlerEvent = {
  body: string;
  requestContext: { authorizer: { onmouuid: string; scope: string; token_id: string } };
};
type ParsedRequestBody = { onmouuid: string };

const env = process.env.ENVIRONMENT as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  try {
    const {
      onmouuid: authOnmouuid,
      scope: authScope,
      token_id: authTokenId,
    } = event?.requestContext?.authorizer;
    logger.addContext({ authOnmouuid, authScope });
    const { onmouuid: requestOnmouuid } = JSON.parse(event?.body) as ParsedRequestBody;
    logger.addContext({ requestOnmouuid });

    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }
    if (!authTokenId) {
      throw new Error("Missing token_id from authorizer");
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
        domain: "auth_general",
        action: "logout",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    if (!requestOnmouuid) {
      throw new Error("Missing onmouuid in request");
    }
    if (requestOnmouuid !== authOnmouuid) {
      throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
    }

    let authDomain: string;

    // find & remove access tokens valid for logout
    try {
      const queryTokensTableRes = await queryTableMethod({
        TableName: auth_tokens_table,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
        ExpressionAttributeNames: { "#domain": "domain" },
        ProjectionExpression: "token_id, onmouuid, #domain",
      });
      if (queryTokensTableRes?.Items?.length) {
        logger.info(`${queryTokensTableRes.Count} existing tokens`);

        const tokenRecords = queryTokensTableRes.Items;
        const authTokenIdRecord = tokenRecords.find(({ token_id }) => token_id === authTokenId);
        if (!authTokenIdRecord) {
          throw new Error("Missing record for auth token");
        }
        logger.info("Found record of auth token");

        authDomain = authTokenIdRecord?.domain;
        if (!authDomain) {
          throw new Error("Missing domain on token record");
        }

        let tokenDeleteCount = 0;

        for (const tokenRecord of tokenRecords) {
          const { token_id, onmouuid, domain } = tokenRecord;

          if (domain && domain === authDomain) {
            logger.info(`Token has ${domain} auth domain, deleting`);
            await deleteItemMethod({ TableName: auth_tokens_table, Key: { token_id, onmouuid } });
            tokenDeleteCount += 1;
            logger.info(`Successfully deleted token`);
          }
        }
        logger.info(`Successfully deleted ${tokenDeleteCount} existing tokens`);
      } else {
        throw new Error("No existing tokens found");
      }
    } catch (error: any) {
      throw new Error(`Error processing token deletion: ${error?.message || error}`);
    }

    // find & remove access tokens valid for logout
    try {
      const queryRefTokensTableRes = await queryTableMethod({
        TableName: auth_refresh_tokens_table,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
        ExpressionAttributeNames: { "#domain": "domain" },
        ProjectionExpression: "token_id, onmouuid, #domain",
      });
      if (queryRefTokensTableRes?.Items?.length) {
        logger.info(`${queryRefTokensTableRes.Count} existing refresh tokens`);
        let refreshTokenDeleteCount = 0;

        for (const refreshTokenRecord of queryRefTokensTableRes.Items) {
          const { token_id, onmouuid, domain } = refreshTokenRecord;

          if (domain && domain === authDomain) {
            refreshTokenDeleteCount += 1;
            logger.info(`Refresh token has ${domain} auth domain, deleting`);
            await deleteItemMethod({
              TableName: auth_refresh_tokens_table,
              Key: { token_id, onmouuid },
            });
            logger.info(`Successfully deleted refresh token`);
          }
        }
        logger.info(`Successfully deleted ${refreshTokenDeleteCount} existing refresh tokens`);
      } else {
        logger.info(`No existing refresh tokens found`);
      }
    } catch (error: any) {
      throw new Error(`Error processing refresh token deletion: ${error?.message || error}`);
    }

    return formatJSONResponse({ statusCode: 200 });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
