import {
  AUTH_TRANSACTIONS_TABLE,
  EXCLUSIVE_SCOPES_PARAM,
  FIFTEEN_MINUTES,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  NON_CONFLICT_SCOPES_PARAM,
  PASSCODE_CHANGE_SCOPE,
  USER_TABLE,
} from "@libs/config";
import { getForceHalHeader } from "@libs/gatewayUtils";
import { noExclusiveScope, noScopeConflict } from "@libs/scopes";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { putItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { getParameter } from "@onmoapp/onmo-ssm";
import { v4 as uuidv4 } from "uuid";
import { BankingService } from "@services/banking/bankingService";
import { UserRecordsService } from "@services/user/user";
import { TransactionsService } from "@services/transaction/transaction";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

const bodySchema = z.object({
  onmouuid: z.string(),
  device_id: z.string(),
  code_challenge: z.string(),
});

const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string(), scope: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const newScopes = [PASSCODE_CHANGE_SCOPE];

const forgotPassAuthorizeIn = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }
  const forceHal = getForceHalHeader(event.headers);
  const { onmouuid: authOnmouuid, scope: authScope } = parsedEvent.data.requestContext.authorizer;
  const { onmouuid: requestOnmouuid, device_id, code_challenge } = parsedEvent.data.body;
  logger.addContext("requestOnmouuid", requestOnmouuid);

  try {
    const rateLimiter = new RateLimiter();
    const { rate_limited, limited_actions, super_rate_limited, super_limited_actions } =
      await rateLimiter.checkLimits({
        onmouuid: authOnmouuid,
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
      onmouuid: authOnmouuid,
      domain: "auth_forgotten_passcode",
      action: "authorize",
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.RATE_LIMIT_SERVICE_ERROR);
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  if (requestOnmouuid !== authOnmouuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
  }
  const newAndPrevScopes = [...newScopes, ...authScope.split(",")];

  const [{ Parameter: nonConflictParameter }, { Parameter: exclusiveParameter }] =
    await Promise.all([
      getParameter({ Name: NON_CONFLICT_SCOPES_PARAM }),
      getParameter({ Name: EXCLUSIVE_SCOPES_PARAM }),
    ]);
  if (!nonConflictParameter?.Value || !exclusiveParameter?.Value) {
    logger.addContext("error_code", ERROR_CODES.CONFIG_SERVICE_ERROR);
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const nonConflictGroups = JSON.parse(nonConflictParameter.Value) as string[][];
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

  // check for conflict with change-passcode scope & existing scopes
  const noScopeConflicts = noScopeConflict({
    newScopes: newAndPrevScopes,
    nonConflictGroups,
  });
  if (!noScopeConflicts) {
    throw new Error(`Conflict in ${PASSCODE_CHANGE_SCOPE} scope`);
  }

  const bankingService = await BankingService.init(requestOnmouuid, forceHal);
  const customer = await bankingService.customerSummary();

  const userService = await UserRecordsService.init();
  const userRecord = await userService.byId(requestOnmouuid);
  if (!userRecord.ok) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    logger.error(
      `Failed to fetch user record from user service: ${serializeError(userRecord.error)}`,
    );
    throw new Error(`Failed to fetch user record from user service`);
  }

  if (!customer.ok) {
    logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
    logger.error(
      `Failed to fetch customer summary from banking service: ${serializeError(customer.error)}`,
    );
    throw new Error(`Failed to fetch customer summary from banking service`);
  }

  if (customer.data.id !== requestOnmouuid) {
    throw new Error(
      `Customer id in ${USER_TABLE} table does not match the one registered to client account`,
    );
  }
  if (customer.data.mobile !== userRecord.data.mobile) {
    throw new Error(
      `Phone number in userRecord does not match the one registered to credit card account`,
    );
  }
  const email_address = customer.data.email;
  if (!email_address) {
    throw new Error("Missing email address on customer details");
  }
  const first_name = customer.data.firstName;
  if (!first_name) {
    throw new Error("Missing first name on customer details");
  }

  const phone_number = userRecord.data.mobile;

  // if any, delete all current transactions for this onmouuid with same scopes
  const transactionService = TransactionsService.init();

  try {
    const transactionList = await transactionService.transactionListByOnmoId(requestOnmouuid);
    if (!transactionList.ok) {
      logger.error(
        `Failed to fetch transactions from transactions service: ${serializeError(transactionList.error)}`,
      );
      throw new Error(`Failed to fetch transactions from transactions service`);
    }

    const transactions = transactionList.data;

    if (transactions.length) {
      let transactionDeleteCount = 0;

      for (const transaction of transactions) {
        const { transaction_id, scope: transactionScope } = transaction;

        if (!transactionScope) {
          logger.error("Transaction does not have scope");
          continue;
        }

        const isAllowed = noExclusiveScope({
          newScopes,
          existingScopes: transactionScope.split(","),
          exclusiveScopes,
        });

        if (!isAllowed) {
          const delTrans = await transactionService.delete(transaction_id);
          if (!delTrans.ok) {
            logger.error(
              `Failed to delete transaction from transactions service: ${serializeError(delTrans.error)}`,
            );
            throw new Error(`Failed to delete transaction from transactions service`);
          }
          transactionDeleteCount += 1;
        }
      }
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(
      `Error processing transaction deletion for onmouuid: ${error?.message || error}`,
    );
  }

  // if any, delete all current transactions for this device_id
  const delTransactions = await transactionService.deleteByDeviceId(device_id);
  if (!delTransactions.ok) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    logger.error(
      `Failed to delete transactions from transactions service: ${serializeError(delTransactions.error)}`,
    );
    throw new Error(`Failed to delete transactions from transactions service`);
  }

  const transaction_id = uuidv4();
  const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
  const next_endpoint = `${transaction_id}/forgotten-passcode/otp/send`;

  await putItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Item: {
      transaction_id,
      device_id,
      onmouuid: requestOnmouuid,
      phone_number,
      email_address,
      first_name,
      create_refresh_token: false,
      scope: newAndPrevScopes.join(","),
      code_challenge,
      next_endpoint,
      auth_flow: FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
      otp_sms_send_count: 0,
      otp_sms_attempt_count: 0,
      otp_sms_verified: false,
      otp_email_send_count: 0,
      otp_email_attempt_count: 0,
      otp_email_verified: false,
      ttl,
    },
  });
  logger.addContext("transaction_id", transaction_id);
  logger.addContext("auth_flow", FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW);
  return apiResponse(200, { transaction_id, next_endpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(forgotPassAuthorizeIn);
