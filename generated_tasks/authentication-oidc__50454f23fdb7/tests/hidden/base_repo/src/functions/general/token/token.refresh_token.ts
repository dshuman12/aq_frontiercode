import { logger, serializeError } from "@onmoapp/logger";
import { apiResponse, ApiResponse } from "@onmoapp/handler-middleware";
import { generateAccessToken, verifyToken } from "@libs/crypto";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, deleteItemMethod, putItemMethod } from "@onmoapp/onmo-dynamodb";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { SigningKeySecrets } from "@shared-types/secrets";
import { getParameter } from "@onmoapp/onmo-ssm";
import { noExclusiveScope } from "@libs/scopes";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { TokenLifetimes } from "@shared-types/tokens";
import {
  ENV,
  AUTH_TOKENS_TABLE,
  AUTH_REFRESH_TOKENS_TABLE,
  ONMO_AUTH_URL,
  ONMO_API_URL,
  EXCLUSIVE_SCOPES_PARAM,
  TOKEN_LIFETIMES_PARAM,
  REFRESH_TOKEN_EXPIRED,
} from "@libs/config";
import { z } from "zod";

type RefreshTokenRequest = { event: { body: string } };
type GeneratedToken = { access_token: string; expires_in: number; token_id: string };

const bodySchema = z.object({
  refresh_token: z.string(),
  transaction_id: z.unknown().optional(),
  auth_code: z.unknown().optional(),
  code_verifier: z.unknown().optional(),
});

export const refreshTokenRequest = async ({ event }: RefreshTokenRequest): Promise<ApiResponse> => {
  logger.addContext("request_type", "refresh_token");

  let newAccessToken;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(event.body);
  } catch {
    logger.warn("Body is not valid JSON");
    return apiResponse(400, { message: "Bad Request" });
  }
  const parsedBody = bodySchema.safeParse(parsedJson);
  if (!parsedBody.success) {
    logger.warn(`Body validation failed: ${serializeError(parsedBody.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const { refresh_token, transaction_id, auth_code, code_verifier } = parsedBody.data;
  if (transaction_id || auth_code || code_verifier) {
    throw new Error(`[suspicious_activity] Unexpected fields in refresh token request body`);
  }

  try {
    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { priv_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!priv_signing_key) {
      throw new Error("Missing necessary signing private key");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    const [{ Parameter: exclusiveParameter }, { Parameter: tokenLifetimesParameter }] =
      await Promise.all([
        getParameter({ Name: EXCLUSIVE_SCOPES_PARAM }),
        getParameter({ Name: TOKEN_LIFETIMES_PARAM }),
      ]);

    if (!exclusiveParameter?.Value || !tokenLifetimesParameter?.Value) {
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];
    const tokenLifetimes = JSON.parse(tokenLifetimesParameter.Value) as TokenLifetimes;

    const decodedToken = await verifyToken({ token: refresh_token, pubKey: pub_signing_key });

    if (decodedToken.env !== ENV) {
      throw new Error(`Token is for ${decodedToken.env} environment, but this is ${ENV}`);
    }
    if (
      decodedToken.iss !== `${ONMO_AUTH_URL}/oidc` ||
      decodedToken.aud !== ONMO_API_URL ||
      !decodedToken.exp ||
      !decodedToken.scope ||
      !decodedToken.sub ||
      !decodedToken.jti
    ) {
      throw new Error(
        `Token is invalid. Issuer: ${decodedToken.iss}, Audience: ${decodedToken.aud}. Scopes: ${decodedToken.scope}`,
      );
    }
    const { scope, sub: onmouuid, jti: token_id } = decodedToken;
    logger.addContext("onmouuid", onmouuid);
    logger.addContext("token_id", token_id);

    if (hasRecordExpired(decodedToken.exp)) {
      logger.warn("Refresh token has expired");
      return apiResponse(422, { error_code: REFRESH_TOKEN_EXPIRED });
    }

    try {
      const rateLimiter = new RateLimiter();
      const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
        await rateLimiter.checkLimits({
          onmouuid,
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
        onmouuid,
        domain: "auth_general",
        action: "token_refresh",
      });
    } catch (error: unknown) {
      throw new Error(`Failed to impose rate limit: ${serializeError(error)}`);
    }

    const queryRefreshTokenTableRes = await queryTableMethod({
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      KeyConditionExpression: "token_id = :token_id AND onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":token_id": token_id, ":onmouuid": onmouuid },
    });
    if (!queryRefreshTokenTableRes?.Items?.length) {
      throw new Error(`No refresh token found in ${AUTH_REFRESH_TOKENS_TABLE}`);
    }
    const refreshTokenRecord = queryRefreshTokenTableRes.Items[0];

    // shouldn't happen due to above hasRecordExpired(decodedToken.exp) check
    if (hasRecordExpired(refreshTokenRecord.ttl)) {
      logger.warn("Refresh token has expired");
      return apiResponse(422, { error_code: REFRESH_TOKEN_EXPIRED });
    }

    const { domain: refTokenAuthDomain } = refreshTokenRecord;
    if (!refTokenAuthDomain) {
      throw new Error("Missing domain on refresh token record");
    }

    try {
      const queryTokensTableRes = await queryTableMethod({
        TableName: AUTH_TOKENS_TABLE,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": onmouuid },
        ExpressionAttributeNames: { "#scope": "scope", "#domain": "domain" },
        ProjectionExpression: "token_id, onmouuid, #scope, #domain",
      });
      if (queryTokensTableRes?.Items?.length) {
        let tokenDeleteCount = 0;

        for (const tokenRecord of queryTokensTableRes.Items) {
          const { token_id, onmouuid, scope: tokenScope, domain } = tokenRecord;

          if (!tokenScope) {
            logger.error("Existing token does not have scope");
            continue;
          }

          const isAllowed = noExclusiveScope({
            newScopes: scope.split(","),
            existingScopes: tokenScope.split(","),
            exclusiveScopes,
          });

          if ((domain && domain === refTokenAuthDomain) || !isAllowed) {
            await deleteItemMethod({ TableName: AUTH_TOKENS_TABLE, Key: { token_id, onmouuid } });
            tokenDeleteCount += 1;
          }
        }
      }
    } catch (error: unknown) {
      throw new Error(`Error processing token deletion: ${serializeError(error)}`);
    }

    const refTokenRemainingMins = (refreshTokenRecord.ttl - getCurrentTimestampInSeconds()) / 60;
    const expiryMinutes = Math.min(refTokenRemainingMins, tokenLifetimes.refresh_token_default);

    newAccessToken = generateAccessToken({
      onmouuid,
      scope,
      secretKey: priv_signing_key,
      expiryMinutes,
    }) as GeneratedToken;
    const { access_token } = newAccessToken;

    try {
      await putItemMethod({
        TableName: AUTH_TOKENS_TABLE,
        Item: {
          token_id: newAccessToken.token_id,
          onmouuid: onmouuid,
          scope: scope,
          token: newAccessToken.access_token,
          domain: refTokenAuthDomain,
          ttl: newAccessToken.expires_in,
        },
      });
    } catch (error: unknown) {
      throw new Error(`Error adding token to ${AUTH_TOKENS_TABLE} table: ${serializeError(error)}`);
    }
    return apiResponse(200, { access_token });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("jwt expired")) {
      logger.warn(`Refresh token validation failed: ${errorMessage}`);
      return apiResponse(400, { message: "Something went wrong" });
    }

    if (newAccessToken) {
      try {
        await deleteItemMethod({
          TableName: AUTH_TOKENS_TABLE,
          Key: { token_id: newAccessToken.token_id },
        });
      } catch (error: unknown) {
        logger.error(`Failed to void new access token: ${serializeError(error)}`);
      }
    }
    throw error;
  }
};
