import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { PHONE_NUMBER_CHANGE_FLOW, EXTRA_SCOPE_AUTH_FLOW } from "@libs/constants";
import { hasRecordExpired } from "@libs/utils";

type HandlerEvent = {
  pathParameters: { transaction_id: string };
  requestContext: { identity: { userAgent: string } };
  queryStringParameters: { verify_code: string };
};

const env = process.env.ENVIRONMENT as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  const { transaction_id } = event.pathParameters;

  try {
    logger.info(event);

    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

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
    const { onmouuid, auth_flow, extra_scope_flow } = transactionRecord;

    if (transactionRecord.ttl && hasRecordExpired(transactionRecord.ttl)) {
      logger.warn("Transaction has expired");
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

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
      if (rate_limited) {
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

    if (!transactionRecord.new_phone_number) {
      throw new Error("Transaction does not have new_phone_number");
    }

    if (transactionRecord.email_validation_status === "VALIDATED") {
      throw new Error("Email has already been validated");
    }

    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }

    const { next_endpoint } = transactionRecord;
    if (next_endpoint !== `${transaction_id}/phone-change/email/redirect`) {
      logger.warn(
        `Expected transaction next_endpoint of ${transaction_id}/phone-change/email/redirect, but received: ${next_endpoint}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }

    const { userAgent } = event?.requestContext?.identity;
    const { verify_code: suppliedVerifyCode } = event?.queryStringParameters;
    logger.addContext({ suppliedVerifyCode });

    if (!userAgent) {
      throw new Error("Missing userAgent in request context");
    }
    if (!suppliedVerifyCode) {
      throw new Error("Missing verify_code in query string params");
    }

    const success_redirect_url = `onmoapp://UpdatePhoneNumberPasscode?verify_code=${suppliedVerifyCode}`;

    await updateItemMethod({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: "set next_endpoint = :nextEndpoint",
      ExpressionAttributeValues: {
        ":nextEndpoint": `${transaction_id}/phone-change/email/verify`,
      },
    });
    logger.info(`Updated transaction next_endpoint to ${transaction_id}/phone-change/email/verify`);

    return formatJSONResponse({ statusCode: 302, headers: { Location: success_redirect_url } });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    const error_url = env === "prod" ? `https://onmo.app/500` : `https://staging.onmo.app/500`;
    return formatJSONResponse({ statusCode: 302, headers: { Location: error_url } });
  }
};
