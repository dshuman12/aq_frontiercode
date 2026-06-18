import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { Logger } from "@onmoapp/onmo-logger";
import { deleteItemMethod, putItemMethod } from "@onmoapp/onmo-dynamodb";
import { generateOTPMessageBody, sendSMS } from "@libs/sms";
import { AUTH_TRANSACTIONS_TABLE, SIXTY_SECONDS } from "@libs/constants";
import { createVerify } from "crypto";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { RecordActionInput } from "@onmoapp/onmo-rate-limiter/lib/cjs/types/types";
import { z } from "zod";

export type ExtraScopeEvent = {
  pathParameters: { transaction_id: string };
  requestContext: { authorizer: { onmouuid: string } };
};

export type AuthorizerEvent = {
  body: string;
  headers?: { "x-force-hal"?: string | undefined };
  requestContext: { authorizer: { onmouuid: string; scope?: string | undefined } };
};

export const checkRateLimit = async (action: RecordActionInput, logger: Logger) => {
  try {
    const rateLimiter = new RateLimiter();
    const {
      rate_limited: rateLimited,
      limited_actions: limitedActions,
      super_rate_limited: superRateLimited,
      super_limited_actions: superLimitedActions,
    } = await rateLimiter.checkLimits({
      onmouuid: action.onmouuid,
      to_check: [
        { domain: "auth_general" },
        { domain: "auth_login" },
        { domain: "auth_extra_scope" },
        { domain: "auth_forgotten_passcode" },
        { domain: "auth_biometrics_registration" },
      ],
    });
    if (rateLimited || superRateLimited) {
      const all_limited_actions = [...new Set([...limitedActions, ...superLimitedActions])];
      logger.warn(`Rate limited for actions: ${JSON.stringify(all_limited_actions)}`);

      const expiry_time = superRateLimited
        ? "no_expiry"
        : Math.max(...limitedActions.map((limitedAction) => limitedAction.rate_limit_expiry ?? 0));
      return formatJSONResponse({ statusCode: 429, body: { expiry_time } });
    }
    await rateLimiter.recordAction(action);
  } catch (error: any) {
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }
};

export const sendOTP = async (phoneNumber: string, verifyCode: number, logger: Logger) => {
  const env = process.env.ENVIRONMENT as string;
  try {
    await sendSMS({
      phoneNumber: phoneNumber,
      messageBody: generateOTPMessageBody(verifyCode, env),
    });
    logger.info(`Sent OTP code ${verifyCode} to ${phoneNumber}`);
  } catch (error: any) {
    if (error?.message?.startsWith("ValidationError:")) {
      logger.warn(`Error sending OTP code: ${error}`);
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Failed to validate phone number" },
      });
    }
    logger.error(`Error sending OTP code: ${error}`);
    throw new Error(`Error sending OTP`);
  }
};

export const voidTransaction = async (transactionId: string, logger: Logger) => {
  const authTransactionsTable = AUTH_TRANSACTIONS_TABLE;
  logger.info("Voiding transaction");
  try {
    await deleteItemMethod({ TableName: authTransactionsTable, Key: { transactionId } });
    logger.info("Transaction successfully voided");
  } catch (error: any) {
    logger.error(`Failed to void transaction: ${error?.message || error}`);
  }
};

export const verifySignedChallenge = (
  unsignedChallenge: any,
  signedChallenge: string,
  publicKey: string,
  logger: Logger,
) => {
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(unsignedChallenge);

    const isVerified = verifier.verify(
      `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
      signedChallenge,
      "base64",
    );
    if (!isVerified) {
      throw new Error("Supplied challenge does not match stored challenge");
    }

    logger.info("Signed challenge verified");
  } catch (error: any) {
    throw new Error(`Failed to verify supplied challenge: ${error?.message || error}`);
  }
};

export const writeAuthCode = async (
  transactionRecord: Record<string, any>,
  transactionId: string,
  authCode: string,
  logger: Logger,
) => {
  const auth_codes_table = process.env.AUTH_CODES_TABLE as string;
  const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
  const { scope, code_challenge, onmouuid: transactionOnmoUuid } = transactionRecord;
  try {
    await putItemMethod({
      TableName: auth_codes_table,
      Item: {
        auth_code: authCode,
        onmouuid: transactionOnmoUuid,
        transaction_id: transactionId,
        scope,
        code_challenge,
        create_refresh_token: false,
        ttl,
      },
    });
  } catch (error: any) {
    throw new Error(`Error creating auth code record: ${error?.message || error}`);
  }
  logger.info(
    `Auth code record created in ${auth_codes_table} with ttl ${ttl}, returning 200 and the auth code ${authCode}`,
  );
};

// switch to using a codec for json event parsing

export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
