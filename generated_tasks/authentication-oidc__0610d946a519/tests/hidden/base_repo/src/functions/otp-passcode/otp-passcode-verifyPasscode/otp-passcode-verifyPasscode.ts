import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import {
  deleteItemMethod,
  putItemMethod,
  queryTableMethod,
  updateItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import {
  PASSCODE_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  FIRST_TIME_LOGIN_FLOW,
  RELOGIN_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  SIXTY_SECONDS,
  OTP_ATTEMPT_LIMIT,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
} from "@libs/constants";
import { generateAuthCode } from "@libs/crypto";
import {
  backupLegacyPasscodeRecords,
  migrateEncryptedPasscodeToHashed,
  verifyHashedPasscode,
  verifyPasscodeEncrypted,
} from "@libs/passcode";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { APP_TESTER_NUMBER, AppTesterLoginConfig } from "@libs/testConstants";
import { getParameter } from "@onmoapp/onmo-ssm";

type ParsedRequestBody = { passcode?: string };

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;
const legacy_auth_table = process.env.LEGACY_AUTH_TABLE as string;
const legacy_rsa_table = process.env.LEGACY_RSA_TABLE as string;

// FOR APP TESTER
const app_tester_login_config = process.env.APP_TESTER_LOGIN_CONFIG as string;

export const handler = async (event: {
  pathParameters: { transaction_id?: string };
  body: string;
}) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      logger.warn("Missing transaction_id in path parameters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.addContext({ transaction_id });
    logger.info("Got transaction id from request");

    const { passcode: suppliedPasscode }: ParsedRequestBody = JSON.parse(event.body);
    if (!suppliedPasscode) {
      logger.warn("Missing passcode in request");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (!/^\d+$/.test(suppliedPasscode)) {
      logger.warn("Supplied passcode contains non-numeric characters");
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    if (suppliedPasscode.length !== 6) {
      logger.warn(`Supplied passcode should be 6 digits but has ${suppliedPasscode.length}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.info("Got passcode from request");

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: auth_transactions_table,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${auth_transactions_table}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }
    logger.info("Got transaction record");

    const transactionRecord = queryTransactionsTableRes.Items[0];
    const { onmouuid, auth_flow, login_flow } = transactionRecord;
    const { scope, code_challenge } = transactionRecord;
    const { passcode_attempt_count } = transactionRecord;

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
        action: "passcode_verify",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    let isAppTesterNumber = false;

    try {
      if (!auth_flow) {
        throw new Error("Transaction does not have auth_flow");
      }
      if (auth_flow !== OTP_PASSCODE_AUTH_FLOW) {
        throw new Error(`Transaction auth_flow: ${auth_flow}, expected: ${OTP_PASSCODE_AUTH_FLOW}`);
      }
      logger.addContext({ auth_flow });
      if (!login_flow) {
        throw new Error("Transaction does not have login_flow");
      }
      if (login_flow !== FIRST_TIME_LOGIN_FLOW && login_flow !== RELOGIN_FLOW) {
        throw new Error(
          `Transaction login_flow: ${login_flow}, expected: ${FIRST_TIME_LOGIN_FLOW} or: ${RELOGIN_FLOW}`,
        );
      }
      logger.info(`*** LOGIN FLOW: ${login_flow} ***`);
      logger.addContext({ login_flow });

      if (hasRecordExpired(transactionRecord.ttl)) {
        throw new Error(
          `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
        );
      }
      if (!transactionRecord.next_endpoint) {
        throw new Error("Transaction does not have next_endpoint");
      }
      if (!("create_refresh_token" in transactionRecord)) {
        throw new Error("Transaction does not have create_refresh_token");
      }
      if (!transactionRecord.create_refresh_token) {
        throw new Error("Transaction not marked with create_refresh_token=true");
      }
      if (!("passcode_verified" in transactionRecord)) {
        throw new Error("Transaction does not have passcode_verified");
      }
      if (!("passcode_attempt_count" in transactionRecord)) {
        throw new Error("Transaction does not have passcode_attempt_count");
      }

      logger.addContext({ passcode_attempt_count });

      if (
        !transactionRecord.code_challenge ||
        !transactionRecord.scope ||
        !transactionRecord.device_id
      ) {
        throw new Error(`Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`);
      }
      if (transactionRecord.auth_code) {
        throw new Error("Transaction already been used for an auth code");
      }
      if (transactionRecord.passcode_verified) {
        throw new Error("Passcode has already been verified");
      }
      if (passcode_attempt_count >= PASSCODE_ATTEMPT_LIMIT) {
        throw new Error(
          `Transaction has already reached total passcode attempt limit of ${PASSCODE_ATTEMPT_LIMIT}`,
        );
      }

      if (transactionRecord.next_endpoint !== `${transaction_id}/otp-passcode/passcode/verify`) {
        throw new Error(
          `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/otp-passcode/passcode/verify, but received: ${transactionRecord.next_endpoint}`,
        );
      }

      if (login_flow === FIRST_TIME_LOGIN_FLOW) {
        if (!transactionRecord.phone_number) {
          throw new Error("Transaction does not have phone_number, expected for first time login");
        }

        // FOR APP TESTER
        if (transactionRecord.phone_number === APP_TESTER_NUMBER) {
          logger.warn("***** THIS IS APP TESTER NUMBER *****");
          isAppTesterNumber = true;
        }

        if (!transactionRecord.verify_code) {
          throw new Error("Transaction does not have verify_code, expected for first time login");
        }
        if (!("otp_sms_verified" in transactionRecord)) {
          throw new Error(
            "Transaction does not have otp_sms_verified, expected for first time login",
          );
        }
        if (!("otp_sms_expiry_time" in transactionRecord)) {
          throw new Error(
            "Transaction does not have otp_sms_expiry_time, expected for first time login",
          );
        }
        if (!("otp_sms_send_count" in transactionRecord)) {
          throw new Error(
            "Transaction does not have otp_sms_send_count, expected for first time login",
          );
        }
        if (!("otp_sms_attempt_count" in transactionRecord)) {
          throw new Error("Transaction does not have otp_sms_attempt_count");
        }
        if (transactionRecord.otp_sms_send_count < 1) {
          throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
        }
        if (transactionRecord.otp_sms_send_count > OTP_SEND_LIMIT) {
          throw new Error(
            `Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`,
          );
        }
        if (transactionRecord.otp_sms_attempt_count > OTP_ATTEMPT_LIMIT) {
          throw new Error(
            `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
          );
        }
        if (!transactionRecord.otp_sms_verified) {
          throw new Error("OTP has not been verified");
        }
      }

      if (login_flow === RELOGIN_FLOW) {
        if (transactionRecord.phone_number) {
          throw new Error("Transaction has phone_number, not expected for relogin");
        }
        if (transactionRecord.verify_code) {
          throw new Error("Transaction has verify_code, not expected for relogin");
        }
        if ("otp_sms_verified" in transactionRecord) {
          throw new Error("Transaction has otp_sms_verified, not expected for relogin");
        }
        if ("otp_sms_expiry_time" in transactionRecord) {
          throw new Error("Transaction has otp_sms_expiry_time, not expected for relogin");
        }
        if ("otp_sms_send_count" in transactionRecord) {
          throw new Error("Transaction has otp_sms_send_count, not expected for relogin");
        }
        if ("otp_sms_attempt_count" in transactionRecord) {
          throw new Error("Transaction has otp_sms_attempt_count, not expected for relogin");
        }
      }
    } catch (error: any) {
      logger.warn(error.message);
      return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
    }

    logger.info("Validated transaction");

    const new_passcode_attempt_count = passcode_attempt_count + 1;
    logger.addContext({ passcode_attempt_count: new_passcode_attempt_count });

    // Check both legacy tables first
    const [queryAuthTableRes, queryRsaTableRes] = await Promise.all([
      queryTableMethod({
        TableName: legacy_auth_table,
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": onmouuid },
      }),
      queryTableMethod({
        TableName: legacy_rsa_table,
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": onmouuid },
      }),
    ]);
    const hasAuthRecord = !!queryAuthTableRes?.Items?.length;
    const hasRsaRecord = !!queryRsaTableRes?.Items?.length;

    let passcodesMatch = false;

    // FOR APP TESTER
    if (isAppTesterNumber) {
      try {
        const { Parameter: appTesterParam } = await getParameter({
          Name: app_tester_login_config,
        });
        if (!appTesterParam?.Value) {
          throw new Error(`Failed to fetch app tester login config parameter from ssm`);
        }
        const { enabled, sms_otp, passcode } = JSON.parse(
          appTesterParam.Value,
        ) as AppTesterLoginConfig;
        logger.addContext({ APP_TESTER_SMS_OTP: sms_otp, APP_TESTER_PASSCODE: passcode });

        if (!sms_otp) {
          throw new Error("Missing sms otp in SSM param");
        }
        if (!passcode) {
          throw new Error("Missing passcode in SSM param");
        }
        if (!enabled) {
          throw new Error("App tester login config is disabled");
        }

        if (suppliedPasscode === passcode) {
          passcodesMatch = true;
        }
        logger.warn("App tester login config retrieved successfully");
      } catch (error: any) {
        throw new Error("Failed to get app tester login config");
      }
    }
    //
    else if (hasAuthRecord && hasRsaRecord) {
      logger.info("Found encrypted passcode records, verifying supplied passcode against encrypt");

      passcodesMatch = await verifyPasscodeEncrypted({
        passcode: suppliedPasscode,
        onmouuid,
        logger,
      });

      if (passcodesMatch) {
        logger.info("Encrypted passcode verified, generating hash");
        try {
          await backupLegacyPasscodeRecords({ onmouuid, logger });
          await migrateEncryptedPasscodeToHashed({
            passcode: suppliedPasscode,
            onmouuid,
            logger,
          });
        } catch (error: any) {
          throw new Error(
            `Failed to migrated encrypted passcode to hashed: ${error?.message || error}`,
          );
        }
      }
    } //
    else {
      logger.info("Verifying supplied passcode against hash");
      passcodesMatch = await verifyHashedPasscode({ passcode: suppliedPasscode, onmouuid });
    }

    if (!passcodesMatch) {
      logger.warn("Supplied passcode does not match stored passcode");

      if (new_passcode_attempt_count >= PASSCODE_ATTEMPT_LIMIT) {
        logger.warn(
          `Transaction has reached total passcode attempt limit of ${PASSCODE_ATTEMPT_LIMIT}`,
        );

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
            error_code: PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
            next_endpoint: `authorize/otp-passcode`,
          },
        });
      }

      const passcode_verify_endpoint = `${transaction_id}/otp-passcode/passcode/verify`;
      try {
        await updateItemMethod({
          TableName: auth_transactions_table,
          Key: { transaction_id },
          UpdateExpression:
            "set passcode_attempt_count = :passcodeAttemptCount, next_endpoint = :nextEndpoint",
          ExpressionAttributeValues: {
            ":passcodeAttemptCount": new_passcode_attempt_count,
            ":nextEndpoint": passcode_verify_endpoint,
          },
        });
      } catch (error: any) {
        throw new Error(`Error updating transaction: ${error?.message || error}`);
      }
      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: PASSCODE_INVALID_REATTEMPT, next_endpoint: passcode_verify_endpoint },
      });
    }
    logger.info("Supplied passcode matches stored passcode");

    const token_endpoint = "token";
    const authCode = generateAuthCode();
    logger.addContext({ authCode });

    try {
      await updateItemMethod({
        TableName: auth_transactions_table,
        Key: { transaction_id },
        UpdateExpression: `set ${[
          "auth_code = :authCode",
          "passcode_attempt_count = :passcodeAttemptCount",
          "passcode_verified = :passcodeVerified",
          "next_endpoint = :nextEndpoint",
        ].join(", ")}`,
        ExpressionAttributeValues: {
          ":authCode": authCode,
          ":passcodeAttemptCount": new_passcode_attempt_count,
          ":passcodeVerified": true,
          ":nextEndpoint": token_endpoint,
        },
      });
    } catch (error: any) {
      throw new Error(
        `Error updating transaction with auth code and passcode_verified=true: ${error?.message || error}`,
      );
    }
    logger.info("Updated transaction record with auth code and passcode_verified=true");

    const ttl = getCurrentTimestampInSeconds() + SIXTY_SECONDS;
    try {
      await putItemMethod({
        TableName: auth_codes_table,
        Item: {
          auth_code: authCode,
          onmouuid,
          transaction_id,
          scope,
          code_challenge,
          ttl,
          create_refresh_token: transactionRecord.create_refresh_token,
        },
      });
    } catch (error: any) {
      throw new Error(`Error creating auth code record: ${error?.message || error}`);
    }
    logger.info(
      `Auth code record created in ${auth_codes_table} with ttl ${ttl}, returning 200 and the auth code ${authCode}`,
    );

    return formatJSONResponse({
      statusCode: 200,
      body: { auth_code: authCode, next_endpoint: "token" },
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
