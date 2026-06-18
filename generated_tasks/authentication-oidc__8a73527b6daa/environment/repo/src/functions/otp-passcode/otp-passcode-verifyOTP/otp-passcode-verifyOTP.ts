import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { hasRecordExpired } from "@libs/utils";
import { formatJSONResponse } from "@libs/gatewayUtils";
import {
  FIRST_TIME_LOGIN_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_SEND_LIMIT,
} from "@libs/constants";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";

type ParsedRequestBody = { phone_number?: string; verify_code?: number };

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

export const handler = async (event: {
  pathParameters: { transaction_id?: string };
  body: string;
}) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    logger.info(`Received event body: ${event.body}`);

    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });

    const { phone_number, verify_code: suppliedVerifyCode }: ParsedRequestBody = JSON.parse(
      event.body,
    );
    if (!phone_number || !suppliedVerifyCode) {
      logger.warn("Missing required attributes in request");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ phone_number });

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: auth_transactions_table,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${auth_transactions_table}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];
    const {
      onmouuid,
      auth_flow,
      login_flow,
      otp_sms_send_count,
      otp_sms_attempt_count,
      verify_code: storedVerifyCode,
    } = transactionRecord;

    if (!onmouuid) {
      logger.warn("Transaction does not have onmouuid");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ onmouuid });

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
        domain: "auth_login",
        action: "otp_sms_verify",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    try {
      if (!auth_flow) {
        throw new Error("[suspicious_activity] Transaction does not have auth_flow");
      }
      if (auth_flow !== OTP_PASSCODE_AUTH_FLOW) {
        throw new Error(
          `[suspicious_activity] Transaction login_flow: ${auth_flow}, expected: ${OTP_PASSCODE_AUTH_FLOW}`,
        );
      }
      logger.addContext({ auth_flow });
      if (!login_flow) {
        throw new Error("[suspicious_activity] Transaction does not have login_flow");
      }
      if (login_flow !== FIRST_TIME_LOGIN_FLOW) {
        throw new Error(
          `[suspicious_activity] Transaction login_flow: ${login_flow}, expected: ${FIRST_TIME_LOGIN_FLOW}`,
        );
      }
      logger.addContext({ login_flow });

      logger.addContext({ storedVerifyCode });

      if (hasRecordExpired(transactionRecord.ttl)) {
        throw new Error(
          `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
        );
      }
      if (!transactionRecord.next_endpoint) {
        throw new Error("Transaction does not have next_endpoint");
      }
      if (!("create_refresh_token" in transactionRecord)) {
        throw new Error("Transaction missing create_refresh token");
      }
      if (!transactionRecord.create_refresh_token) {
        throw new Error("Transaction not marked with create_refresh_token=true");
      }
      if (!transactionRecord.phone_number) {
        throw new Error("Transaction does not have phone_number");
      }
      if (!transactionRecord.verify_code) {
        throw new Error("Transaction does not have verify_code");
      }
      if (!("otp_sms_verified" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_verified");
      }
      if (!("otp_sms_expiry_time" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_expiry_time");
      }
      if (!("otp_sms_send_count" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_send_count");
      }

      logger.addContext({ otp_sms_send_count });
      if (!("otp_sms_attempt_count" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_attempt_count");
      }

      logger.addContext({ otp_sms_attempt_count });
      if (!("passcode_attempt_count" in transactionRecord)) {
        throw new Error("Transaction does not have passcode_attempt_count");
      }
      if (!("passcode_verified" in transactionRecord)) {
        throw new Error("Transaction does not have passcode_attempt_count");
      }

      if (
        !transactionRecord.code_challenge ||
        !transactionRecord.scope ||
        !transactionRecord.device_id
      ) {
        throw new Error(
          `[suspicious_activity] Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`,
        );
      }

      if (transactionRecord.passcode_attempt_count > 0) {
        throw new Error(`Transaction should have passcode_attempt_count of 0`);
      }
      if (transactionRecord.passcode_verified) {
        throw new Error("Passcode has already been verified");
      }
      if (transactionRecord.otp_sms_verified) {
        throw new Error("OTP has already been verified");
      }
      if (transactionRecord.auth_code) {
        throw new Error("Transaction already been used for an auth code");
      }

      if (transactionRecord.next_endpoint !== `${transaction_id}/otp-passcode/otp/verify`) {
        throw new Error("Transaction next_endpoint does not match this endpoint");
      }
      if (transactionRecord.phone_number !== phone_number) {
        throw new Error("Phone number on transaction does not match provided one");
      }
      if (otp_sms_send_count < 1) {
        throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
      }
      if (otp_sms_send_count > OTP_SEND_LIMIT) {
        throw new Error(
          `Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`,
        );
      }
      if (otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
        throw new Error(
          `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
        );
      }
    } catch (error: any) {
      logger.warn(error.message);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    if (hasRecordExpired(transactionRecord.otp_sms_expiry_time)) {
      logger.warn("OTP has expired");

      // otp send limit reached -> restart auth flow
      if (otp_sms_send_count >= OTP_SEND_LIMIT) {
        logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

        logger.info("Voiding transaction");
        try {
          await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
          logger.info("Transaction successfully voided");
        } catch (error: any) {
          logger.error(`Failed to void transaction: ${error?.message || error}`);
        }

        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
            next_endpoint: "authorize/otp-passcode",
          },
        });
      }
      // otp send limit not yet reached -> resend
      else {
        const otp_resend_endpoint = `${transaction_id}/otp-passcode/otp/resend`;
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

    const new_otp_sms_attempt_count = otp_sms_attempt_count + 1;
    logger.addContext({ otp_sms_attempt_count: new_otp_sms_attempt_count });

    if (suppliedVerifyCode !== storedVerifyCode) {
      logger.warn("Supplied verify code does not match stored verify code");

      if (new_otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
        logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);

        logger.info("Voiding transaction");
        try {
          await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
          logger.info("Transaction successfully voided");
        } catch (error: any) {
          logger.error(`Failed to void transaction: ${error?.message || error}`);
        }

        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
            next_endpoint: "authorize/otp-passcode",
          },
        });
      }

      const otp_verify_endpoint = `${transaction_id}/otp-passcode/otp/verify`;
      try {
        await updateItemMethod({
          TableName: auth_transactions_table,
          Key: { transaction_id },
          UpdateExpression:
            "set otp_sms_attempt_count = :otpAttemptCount, next_endpoint = :next_endpoint",
          ExpressionAttributeValues: {
            ":otpAttemptCount": new_otp_sms_attempt_count,
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

    try {
      await updateItemMethod({
        TableName: auth_transactions_table,
        Key: { transaction_id },
        UpdateExpression: `set ${[
          "otp_sms_attempt_count = :otpAttemptCount",
          "otp_sms_verified = :otpVerified",
          "passcode_attempt_count = :passcodeAttemptCount",
          "passcode_verified = :passcodeVerified",
          "next_endpoint = :nextEndpoint",
        ].join(", ")}`,
        ExpressionAttributeValues: {
          ":otpAttemptCount": new_otp_sms_attempt_count,
          ":otpVerified": true,
          ":passcodeAttemptCount": 0,
          ":passcodeVerified": false,
          ":nextEndpoint": `${transaction_id}/otp-passcode/passcode/verify`,
        },
      });
    } catch (error: any) {
      throw new Error(
        `Error updating transaction with otp_sms_verified=true passcode_verified=false: ${error?.message || error}`,
      );
    }
    logger.info("Updated transaction with otp_verifed=true passcode_verified=false");

    return formatJSONResponse({
      statusCode: 200,
      body: { next_endpoint: `${transaction_id}/otp-passcode/passcode/verify` },
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
