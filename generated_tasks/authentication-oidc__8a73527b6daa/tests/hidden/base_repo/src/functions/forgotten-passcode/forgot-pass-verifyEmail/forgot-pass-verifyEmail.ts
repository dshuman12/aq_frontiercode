import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import {
  deleteItemMethod,
  putItemMethod,
  queryTableMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { TransactionRecord } from "@shared-types/records";
import { formatJSONResponse } from "@libs/gatewayUtils";
import {
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  OTP_SEND_LIMIT,
  SIXTY_SECONDS,
} from "@libs/constants";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { generateAuthCode } from "@libs/crypto";

type HandlerEvent = { body: string; pathParameters: { transaction_id?: string } };
type ParsedRequestBody = { verify_code?: number };

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

    const { verify_code: suppliedVerifyCode }: ParsedRequestBody = JSON.parse(event.body);
    if (!suppliedVerifyCode) {
      throw new Error("Missing suppliedVerifyCode in request");
    }
    logger.addContext({ suppliedVerifyCode });

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: auth_transactions_table,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${auth_transactions_table}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];
    const { onmouuid: transactionOnmouuid, auth_flow } = transactionRecord;
    if (!transactionOnmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ transactionOnmouuid });

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
        return formatJSONResponse({ statusCode: 429, body: { expiry_time } });
      }
      await rateLimiter.recordAction({
        onmouuid: transactionOnmouuid,
        domain: "auth_forgotten_passcode",
        action: "otp_email_verify",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    if (!auth_flow) {
      throw new Error("Transaction does not have auth_flow");
    }
    if (
      auth_flow !== FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW &&
      auth_flow !== FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW
    ) {
      throw new Error(
        `Transaction auth_flow: ${auth_flow}, expected ${FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW} or ${FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW}`,
      );
    }
    logger.addContext({ auth_flow });

    const { verify_code: storedVerifyCode } = transactionRecord as TransactionRecord;
    logger.addContext({ storedVerifyCode });

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(
        `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
      );
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    if (transactionRecord.create_refresh_token) {
      throw new Error("Transaction has create_refresh_token=true");
    }

    if (!("otp_email_send_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_email_send_count");
    }
    const { otp_email_send_count } = transactionRecord;
    logger.addContext({ otp_email_send_count });
    if (!("otp_email_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_email_attempt_count");
    }
    const { otp_email_attempt_count } = transactionRecord;
    logger.addContext({ otp_email_attempt_count });

    if (otp_email_send_count < 1) {
      throw new Error(`Transaction should have otp_email_send_count of at least 1`);
    }
    if (otp_email_send_count > OTP_SEND_LIMIT) {
      throw new Error(
        `Transaction has otp_email_send_count greater than limit of ${OTP_SEND_LIMIT}`,
      );
    }
    if (otp_email_attempt_count > OTP_ATTEMPT_LIMIT) {
      throw new Error(
        `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
      );
    }

    if (!transactionRecord.code_challenge) {
      throw new Error("Transaction does not have code_challenge");
    }
    const { code_challenge } = transactionRecord;
    if (!transactionRecord.scope) {
      throw new Error("Transaction does not have scope");
    }
    const { scope } = transactionRecord;
    if (!transactionRecord.device_id) {
      throw new Error("Transaction does not have device_id");
    }

    if (!transactionRecord.phone_number) {
      throw new Error("Transaction missing phone_number");
    }
    if (!transactionRecord.email_address) {
      throw new Error("Transaction missing email_address");
    }
    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }

    if (!transactionRecord.otp_sms_verified) {
      throw new Error("SMS OTP not verified");
    }
    if (transactionRecord.otp_email_verified) {
      logger.warn("Email OTP has already been verified");
      return formatJSONResponse({
        statusCode: 400,
      });
    }

    if (transactionRecord.auth_code) {
      throw new Error("Transaction already been used for an auth code");
    }

    if (transactionRecord.next_endpoint !== `${transaction_id}/forgotten-passcode/email/verify`) {
      throw new Error("Transaction next_endpoint does not match this endpoint");
    }

    if (hasRecordExpired(transactionRecord.otp_email_expiry_time)) {
      logger.warn("OTP has expired");

      // otp send limit reached -> restart auth flow
      if (otp_email_send_count >= OTP_SEND_LIMIT) {
        logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

        logger.info("Voiding transaction");
        try {
          await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
          logger.info("Transaction successfully voided");
        } catch (error: any) {
          logger.error(`Failed to void transaction: ${error?.message || error}`);
        }

        const nextEndpoint =
          auth_flow === FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW
            ? "authorize/forgotten-passcode/logged-in"
            : "authorize/forgotten-passcode/logged-out";

        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
            next_endpoint: nextEndpoint,
          },
        });
      }
      // otp send limit not yet reached -> resend
      else {
        const otp_resend_endpoint = `${transaction_id}/forgotten-passcode/email/resend`;
        try {
          await updateItemMethod({
            TableName: auth_transactions_table,
            Key: { transaction_id },
            UpdateExpression: "set next_endpoint = :next_endpoint",
            ExpressionAttributeValues: { ":next_endpoint": otp_resend_endpoint },
          });
        } catch (error: any) {
          throw new Error(`Error updating transaction: ${error?.message || error}`);
        }

        return formatJSONResponse({
          statusCode: 422,
          body: { error_code: OTP_EXPIRED_RESEND, next_endpoint: otp_resend_endpoint },
        });
      }
    }

    const new_otp_email_attempt_count = otp_email_attempt_count + 1;
    logger.addContext({ otp_email_attempt_count: new_otp_email_attempt_count });

    if (suppliedVerifyCode !== storedVerifyCode) {
      logger.warn("Supplied verify code does not match stored verify code");

      if (new_otp_email_attempt_count >= OTP_ATTEMPT_LIMIT) {
        logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);

        logger.info("Voiding transaction");
        try {
          await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
          logger.info("Transaction successfully voided");
        } catch (error: any) {
          logger.error(`Failed to void transaction: ${error?.message || error}`);
        }

        const nextEndpoint =
          auth_flow === FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW
            ? "authorize/forgotten-passcode/logged-in"
            : "authorize/forgotten-passcode/logged-out";

        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
            next_endpoint: nextEndpoint,
          },
        });
      }

      const otp_verify_endpoint = `${transaction_id}/forgotten-passcode/email/verify`;
      try {
        await updateItemMethod({
          TableName: auth_transactions_table,
          Key: { transaction_id },
          UpdateExpression:
            "set otp_email_attempt_count = :otpAttemptCount, next_endpoint = :next_endpoint",
          ExpressionAttributeValues: {
            ":otpAttemptCount": new_otp_email_attempt_count,
            ":next_endpoint": otp_verify_endpoint,
          },
        });
      } catch (error: any) {
        throw new Error(`Error updating transaction: ${error?.message || error}`);
      }
      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: OTP_INVALID_REATTEMPT, next_endpoint: otp_verify_endpoint },
      });
    }

    const token_endpoint = "token";
    const auth_code = generateAuthCode();
    logger.addContext({ auth_code });

    try {
      await updateItemMethod({
        TableName: auth_transactions_table,
        Key: { transaction_id },
        UpdateExpression: `set ${[
          "otp_email_attempt_count = :otpAttemptCount",
          "otp_email_verified = :otpVerified",
          "next_endpoint = :nextEndpoint",
          "auth_code = :authCode",
        ].join(", ")}`,
        ExpressionAttributeValues: {
          ":otpAttemptCount": new_otp_email_attempt_count,
          ":otpVerified": true,
          ":nextEndpoint": token_endpoint,
          ":authCode": auth_code,
        },
      });
    } catch (error: any) {
      throw new Error(
        `Error updating transaction with otp_email_verified=true: ${error?.message || error}`,
      );
    }
    logger.info("Updated transaction with otp_email_verified=true");

    const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
    try {
      await putItemMethod({
        TableName: auth_codes_table,
        Item: {
          auth_code,
          onmouuid: transactionOnmouuid,
          transaction_id,
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
      `Auth code record created in ${auth_codes_table} with ttl ${ttl}, returning 200 and the auth code ${auth_code}`,
    );

    return formatJSONResponse({
      statusCode: 200,
      body: { auth_code, next_endpoint: token_endpoint },
    });
  } catch (error: any) {
    if (transaction_id) {
      logger.info("Voiding transaction");
      try {
        await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
        logger.info("Transaction successfully voided");
      } catch (error: any) {
        logger.error(`Failed to void transaction: ${error?.message || error}`);
      }
    }
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
