import { createAuthorizerHandler, APIGatewayAuthorizerCallback } from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { verifyToken } from "@libs/crypto";
import { hasRecordExpired } from "@libs/utils";
import {
  generatePolicy,
  isResourceValidForScopes,
} from "@functions/general/authorizer/authorizer.libs";
import { SigningKeySecrets } from "@shared-types/secrets";
import { ENV, AUTH_TOKENS_TABLE, ONMO_AUTH_URL, ONMO_API_URL } from "@libs/config";
import { z } from "zod";

const eventSchema = z.object({
  methodArn: z.string(),
  authorizationToken: z.string().optional(),
  queryStringParameters: z.object({ token: z.string() }).optional(),
});

const decodedTokenSchema = z.object({
  env: z.literal(ENV),
  iss: z.literal(`${ONMO_AUTH_URL}/oidc`),
  aud: z.literal(ONMO_API_URL),
  exp: z.number().refine((exp) => !hasRecordExpired(exp)),
  scope: z.string(),
  jti: z.string(),
  sub: z.string(),
});

export type AuthorizerEvent = z.infer<typeof eventSchema>;

const authorizer = async (event: AuthorizerEvent, callback: APIGatewayAuthorizerCallback) => {
  try {
    const parsedEvent = eventSchema.safeParse(event);
    if (!parsedEvent.success) {
      logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
      return callback("Unauthorized");
    }

    const accessToken =
      parsedEvent.data.authorizationToken || parsedEvent.data.queryStringParameters?.token;
    if (!accessToken) {
      throw new Error("No authorization token in request body or query parameters");
    }
    const token = accessToken.replace("Bearer ", "");
    const { methodArn } = parsedEvent.data;

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString ?? "{}");
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    const decodedToken = await verifyToken({ token, pubKey: pub_signing_key });

    const parsedToken = decodedTokenSchema.safeParse(decodedToken);
    if (!parsedToken.success) {
      logger.warn(`Token validation failed: ${serializeError(parsedToken.error)}`);
      return callback("Unauthorized");
    }

    const { scope, jti, sub } = parsedToken.data;

    const isValid = await isResourceValidForScopes({ methodArn, scopesString: scope });
    if (!isValid) {
      throw new Error(`Resource ${methodArn} is not valid for scopes ${scope}`);
    }

    const queryTokenTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
      KeyConditionExpression: "token_id = :token_id AND onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":token_id": jti, ":onmouuid": sub },
    });

    if (!queryTokenTableRes?.Items?.length) {
      throw new Error(
        `No token found in ${AUTH_TOKENS_TABLE} for token_id: ${jti} and onmouuid: ${sub}`,
      );
    }
    const accessTokenRecord = queryTokenTableRes.Items[0];

    if (hasRecordExpired(accessTokenRecord.ttl)) {
      throw new Error(
        `Token with token_id ${jti} and onmouuid ${sub} has expired. TTL: ${accessTokenRecord.ttl}`,
      );
    }
    logger.addContext("onmouuid", sub);
    logger.addContext("scope", scope);
    logger.addContext("methodArn", methodArn);
    logger.info("Authorized");

    callback(
      null,
      generatePolicy({ effect: "Allow", resource: methodArn, decodedToken: parsedToken.data }),
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.startsWith(`No token found in ${AUTH_TOKENS_TABLE}`)
    ) {
      logger.info(`Authorization failed because ${error.message}, returning unauthorized`);
    } else {
      logger.error(`Authorization failed because ${serializeError(error)}, returning unauthorized`);
    }
    return callback("Unauthorized");
  }
};

export const handler =
  createAuthorizerHandler<AuthorizerEvent>(__HANDLER_NAME__).handle(authorizer);
