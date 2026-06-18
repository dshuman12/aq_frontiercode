import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  AUTH_TRANSACTIONS_TABLE,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  FRONTEND_URL,
} from "@libs/config";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  requestContext: z.object({
    identity: z.object({ userAgent: z.string() }),
  }),
  queryStringParameters: z.object({ verify_code: z.string() }),
});

const forgotPassRedirect = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  try {
    const parsedEvent = eventSchema.safeParse(event);
    if (!parsedEvent.success) {
      logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
      return apiResponse(302, undefined, { Location: `${FRONTEND_URL}/500` });
    }
    const { transaction_id } = parsedEvent.data.pathParameters;
    logger.addContext("transaction_id", transaction_id);

    const suppliedVerifyCode = parsedEvent.data.queryStringParameters.verify_code;
    logger.addContext("suppliedVerifyCode", suppliedVerifyCode);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
      return apiResponse(400, { message: "Something went wrong" });
    }
    const transactionRecord = queryTransactionsTableRes.Items[0];
    const { onmouuid, auth_flow } = transactionRecord;
    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext("onmouuid", onmouuid);

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
    logger.addContext("auth_flow", auth_flow);

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

    const success_redirect_url = `onmoapp://ResetPasscode?verify_code=${suppliedVerifyCode}`;

    return apiResponse(302, undefined, { Location: success_redirect_url });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return apiResponse(302, undefined, { Location: `${FRONTEND_URL}/500` });
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(forgotPassRedirect);
