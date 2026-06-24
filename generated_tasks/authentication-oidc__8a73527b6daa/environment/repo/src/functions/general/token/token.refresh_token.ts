import { Logger } from "@onmoapp/onmo-logger";
import { generateAccessToken, verifyToken } from "@libs/crypto";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, deleteItemMethod, putItemMethod } from "@onmoapp/onmo-dynamodb";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { SigningKeySecrets } from "@shared-types/secrets";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getParameter } from "@onmoapp/onmo-ssm";
import { noExclusiveScope } from "@libs/scopes";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { TokenLifetimes } from "@shared-types/tokens";
import { REFRESH_TOKEN_EXPIRED } from "@libs/constants";

type RefreshTokenRequest = { event: { body: string }; logger: Logger };
type GeneratedToken = { access_token: string; expires_in: number; token_id: string };
type ParsedRequestBody = {
  refresh_token: string;
  transaction_id?: null | undefined;
  auth_code?: null | undefined;
  code_verifier?: null | undefined;
};

const env = process.env.ENVIRONMENT as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const onmo_api_url = process.env.ONMO_API_URL as string;
const exclusive_scopes_param = process.env.EXCLUSIVE_SCOPES_PARAM as string;
const token_lifetimes_param = process.env.TOKEN_LIFETIMES_PARAM as string;

export const refreshTokenRequest = async ({ event, logger }: RefreshTokenRequest) => {
  logger.info("refresh_token in request, request_type=refresh_token");
  logger.addContext({ request_type: "refresh_token" });

  let newAccessToken;

  const {
    refresh_token,
    transaction_id,
    auth_code: suppliedAuthCode,
    code_verifier: suppliedCodeVerifier,
  }: ParsedRequestBody = JSON.parse(event.body);

  try {
    if (transaction_id) {
      throw new Error("refresh_token request does not expect transaction_id");
    }
    if (suppliedAuthCode) {
      throw new Error("refresh_token request does not expect auth_code");
    }
    if (suppliedCodeVerifier) {
      throw new Error("refresh_token request does not expect code_verifier");
    }

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
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
        getParameter({ Name: exclusive_scopes_param }),
        getParameter({ Name: token_lifetimes_param }),
      ]);

    if (!exclusiveParameter?.Value || !tokenLifetimesParameter?.Value) {
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];
    const tokenLifetimes = JSON.parse(tokenLifetimesParameter.Value) as TokenLifetimes;

    const decodedToken = await verifyToken({ token: refresh_token, pubKey: pub_signing_key });

    if (decodedToken.env !== env) {
      throw new Error(`Token is for ${decodedToken.env} environment, but this is ${env}`);
    }
    if (
      decodedToken.iss !== `${onmo_auth_url}/oidc` ||
      decodedToken.aud !== onmo_api_url ||
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
    logger.addContext({ onmouuid, token_id });

    if (hasRecordExpired(decodedToken.exp)) {
      logger.warn("Refresh token has expired");
      return formatJSONResponse({ statusCode: 422, body: { error_code: REFRESH_TOKEN_EXPIRED } });
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
        return formatJSONResponse({ statusCode: 429, body: { expiry_time } });
      }
      await rateLimiter.recordAction({
        onmouuid,
        domain: "auth_general",
        action: "token_refresh",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    const queryRefreshTokenTableRes = await queryTableMethod({
      TableName: auth_refresh_tokens_table,
      KeyConditionExpression: "token_id = :token_id AND onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":token_id": token_id, ":onmouuid": onmouuid },
    });
    if (!queryRefreshTokenTableRes?.Items?.length) {
      throw new Error(`No refresh token found in ${auth_refresh_tokens_table}`);
    }
    logger.info(`Found refresh token in ${auth_refresh_tokens_table}`);
    const refreshTokenRecord = queryRefreshTokenTableRes.Items[0];

    // shouldn't happen due to above hasRecordExpired(decodedToken.exp) check
    if (hasRecordExpired(refreshTokenRecord.ttl)) {
      logger.warn("Refresh token has expired");
      return formatJSONResponse({ statusCode: 422, body: { error_code: REFRESH_TOKEN_EXPIRED } });
    }

    const { domain: refTokenAuthDomain } = refreshTokenRecord;
    if (!refTokenAuthDomain) {
      throw new Error("Missing domain on refresh token record");
    }

    try {
      const queryTokensTableRes = await queryTableMethod({
        TableName: auth_tokens_table,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": onmouuid },
        ExpressionAttributeNames: { "#scope": "scope", "#domain": "domain" },
        ProjectionExpression: "token_id, onmouuid, #scope, #domain",
      });
      if (queryTokensTableRes?.Items?.length) {
        logger.info(`${queryTokensTableRes.Count} existing tokens, comparing scopes`);
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
            logger.info(`Token has conflict, deleting`);
            await deleteItemMethod({ TableName: auth_tokens_table, Key: { token_id, onmouuid } });
            tokenDeleteCount += 1;
            logger.info(`Successfully deleted token`);
          }
        }
        logger.info(`Successfully deleted ${tokenDeleteCount} existing tokens`);
      } else {
        logger.info(`No existing tokens found`);
      }
    } catch (error: any) {
      throw new Error(`Error processing token deletion: ${error?.message || error}`);
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
        TableName: auth_tokens_table,
        Item: {
          token_id: newAccessToken.token_id,
          onmouuid: onmouuid,
          scope: scope,
          token: newAccessToken.access_token,
          domain: refTokenAuthDomain,
          ttl: newAccessToken.expires_in,
        },
      });
    } catch (error: any) {
      throw new Error(
        `Error adding token to ${auth_tokens_table} table: ${error?.message || error}`,
      );
    }
    logger.info(`Added token to ${auth_tokens_table} table`);
    logger.info(`Returning 200 with new access_token`);

    return formatJSONResponse({ statusCode: 200, body: { access_token } });
  } catch (error: any) {
    const errorMessage = error?.message || error;

    if (errorMessage.includes("jwt expired")) {
      logger.warn(`Refresh token validation failed: ${errorMessage}`);
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Something went wrong" },
      });
    }

    if (newAccessToken) {
      logger.info("Voiding new access token");
      try {
        await deleteItemMethod({
          TableName: auth_tokens_table,
          Key: { token_id: newAccessToken.token_id },
        });
        logger.info("New access token successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void new access token: ${error?.message || error}`);
      }
    }
    throw error;
  }
};
