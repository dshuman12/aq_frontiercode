import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import {
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  AUTH_TRANSACTIONS_TABLE,
  FRONTEND_URL,
} from "@libs/config";
import { hasRecordExpired } from "@libs/utils";
import { z } from "zod";

const eventSchema = z.object({
  pathParameters: z.object({ transaction_id: z.string() }),
  queryStringParameters: z.object({ verify_code: z.string() }),
  requestContext: z.object({
    identity: z.object({ userAgent: z.string() }),
  }),
});

const emailChangeRedirect = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(302, undefined, { Location: `${FRONTEND_URL}/500` });
  }
  const { transaction_id } = parsedEvent.data.pathParameters;
  logger.addContext("transaction_id", transaction_id);

  try {
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
    const { onmouuid, auth_flow, extra_scope_flow } = transactionRecord;

    if (transactionRecord.ttl && hasRecordExpired(transactionRecord.ttl)) {
      logger.warn("Transaction has expired");
      return apiResponse(400, { message: "Something went wrong" });
    }

    if (!onmouuid) {
      throw new Error("Transaction does not have onmouuid");
    }
    logger.addContext("onmouuid", onmouuid);

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
        return apiResponse(429, { expiry_time });
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
    if (auth_flow !== EXTRA_SCOPE_AUTH_FLOW && auth_flow !== "email_change") {
      throw new Error(
        `Transaction auth_flow: ${auth_flow}, expected ${EXTRA_SCOPE_AUTH_FLOW} or email_change`,
      );
    }

    if (auth_flow === EXTRA_SCOPE_AUTH_FLOW) {
      if (!extra_scope_flow) {
        throw new Error("Transaction does not have extra_scope_flow");
      }
      if (extra_scope_flow !== EMAIL_CHANGE_FLOW) {
        throw new Error(
          `Transaction extra_scope_flow: ${extra_scope_flow}, expected ${EMAIL_CHANGE_FLOW}`,
        );
      }
    }
    logger.addContext("auth_flow", auth_flow);
    logger.addContext("extra_scope_flow", extra_scope_flow);

    if (!transactionRecord.new_email) {
      throw new Error("Transaction does not have new_email");
    }

    if (transactionRecord.email_validation_status === "VALIDATED") {
      throw new Error("Email has already been validated");
    }

    if (!transactionRecord.next_endpoint) {
      throw new Error("Transaction does not have next_endpoint");
    }

    const { next_endpoint } = transactionRecord;
    if (next_endpoint !== `${transaction_id}/email-change/redirect`) {
      logger.warn(
        `Expected transaction next_endpoint of ${transaction_id}/email-change/redirect, but received: ${next_endpoint}`,
      );
      return apiResponse(400, { message: "Something went wrong" });
    }

    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }

    const { verify_code: suppliedVerifyCode } = parsedEvent.data.queryStringParameters;
    logger.addContext("suppliedVerifyCode", suppliedVerifyCode);

    const success_redirect_url = `onmoapp://UpdateEmailAddressOTP?verify_code=${suppliedVerifyCode}`;

    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: "set next_endpoint = :nextEndpoint",
      ExpressionAttributeValues: {
        ":nextEndpoint": `${transaction_id}/email-change/validate`,
      },
    });

    return apiResponse(302, undefined, { Location: success_redirect_url });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return apiResponse(302, undefined, { Location: `${FRONTEND_URL}/500` });
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(emailChangeRedirect);
