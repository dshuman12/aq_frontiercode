import { createApiHandler, APIGatewayProxyEvent, apiResponse } from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { queryTableMethod, deleteItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { AUTH_TOKENS_TABLE, AUTH_REFRESH_TOKENS_TABLE } from "@libs/config";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";

const bodySchema = z.object({
  onmouuid: z.string(),
});
const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({
      onmouuid: z.string(),
      scope: z.string(),
      token_id: z.string(),
    }),
  }),
  body: jsonBody(bodySchema),
});

const logout = async (event: APIGatewayProxyEvent) => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const {
    onmouuid: authOnmouuid,
    scope: authScope,
    token_id: authTokenId,
  } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);
  logger.addContext("authScope", authScope);
  const { onmouuid: requestOnmouuid } = parsedEvent.data.body;
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
      domain: "auth_general",
      action: "logout",
    });
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  let authDomain: string;

  // find & remove access tokens valid for logout
  try {
    const queryTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
      ExpressionAttributeNames: { "#domain": "domain" },
      ProjectionExpression: "token_id, onmouuid, #domain",
    });
    if (queryTokensTableRes?.Items?.length) {
      const tokenRecords = queryTokensTableRes.Items;
      const authTokenIdRecord = tokenRecords.find(({ token_id }) => token_id === authTokenId);
      if (!authTokenIdRecord) {
        logger.warn("Missing record for auth token");
        return apiResponse(401, { message: "Unauthorized" });
      }

      authDomain = authTokenIdRecord?.domain;
      if (!authDomain) {
        throw new Error("Missing domain on token record");
      }

      let tokenDeleteCount = 0;

      for (const tokenRecord of tokenRecords) {
        const { token_id, onmouuid, domain } = tokenRecord;

        if (domain && domain === authDomain) {
          await deleteItemMethod({ TableName: AUTH_TOKENS_TABLE, Key: { token_id, onmouuid } });
          tokenDeleteCount += 1;
        }
      }
    } else {
      throw new Error("No existing tokens found");
    }
  } catch (error: any) {
    throw new Error(`Error processing token deletion: ${error?.message || error}`);
  }

  // find & remove refresh tokens valid for logout
  try {
    const queryRefTokensTableRes = await queryTableMethod({
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
      ExpressionAttributeNames: { "#domain": "domain" },
      ProjectionExpression: "token_id, onmouuid, #domain",
    });
    if (queryRefTokensTableRes?.Items?.length) {
      let refreshTokenDeleteCount = 0;

      for (const refreshTokenRecord of queryRefTokensTableRes.Items) {
        const { token_id, onmouuid, domain } = refreshTokenRecord;

        if (domain && domain === authDomain) {
          refreshTokenDeleteCount += 1;
          await deleteItemMethod({
            TableName: AUTH_REFRESH_TOKENS_TABLE,
            Key: { token_id, onmouuid },
          });
        }
      }
    }
  } catch (error: any) {
    throw new Error(`Error processing refresh token deletion: ${error?.message || error}`);
  }

  return apiResponse(200);
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(logout);
