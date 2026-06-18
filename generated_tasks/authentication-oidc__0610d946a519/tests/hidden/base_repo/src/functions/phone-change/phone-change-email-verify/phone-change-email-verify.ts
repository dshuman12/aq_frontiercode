import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { PHONE_NUMBER_CHANGE_FLOW, EXTRA_SCOPE_AUTH_FLOW } from "@libs/constants";

type HandlerEvent = {
  pathParameters: { transaction_id: string };
  body: string;
};

type ParsedBody = {
  verify_code?: number | string;
};

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

    const { verify_code } = JSON.parse(event.body) as ParsedBody;
    if (!verify_code) {
      throw new Error("Missing verify_code in request body");
    }
    logger.addContext({ verify_code });

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
    const { onmouuid, auth_flow, extra_scope_flow, new_phone_number, next_endpoint } =
      transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
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
        domain: "auth_extra_scope",
        action: "authorize",
      });
    } catch (error: any) {
      throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
    }

    if (!auth_flow) {
      throw new Error("Transaction does not have auth_flow");
    }
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW) {
      throw new Error(`Transaction auth_flow: ${auth_flow}, expected ${EXTRA_SCOPE_AUTH_FLOW}`);
    }
    logger.addContext({ auth_flow });

    if (!extra_scope_flow || extra_scope_flow !== PHONE_NUMBER_CHANGE_FLOW) {
      throw new Error(
        `Transaction extra_scope_flow: ${extra_scope_flow}, expected ${PHONE_NUMBER_CHANGE_FLOW}`,
      );
    }

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }

    if (!next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }

    logger.info(`Transaction next_endpoint: ${next_endpoint}`);

    if (next_endpoint !== `${transaction_id}/phone-change/email/verify`) {
      logger.warn(
        `Transaction is not valid for this endpoint. Expected next endpoint: ${transaction_id}/phone-change/email/verify, but received: ${next_endpoint}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }
    const { verify_code: storedVerifyCode } = transactionRecord;
    logger.addContext({ storedVerifyCode });

    if (!transactionRecord.email_validation_expiry_time) {
      throw new Error("Transaction does not have email_validation_expiry_time");
    }

    const { email_validation_expiry_time } = transactionRecord;
    const currentTime = getCurrentTimestampInSeconds();

    if (currentTime > email_validation_expiry_time) {
      throw new Error("Verification code has expired");
    }

    if (!new_phone_number) {
      throw new Error("Transaction does not have new_phone_number");
    }
    logger.addContext({ new_phone_number });

    if (transactionRecord.email_validation_status === "VALIDATED") {
      throw new Error("Email has already been validated");
    }

    if (verify_code.toString() !== storedVerifyCode.toString()) {
      logger.warn("Incorrect verification code provided");
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Incorrect verification code" },
      });
    }

    // Email verified - update transaction record and set up next step for passcode verification
    const next_endpoint_passcode = `${transaction_id}/extra-scope/passcode/verify`;

    await updateItemMethod({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "email_validation_status = :validationStatus",
        "verification_steps_completed = list_append(if_not_exists(verification_steps_completed, :emptyList), :emailStep)",
        "next_endpoint = :nextEndpoint",
        "email_validation_verified_time = :verifiedTime",
      ].join(", ")} remove verify_code`,
      ExpressionAttributeValues: {
        ":validationStatus": "VALIDATED",
        ":emptyList": [],
        ":emailStep": ["EMAIL_VALIDATED"],
        ":nextEndpoint": next_endpoint_passcode,
        ":verifiedTime": currentTime,
      },
    });
    logger.info("Email successfully validated. Moving to passcode verification step.");

    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "Email verification successful",
        next_endpoint: next_endpoint_passcode,
        new_phone_number,
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
