import { logger, serializeError } from "@onmoapp/logger";
import { apiResponse, ApiResponse } from "@onmoapp/handler-middleware";
import { generateAccessToken, generateCodeChallenge } from "@libs/crypto";
import { hasRecordExpired } from "@libs/utils";
import {
  queryTableMethod,
  deleteItemMethod,
  putItemMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { SigningKeySecrets } from "@shared-types/secrets";
import {
  ENV,
  USER_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  AUTH_CODES_TABLE,
  AUTH_TOKENS_TABLE,
  AUTH_REFRESH_TOKENS_TABLE,
  EXCLUSIVE_SCOPES_PARAM,
  TOKEN_LIFETIMES_PARAM,
  BIOMETRICS_AUTH_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  FIRST_TIME_LOGIN_FLOW,
  FIRST_TIME_LOGIN_SCOPE,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  OTP_AUTH_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
} from "@libs/config";
import { getParameter } from "@onmoapp/onmo-ssm";
import { noExclusiveScope } from "@libs/scopes";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { TokenLifetimes } from "@shared-types/tokens";
import { APP_TESTER_NUMBER } from "@libs/testConstants";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

type AuthCodeRequest = { event: { body: string } };

const bodySchema = z.object({
  transaction_id: z.string(),
  auth_code: z.string(),
  code_verifier: z.string(),
});
const eventSchema = z.object({
  body: jsonBody(bodySchema),
});

type AuthCodeRecord = {
  onmouuid?: string;
  transaction_id?: string;
  scope?: string;
  code_challenge?: string;
};

const valid_auth_flows = [
  OTP_AUTH_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  BIOMETRICS_AUTH_FLOW,
];

const forgotten_passcode_auth_flows = [
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
];

const keep_existing_refresh_token_flows = [
  EXTRA_SCOPE_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
];

export const authCodeRequest = async ({ event }: AuthCodeRequest): Promise<ApiResponse> => {
  logger.addContext("request_type", "auth_code");
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }

  const {
    transaction_id,
    auth_code: suppliedAuthCode,
    code_verifier: suppliedCodeVerifier,
  } = parsedEvent.data.body;

  logger.addContext("transaction_id", transaction_id);

  try {
    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      logger.addContext("error_code", ERROR_CODES.CONFIG_SERVICE_ERROR);
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { priv_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!priv_signing_key) {
      logger.addContext("error_code", ERROR_CODES.CONFIG_SERVICE_ERROR);
      throw new Error("Missing necessary signing private key");
    }

    const [{ Parameter: exclusiveParameter }, { Parameter: tokenLifetimesParameter }] =
      await Promise.all([
        getParameter({ Name: EXCLUSIVE_SCOPES_PARAM }),
        getParameter({ Name: TOKEN_LIFETIMES_PARAM }),
      ]);

    if (!exclusiveParameter?.Value || !tokenLifetimesParameter?.Value) {
      logger.addContext("error_code", ERROR_CODES.CONFIG_SERVICE_ERROR);
      throw new Error(`Failed to fetch parameters from ssm`);
    }
    const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];
    const tokenLifetimes = JSON.parse(tokenLifetimesParameter.Value) as TokenLifetimes;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
      try {
        await deleteItemMethod({
          TableName: AUTH_CODES_TABLE,
          Key: { auth_code: suppliedAuthCode },
        });
      } catch (error: any) {
        logger.error(`Failed to void auth code: ${error?.message || error}`);
      }
      return apiResponse(400, { message: "Something went wrong" });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(
        `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
      );
    }

    const {
      auth_flow,
      onmouuid: transactionOnmouuid,
      code_challenge: transactionCodeChallenge,
      scope: transactionScope,
      auth_code: transactionAuthCode,
    } = transactionRecord;

    if (!transactionOnmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext("onmouuid", transactionOnmouuid);

    try {
      const rateLimiter = new RateLimiter();
      const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
        await rateLimiter.checkLimits({
          onmouuid: transactionOnmouuid,
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
        onmouuid: transactionOnmouuid,
        domain: "auth_general",
        action: "token_generate",
      });
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.RATE_LIMIT_SERVICE_ERROR);
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    if (!transactionAuthCode) {
      throw new Error("Transaction does not have auth_code");
    }
    if (!transactionCodeChallenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    if (!transactionScope) {
      throw new Error("Transaction does not have scope");
    }
    logger.addContext("scope", transactionScope);
    const transactionScopeArr = transactionScope.split(",");

    if (!transactionRecord.auth_flow) {
      throw new Error("Missing auth_flow in transaction");
    }
    if (!valid_auth_flows.includes(auth_flow)) {
      throw new Error(`Invalid auth_flow ${auth_flow} in transaction`);
    }
    logger.addContext("auth_flow", auth_flow);

    let authDomain: "web" | "app" | undefined;

    // assign auth domain based on auth flow
    if (auth_flow === OTP_AUTH_FLOW) {
      authDomain = "web";
      if (!transactionRecord.otp_sms_verified) {
        throw new Error(`otp not verified in transaction`);
      }
    }
    if (auth_flow === OTP_PASSCODE_AUTH_FLOW) {
      authDomain = "app";
      if (!transactionRecord.passcode_verified) {
        throw new Error(`passcode not verified`);
      }
    }
    if (auth_flow === BIOMETRICS_AUTH_FLOW) {
      authDomain = "app";
      if (!transactionRecord.biometrics_verified) {
        throw new Error(`biometrics not verified`);
      }
    }
    if (auth_flow === EXTRA_SCOPE_AUTH_FLOW) {
      authDomain = "app";
      if (!transactionRecord.passcode_verified && !transactionRecord.biometrics_verified) {
        throw new Error(`both passcode and biometrics not verified`);
      }
    }
    if (forgotten_passcode_auth_flows.includes(auth_flow)) {
      authDomain = "app";
      if (!transactionRecord.otp_email_verified) {
        throw new Error(`Email otp not verified`);
      }
    }
    if (!authDomain) {
      throw new Error("Failed to assign auth domain");
    }
    logger.addContext("authDomain", authDomain);

    if (transactionRecord.auth_code !== suppliedAuthCode) {
      logger.error(`Supplied auth_code does not match auth_code on transaction`);
      throw new Error("Invalid authcode");
    }

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": suppliedAuthCode },
    });
    if (!queryAuthCodesTableRes?.Items?.length) {
      throw new Error(
        `No record in ${AUTH_CODES_TABLE} found for supplied authcode ${suppliedAuthCode}`,
      );
    }
    const authCodeRecord = queryAuthCodesTableRes.Items[0];

    if (hasRecordExpired(authCodeRecord.ttl)) {
      throw new Error(`Auth code has expired. TTL: ${authCodeRecord.ttl}`);
    }

    const {
      onmouuid: authCodeOnmouuid,
      transaction_id: authCodeTransactionId,
      scope: authCodeScope,
      code_challenge: authCodeCodeChallenge,
    } = authCodeRecord as AuthCodeRecord;

    if (!authCodeOnmouuid || !authCodeTransactionId || !authCodeScope || !authCodeCodeChallenge) {
      throw new Error(`Record missing required attributes on authcode`);
    }

    if (authCodeOnmouuid !== transactionOnmouuid) {
      throw new Error(
        `Transaction onmouuid ${transactionOnmouuid} does not match onmouuid associated with authcode ${authCodeOnmouuid}`,
      );
    }
    if (authCodeTransactionId !== transaction_id) {
      throw new Error(
        `Supplied transaction_id ${transaction_id} does not match transaction_id associated with authcode ${authCodeTransactionId}`,
      );
    }
    if (authCodeScope !== transactionRecord.scope) {
      throw new Error(
        `Scope on auth code ${authCodeScope} does not match scope on transaction ${transactionRecord.scope}`,
      );
    }

    const generatedCodeChallenge = generateCodeChallenge(suppliedCodeVerifier);
    if (
      generatedCodeChallenge !== transactionCodeChallenge ||
      generatedCodeChallenge !== authCodeCodeChallenge
    ) {
      throw new Error(`Supplied code_verifier does not match stored code_challenge`);
    }

    if (transactionRecord.create_refresh_token !== authCodeRecord.create_refresh_token) {
      throw new Error(`create_refresh_token on transaction does not match in auth code`);
    }
    const { create_refresh_token, device_id, login_flow } = transactionRecord;
    logger.addContext("create_refresh_token", !!create_refresh_token);
    if (device_id) logger.addContext("device_id", device_id);
    if (login_flow) logger.addContext("login_flow", login_flow);

    // FOR APP TESTER
    let isAppTesterNumber = false;
    if (transactionRecord.phone_number && transactionRecord.phone_number === APP_TESTER_NUMBER) {
      logger.warn("***** THIS IS APP TESTER NUMBER *****");
      isAppTesterNumber = true;
    }

    if (
      device_id &&
      !isAppTesterNumber && // FOR APP TESTER
      ((login_flow && login_flow === FIRST_TIME_LOGIN_FLOW) ||
        auth_flow === FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW)
    ) {
      try {
        const queryUserTableRes = await queryTableMethod({
          TableName: USER_TABLE,
          IndexName: "dev-index",
          KeyConditionExpression: "dev = :device_id",
          ExpressionAttributeValues: { ":device_id": device_id },
        });
        if (queryUserTableRes?.Items?.length) {
          logger.warn(`${queryUserTableRes.Count} user(s) found, voiding device_id for record(s)`);

          for (const { onmouuid: userRecordOnmouuid } of queryUserTableRes.Items) {
            await updateItemMethod({
              TableName: USER_TABLE,
              Key: { onmouuid: userRecordOnmouuid },
              UpdateExpression: "set dev = :voided",
              ExpressionAttributeValues: { ":voided": "VOIDED" },
            });
          }
        }
        await updateItemMethod({
          TableName: USER_TABLE,
          Key: { onmouuid: transactionOnmouuid },
          UpdateExpression: "set dev = :device_id",
          ExpressionAttributeValues: { ":device_id": device_id },
        });
        logger.info("Successfully updated user record with new device_id");
      } catch (error: any) {
        logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
        throw new Error(`Error in device_id uniqueness process: ${error?.message || error}`);
      }
    }

    try {
      const queryTokensTableRes = await queryTableMethod({
        TableName: AUTH_TOKENS_TABLE,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": transactionOnmouuid },
        ExpressionAttributeNames: { "#scope": "scope", "#domain": "domain" },
        ProjectionExpression: "token_id, onmouuid, #scope, #domain",
      });
      if (queryTokensTableRes?.Items?.length) {
        for (const tokenRecord of queryTokensTableRes.Items) {
          const { token_id, onmouuid, scope: tokenScope, domain } = tokenRecord;

          if (!tokenScope) {
            logger.error("Existing token does not have scope");
            continue;
          }

          const isAllowed = noExclusiveScope({
            newScopes: transactionScopeArr,
            existingScopes: tokenScope.split(","),
            exclusiveScopes,
          });

          if ((domain && domain === authDomain) || !isAllowed) {
            await deleteItemMethod({ TableName: AUTH_TOKENS_TABLE, Key: { token_id, onmouuid } });
          }
        }
      }
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
      throw new Error(`Error processing token deletion: ${error?.message || error}`);
    }

    // determine access token lifetime
    let lowestTokenLifetime = tokenLifetimes?.access_token_default || 30;
    for (const scope of transactionScopeArr) {
      if (scope in tokenLifetimes && tokenLifetimes[scope] < lowestTokenLifetime) {
        lowestTokenLifetime = tokenLifetimes[scope];
      }
    }

    // if first time login, add first time login scope to access token (not on refresh token!)
    // (for resources that require an extra-scope, unless it's first time login)
    const accessTokenScope =
      login_flow && login_flow === FIRST_TIME_LOGIN_FLOW && !isAppTesterNumber
        ? [...transactionScopeArr, FIRST_TIME_LOGIN_SCOPE].join(",")
        : transactionScope;

    const accessToken = generateAccessToken({
      onmouuid: transactionOnmouuid,
      scope: accessTokenScope,
      secretKey: priv_signing_key,
      expiryMinutes: lowestTokenLifetime,
    });
    const { access_token } = accessToken;

    try {
      await putItemMethod({
        TableName: AUTH_TOKENS_TABLE,
        Item: {
          token_id: accessToken.token_id,
          onmouuid: transactionOnmouuid,
          scope: accessTokenScope,
          token: accessToken.access_token,
          domain: authDomain,
          ttl: accessToken.expires_in,
        },
      });
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
      throw new Error(
        `Error adding ${authDomain} domain token to ${AUTH_TOKENS_TABLE} table: ${error?.message || error}`,
      );
    }

    try {
      await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
      throw new Error(
        `Error deleting record from ${AUTH_TRANSACTIONS_TABLE} table: ${error?.message || error}`,
      );
    }
    try {
      await deleteItemMethod({ TableName: AUTH_CODES_TABLE, Key: { auth_code: suppliedAuthCode } });
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
      throw new Error(
        `Error deleting record from ${AUTH_CODES_TABLE} table: ${error?.message || error}`,
      );
    }

    if (!keep_existing_refresh_token_flows.includes(auth_flow)) {
      try {
        const queryRefTokensTableRes = await queryTableMethod({
          TableName: AUTH_REFRESH_TOKENS_TABLE,
          IndexName: "onmouuid-index",
          KeyConditionExpression: "onmouuid = :onmouuid",
          ExpressionAttributeValues: { ":onmouuid": transactionOnmouuid },
          ExpressionAttributeNames: { "#scope": "scope", "#domain": "domain" },
          ProjectionExpression: "token_id, onmouuid, #scope, #domain",
        });
        if (queryRefTokensTableRes?.Items?.length) {
          let refreshTokenDeleteCount = 0;

          for (const refreshTokenRecord of queryRefTokensTableRes.Items) {
            const { token_id, onmouuid, scope: tokenScope, domain } = refreshTokenRecord;

            if (!tokenScope) {
              logger.error("Token does not have scope");
              continue;
            }

            const isAllowed = noExclusiveScope({
              newScopes: transactionScope.split(","),
              existingScopes: tokenScope.split(","),
              exclusiveScopes,
            });

            if ((domain && domain === authDomain) || !isAllowed) {
              await deleteItemMethod({
                TableName: AUTH_REFRESH_TOKENS_TABLE,
                Key: { token_id, onmouuid },
              });
              refreshTokenDeleteCount += 1;
            }
          }
        }
      } catch (error: any) {
        logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
        throw new Error(`Error processing refresh token deletion: ${error?.message || error}`);
      }
    }

    if (!transactionRecord.create_refresh_token || !authCodeRecord.create_refresh_token) {
      return apiResponse(200, { access_token });
    }

    const refreshTokenLifetime = tokenLifetimes?.refresh_token_default || 60;
    const refreshToken = generateAccessToken({
      onmouuid: transactionOnmouuid,
      scope: transactionScope,
      secretKey: priv_signing_key,
      expiryMinutes: refreshTokenLifetime,
    });
    const { access_token: refresh_token } = refreshToken;

    try {
      await putItemMethod({
        TableName: AUTH_REFRESH_TOKENS_TABLE,
        Item: {
          token_id: refreshToken.token_id,
          onmouuid: transactionOnmouuid,
          scope: transactionScope,
          token: refreshToken.access_token,
          domain: authDomain,
          ttl: refreshToken.expires_in,
        },
      });
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
      throw new Error(
        `Error adding ${authDomain} domain token to ${AUTH_REFRESH_TOKENS_TABLE} table: ${error?.message || error}`,
      );
    }
    return apiResponse(200, { access_token, refresh_token });
  } catch (error: any) {
    if (transaction_id) {
      try {
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    if (suppliedAuthCode) {
      try {
        await deleteItemMethod({
          TableName: AUTH_CODES_TABLE,
          Key: { auth_code: suppliedAuthCode },
        });
      } catch (error: any) {
        logger.error(`Failed to void auth code: ${error?.message || error}`);
      }
    }
    throw error;
  }
};
