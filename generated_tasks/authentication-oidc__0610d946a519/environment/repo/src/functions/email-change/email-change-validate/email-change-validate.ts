import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds, hasRecordExpired } from "@libs/utils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { EMAIL_CHANGE_FLOW, EXTRA_SCOPE_AUTH_FLOW } from "@libs/constants";
import { AuthorizerEvent, checkRateLimit } from "@libs/shared";

type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id: string };
};

type ParsedBody = {
  verify_code?: number;
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

    const authOnmouuid = event?.requestContext?.authorizer?.onmouuid;
    const authScope = event?.requestContext?.authorizer?.scope;

    if (!authOnmouuid) {
      logger.warn("Missing onmouuid from authorizer");
      return formatJSONResponse({ statusCode: 401, body: { message: "Unauthorized" } });
    }
    logger.addContext({ authOnmouuid });

    if (!authScope) {
      logger.warn("Missing scope from authorizer");
      return formatJSONResponse({ statusCode: 401, body: { message: "Unauthorized" } });
    }

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
    const { onmouuid, auth_flow, extra_scope_flow, new_email } = transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ onmouuid });

    if (onmouuid !== authOnmouuid) {
      logger.warn(
        `[suspicious_activity] Onmouuid mismatch - transaction: ${onmouuid}, auth: ${authOnmouuid}`,
      );
      return formatJSONResponse({ statusCode: 401, body: { message: "Unauthorized" } });
    }

    const rateLimiter = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_extra_scope",
        action: "authorize",
      },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    if (!auth_flow) {
      throw new Error("Transaction does not have auth_flow");
    }
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW && auth_flow !== "email_change") {
      throw new Error(
        `Transaction auth_flow: ${auth_flow}, expected ${EXTRA_SCOPE_AUTH_FLOW} or email_change`,
      );
    }
    logger.addContext({ auth_flow });

    if (auth_flow === EXTRA_SCOPE_AUTH_FLOW) {
      if (!extra_scope_flow || extra_scope_flow !== EMAIL_CHANGE_FLOW) {
        throw new Error(
          `Transaction extra_scope_flow: ${extra_scope_flow}, expected ${EMAIL_CHANGE_FLOW}`,
        );
      }
    }

    if (hasRecordExpired(transactionRecord.ttl)) {
      throw new Error(`Transaction has expired. TTL: ${transactionRecord.ttl}`);
    }

    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }

    logger.info(`Transaction next_endpoint: ${transactionRecord.next_endpoint}`);

    if (transactionRecord.next_endpoint !== `${transaction_id}/email-change/validate`) {
      logger.warn(
        `Expected transaction next_endpoint of ${transaction_id}/email-change/validate, but received: ${transactionRecord.next_endpoint}`,
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
      logger.warn("Verification code has expired");
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Verification code has expired" },
      });
    }

    if (!new_email) {
      throw new Error("Transaction does not have new_email");
    }
    logger.addContext({ new_email });

    if (transactionRecord.email_validation_status === "VALIDATED") {
      throw new Error("Email has already been validated");
    }

    if (verify_code !== storedVerifyCode) {
      logger.warn("Incorrect verification code provided");
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Incorrect verification code" },
      });
    }

    const next_endpoint = `${transaction_id}/extra-scope/otp/send`;

    await updateItemMethod({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "email_validation_status = :validationStatus",
        "verification_steps_completed = list_append(if_not_exists(verification_steps_completed, :emptyList), :emailStep)",
        "next_endpoint = :nextEndpoint",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":validationStatus": "VALIDATED",
        ":emptyList": [],
        ":emailStep": ["EMAIL_VALIDATED"],
        ":nextEndpoint": next_endpoint,
      },
    });
    logger.info("Email successfully validated. Moving to OTP verification step.");

    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "Email verification successful",
        next_endpoint,
        new_email,
      },
    });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
