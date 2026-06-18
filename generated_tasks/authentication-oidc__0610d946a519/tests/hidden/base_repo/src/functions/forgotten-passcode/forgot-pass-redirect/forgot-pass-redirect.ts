import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
} from "@libs/constants";

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
    const { onmouuid, auth_flow } = transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext({ onmouuid });

    try {
      const rateLimiter = new RateLimiter();
      const { rate_limited, limited_actions, super_limited_actions } =
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
        throw new Error(`Rate limited for actions: ${all_limited_actions}`);
      }
      await rateLimiter.recordAction({
        onmouuid,
        domain: "auth_forgotten_passcode",
        action: "otp_email_redirect",
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

    if (!transactionRecord.otp_sms_verified) {
      throw new Error("SMS OTP not verified");
    }
    if (transactionRecord.otp_email_verified) {
      throw new Error("Email OTP has already been verified");
    }
    if ("auth_code" in transactionRecord) {
      throw new Error(`auth_code in transaction`);
    }
    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }
    const { next_endpoint } = transactionRecord;
    if (
      next_endpoint !== `${transaction_id}/forgotten-passcode/email/verify` &&
      next_endpoint !== `${transaction_id}/forgotten-passcode/email/resend`
    ) {
      throw new Error(
        `Expected transaction next_endpoint of ${transaction_id}/forgotten-passcode/email/verify or ${transaction_id}/forgotten-passcode/email/resend, but received: ${next_endpoint}`,
      );
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

    const success_redirect_url = `onmoapp://ResetPasscode?verify_code=${suppliedVerifyCode}`;

    return formatJSONResponse({ statusCode: 302, headers: { Location: success_redirect_url } });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    const error_url = env === "prod" ? `https://onmo.app/500` : `https://staging.onmo.app/500`;
    return formatJSONResponse({ statusCode: 302, headers: { Location: error_url } });
  }
};
