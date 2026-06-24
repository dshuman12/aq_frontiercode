import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { Callback } from "aws-lambda";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { verifyToken } from "@libs/crypto";
import { hasRecordExpired } from "@libs/utils";
import {
  generatePolicy,
  isResourceValidForScopes,
} from "@functions/general/authorizer/authorizer.libs";
import { SigningKeySecrets } from "@shared-types/secrets";

export type AuthorizerEvent = {
  type: "TOKEN";
  authorizationToken?: string;
  methodArn?: string;
  queryStringParameters?: { token?: string };
};

const env = process.env.ENVIRONMENT as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const onmo_api_url = process.env.ONMO_API_URL as string;

export const handler = async (event: AuthorizerEvent, _context: any, callback: Callback) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const accessToken = event.authorizationToken || event.queryStringParameters?.token;

  logger.info({
    headerTokenPresent: !!event.authorizationToken,
    QueryStringTokenPresent: !!event.queryStringParameters?.token,
    methodArn: event.methodArn,
  });

  try {
    if (!accessToken) {
      throw new Error("No authorization token in request body or query parameters");
    }
    if (!event.methodArn) {
      throw new Error("No methodArn in request body");
    }
    const token = accessToken.replace("Bearer ", "");
    const { methodArn } = event;

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    const decodedToken = await verifyToken({ token, pubKey: pub_signing_key });

    if (decodedToken.env !== env) {
      throw new Error(`Token is for ${decodedToken.env} environment, but this is ${env}`);
    }
    if (
      decodedToken.iss !== `${onmo_auth_url}/oidc` ||
      decodedToken.aud !== onmo_api_url ||
      hasRecordExpired(decodedToken.exp as number) ||
      !decodedToken.scope
    ) {
      throw new Error(
        `Token is invalid. Issuer: ${decodedToken.iss}, Audience: ${
          decodedToken.aud
        }. Expired: ${hasRecordExpired(decodedToken.exp as number)}. Scopes: ${decodedToken.scope}`,
      );
    }

    const isValid = await isResourceValidForScopes({
      methodArn,
      scopesString: decodedToken.scope || "",
    });
    if (!isValid) {
      throw new Error(`Resource ${methodArn} is not valid for scopes ${decodedToken.scope}`);
    }
    logger.info(`Resource ${methodArn} is valid for scopes ${decodedToken.scope}`);

    const queryTokenTableRes = await queryTableMethod({
      TableName: auth_tokens_table,
      KeyConditionExpression: "token_id = :token_id AND onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":token_id": decodedToken.jti, ":onmouuid": decodedToken.sub },
    });

    if (!queryTokenTableRes?.Items?.length) {
      throw new Error(
        `No token found in ${auth_tokens_table} for token_id: ${decodedToken.jti} and onmouuid: ${decodedToken.sub}`,
      );
    }
    logger.info(`Found token in ${auth_tokens_table}`);
    const accessTokenRecord = queryTokenTableRes.Items[0];

    if (hasRecordExpired(accessTokenRecord.ttl)) {
      throw new Error(
        `Token with token_id ${decodedToken.jti} and onmouuid ${decodedToken.sub} has expired. TTL: ${accessTokenRecord.ttl}`,
      );
    }
    logger.info(
      `Token id ${decodedToken.jti} for onmouuid ${decodedToken.sub} with scopes ${decodedToken.scope} is valid to access resources ${methodArn}`,
    );

    callback(null, generatePolicy({ effect: "Allow", resource: methodArn, decodedToken }));
  } catch (error: any) {
    const errorMessage = error?.message || error;
    if (errorMessage.startsWith(`No token found in ${auth_tokens_table}`)) {
      logger.warn(`Authorization failed because ${errorMessage}, returning unauthorized`);
    } else {
      logger.error(`Authorization failed because ${errorMessage}, returning unauthorized`);
    }
    return callback("Unauthorized");
  }
};
