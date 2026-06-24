import { getParameter } from "@onmoapp/onmo-ssm";
import { deleteItemMethod, putItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { noExclusiveScope, noScopeConflict } from "@libs/scopes";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { getForceHalHeader } from "@libs/gatewayUtils";
import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION } from "../../general/eligibility/extra-scope-authorize.constants";
import {
  ADDRESS_CHANGE_SCOPE,
  AUTH_KEYS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  CREDIT_CARD_DETAILS_SCOPE,
  CREDIT_CARD_FREEZE_SCOPE,
  CREDIT_CARD_UNFREEZE_SCOPE,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  EMAIL_CHANGE_FLOW,
  ENV,
  EXCLUSIVE_SCOPES_PARAM,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_BIOMETRICS_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EXTRA_SCOPE_PASSCODE_FLOW,
  FIFTEEN_MINUTES,
  FIVE_MINUTES,
  MOBILE_NUMBER_CHANGE_SCOPE,
  NON_CONFLICT_SCOPES_PARAM,
  PHONE_NUMBER_CHANGE_FLOW,
  TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
  TEST_OTP_STEP_EXTRA_SCOPE,
  USER_TABLE,
} from "@libs/config";
import { generateUnsignedChallenge } from "@libs/crypto";
import { BankingService } from "@services/banking/bankingService";
import { z } from "zod";
import { jsonBody } from "@libs/parsedBody";
import { ERROR_CODES } from "@libs/constants";

const bodySchema = z.object({
  onmouuid: z.string(),
  device_id: z.string(),
  code_challenge: z.string(),
  scope: z.string(),
  biometrics: z.boolean().default(false),
  new_email: z.string().optional(),
  new_phone_number: z.string().optional(),
});

const eventSchema = z.object({
  requestContext: z.object({
    authorizer: z.object({ onmouuid: z.string(), scope: z.string() }),
  }),
  body: jsonBody(bodySchema),
});

const otp_sms_step_scopes = [
  ADDRESS_CHANGE_SCOPE,
  ...(ENV === "prod" ? [] : [TEST_OTP_STEP_EXTRA_SCOPE]),
];

const email_validation_step_scopes = [EMAIL_ADDRESS_CHANGE_SCOPE];

const phone_validation_step_scopes = [MOBILE_NUMBER_CHANGE_SCOPE];

const allow_biometrics_step_scopes = [
  CREDIT_CARD_FREEZE_SCOPE,
  CREDIT_CARD_UNFREEZE_SCOPE,
  CREDIT_CARD_DETAILS_SCOPE,
  ...(ENV === "prod" ? [] : [TEST_BIOMETRICS_STEP_EXTRA_SCOPE]),
];

const extraScopeAuthorize = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  const parsedEvent = eventSchema.safeParse(event);
  if (!parsedEvent.success) {
    logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
    return apiResponse(400, { message: "Bad Request" });
  }

  const forceHal = getForceHalHeader(event.headers);

  const { onmouuid: authOnmouuid, scope: authScope } = parsedEvent.data.requestContext.authorizer;
  logger.addContext("authOnmouuid", authOnmouuid);
  logger.addContext("authScope", authScope);

  const {
    onmouuid: requestOnmouuid,
    device_id,
    scope: requestScope,
    code_challenge,
    biometrics,
    new_email,
    new_phone_number,
  } = parsedEvent.data.body;
  logger.addContext("requestOnmouuid", requestOnmouuid);
  logger.addContext("requestScope", requestScope);
  logger.addContext("biometrics", biometrics);

  if (requestOnmouuid !== authOnmouuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
  }
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
      domain: "auth_extra_scope",
      action: "authorize",
    });
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.RATE_LIMIT_SERVICE_ERROR);
    throw new Error(`Failed to impose rate limit: ${error?.message || error}`);
  }

  const newScopes = requestScope.split(",");
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

  // check for conflict with requested extra scopes & existing scopes
  const noScopeConflicts = noScopeConflict({
    newScopes: newAndPrevScopes,
    nonConflictGroups,
  });
  if (!noScopeConflicts) {
    throw new Error(`Conflict in requested scope: ${requestScope}`);
  }
  const { EXTRA_SCOPE_TO_RESOURCE_MAP } = await getSpecificScopeToResourceMaps();

  const trimmedScopes = newScopes.map((scope) => scope.trim());
  for (const trimmedScope of trimmedScopes) {
    if (!(trimmedScope in EXTRA_SCOPE_TO_RESOURCE_MAP)) {
      throw new Error(`Scope ${trimmedScope} not currently supported`);
    }
  }

  const bankingService = await BankingService.init(authOnmouuid, forceHal);

  for (const trimmedScope of trimmedScopes) {
    if (trimmedScope in EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION) {
      const result = await EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION[trimmedScope](bankingService);

      if (!result.ok) {
        throw new Error(`Eligibility check failed for ${trimmedScope}: ${result.error.message}`);
      }
      if (!result.data) {
        return apiResponse(400, { message: "Something went wrong" });
      }
    }
  }

  const queryUserTableRes = await queryTableMethod({
    TableName: USER_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
  });
  if (!queryUserTableRes?.Items?.length) {
    throw new Error(`No record in ${USER_TABLE} found`);
  }

  const userRecord = queryUserTableRes?.Items[0];

  const { dev } = userRecord as { dev?: string };
  if (!dev) {
    throw new Error("Missing device id on user record");
  }
  if (device_id !== dev) {
    throw new Error("Request device id does not match on user record");
  }

  // if any, delete all other current transactions for this onmouuid with same scopes
  try {
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
      ExpressionAttributeNames: { "#scope": "scope" },
      ProjectionExpression: "transaction_id, #scope",
    });
    if (queryTransactionsTableRes?.Items?.length) {
      for (const transaction of queryTransactionsTableRes.Items) {
        const { transaction_id, scope: transactionScope } = transaction;

        if (!transactionScope) {
          logger.error("Transaction does not have scope");
          continue;
        }

        const isAllowedForRequestScope = noExclusiveScope({
          newScopes,
          existingScopes: transactionScope.split(","),
          exclusiveScopes,
        });
        const isAllowedForAuthScope = noExclusiveScope({
          newScopes: authScope.split(","),
          existingScopes: transactionScope.split(","),
          exclusiveScopes,
        });

        if (!isAllowedForRequestScope) {
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        } else if (!isAllowedForAuthScope) {
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
        }
      }
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(`Error processing transaction deletion: ${error?.message || error}`);
  }

  // if any, delete all current transactions for this device_id
  try {
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "dev-index",
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": device_id },
      ProjectionExpression: "transaction_id",
    });
    if (queryTransactionsTableRes?.Items?.length) {
      for (const transaction of queryTransactionsTableRes.Items) {
        const { transaction_id } = transaction;
        await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
      }
    }
  } catch (error: any) {
    logger.addContext("error_code", ERROR_CODES.DATABASE_ERROR);
    throw new Error(`Error processing transaction deletion: ${error?.message || error}`);
  }

  const transaction_id = uuidv4();

  if (phone_validation_step_scopes.some((scope) => requestScope.split(",").includes(scope))) {
    if (!new_phone_number) {
      logger.warn("Missing new_phone_number for phone number change flow");

      return apiResponse(400, { message: "Something went wrong" });
    }

    // Basic phone number format validation
    const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneNumberRegex.test(new_phone_number)) {
      logger.warn("Invalid phone number format");

      return apiResponse(400, { message: "Something went wrong" });
    }

    // Get first_name for the transaction record
    let first_name_to_use: string | undefined;

    try {
      const customerDetails = await bankingService.customerSummary();
      if (!customerDetails.ok) {
        logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
        logger.error(
          `Error fetching core banking customer details: ${serializeError(customerDetails.error)}`,
        );
        throw new Error("Error fetching core banking customer details");
      }

      first_name_to_use = customerDetails.data.firstName;
      if (!first_name_to_use) {
        logger.warn("Missing first name in Core Banking API response");
        return apiResponse(400, { message: "Something went wrong" });
      }
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
      logger.error(`Failed to get customer details: ${error?.message || error}`);
      return apiResponse(500, { message: "Something went wrong" });
    }

    const next_endpoint = `${transaction_id}/phone-change/initiate`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: requestOnmouuid,
        device_id,
        scope: newAndPrevScopes.join(","),
        code_challenge,
        new_phone_number,
        first_name: first_name_to_use,
        next_endpoint,
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
        create_refresh_token: false,
        phone_validation_status: "pending",
        verification_steps_completed: [],
        otp_sms_send_count: 0,
        otp_sms_attempt_count: 0,
        passcode_attempt_count: 0,
        passcode_verified: false,
        ttl,
      },
    });

    logger.addContext("transaction_id", transaction_id);
    logger.addContext("auth_flow", EXTRA_SCOPE_AUTH_FLOW);
    logger.addContext("extra_scope_flow", PHONE_NUMBER_CHANGE_FLOW);
    return apiResponse(200, { transaction_id, next_endpoint });
  }

  // Handle email change flow
  if (email_validation_step_scopes.some((scope) => requestScope.split(",").includes(scope))) {
    if (!new_email) {
      logger.warn("Missing new_email for email change flow");

      return apiResponse(400, { message: "Something went wrong" });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      logger.warn("Invalid email format");

      return apiResponse(400, { message: "Something went wrong" });
    }

    let first_name_to_use: string | undefined;

    try {
      const customerDetails = await bankingService.customerSummary();
      if (!customerDetails.ok) {
        logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
        logger.error(
          `Error fetching core banking customer details: ${serializeError(customerDetails.error)}`,
        );
        throw new Error("Error fetching core banking customer details");
      }

      first_name_to_use = customerDetails.data.firstName;
      if (!first_name_to_use) {
        logger.warn("Missing first name in Core Banking API response");
        return apiResponse(400, { message: "Something went wrong" });
      }
    } catch (error: any) {
      logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
      logger.error(`Failed to get customer details: ${error?.message || error}`);
      return apiResponse(500, { message: "Something went wrong" });
    }

    const next_endpoint = `${transaction_id}/email-change/initiate`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: requestOnmouuid,
        device_id,
        scope: newAndPrevScopes.join(","),
        code_challenge,
        new_email,
        first_name: first_name_to_use,
        next_endpoint,
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EMAIL_CHANGE_FLOW,
        create_refresh_token: false,
        email_validation_status: "PENDING",
        verification_steps_completed: [],
        email_validation_send_count: 0,
        email_validation_attempt_count: 0,
        otp_sms_send_count: 0,
        otp_sms_attempt_count: 0,
        otp_sms_verified: false,
        passcode_attempt_count: 0,
        passcode_verified: false,
        ttl,
      },
    });

    logger.addContext("transaction_id", transaction_id);
    logger.addContext("auth_flow", EXTRA_SCOPE_AUTH_FLOW);
    logger.addContext("extra_scope_flow", EMAIL_CHANGE_FLOW);
    return apiResponse(200, { transaction_id, next_endpoint });
  }

  // Additional otp sms step for some scopes
  if (otp_sms_step_scopes.some((scope) => requestScope.split(",").includes(scope))) {
    const next_endpoint = `${transaction_id}/extra-scope/otp/send`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: requestOnmouuid,
        device_id,
        scope: newAndPrevScopes.join(","), // token will have both scope sets
        code_challenge,
        next_endpoint,
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EXTRA_SCOPE_OTP_PASSCODE_FLOW,
        create_refresh_token: false,
        otp_sms_send_count: 0,
        otp_sms_attempt_count: 0,
        otp_sms_verified: false,
        passcode_attempt_count: 0,
        passcode_verified: false,
        ttl,
      },
    });
    logger.addContext("transaction_id", transaction_id);
    logger.addContext("auth_flow", EXTRA_SCOPE_AUTH_FLOW);
    logger.addContext("extra_scope_flow", EXTRA_SCOPE_OTP_PASSCODE_FLOW);
    return apiResponse(200, { transaction_id, next_endpoint });
  }

  if (
    biometrics &&
    allow_biometrics_step_scopes.some((scope) => requestScope.split(",").includes(scope))
  ) {
    try {
      const queryAuthKeysTableRes = await queryTableMethod({
        TableName: AUTH_KEYS_TABLE,
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": requestOnmouuid },
      });
      if (!queryAuthKeysTableRes?.Items?.length) {
        throw new Error("No biometrics data found for user");
      }

      const { fe_public_key, device_id: authKeysDeviceId } = queryAuthKeysTableRes.Items[0];

      if (!fe_public_key) {
        throw new Error(`Missing fe_public_key in ${AUTH_KEYS_TABLE} table`);
      }
      if (!authKeysDeviceId) {
        throw new Error(`Missing device_id in ${AUTH_KEYS_TABLE} table`);
      }
      if (device_id !== authKeysDeviceId) {
        throw new Error(
          `Supplied device_id does not match stored device_id in ${AUTH_KEYS_TABLE} table`,
        );
      }

      const next_endpoint = `${transaction_id}/extra-scope/biometrics/verify`;
      const unsigned_challenge = generateUnsignedChallenge();
      const ttl = getCurrentTimestampInSeconds() + FIVE_MINUTES;

      await putItemMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        Item: {
          transaction_id,
          onmouuid: requestOnmouuid,
          device_id,
          unsigned_challenge,
          fe_public_key,
          scope: newAndPrevScopes.join(","), // token will have both scope sets
          code_challenge,
          next_endpoint,
          auth_flow: EXTRA_SCOPE_AUTH_FLOW,
          extra_scope_flow: EXTRA_SCOPE_BIOMETRICS_FLOW,
          create_refresh_token: false,
          biometrics_verified: false,
          ttl,
        },
      });
      logger.addContext("transaction_id", transaction_id);
      logger.addContext("auth_flow", EXTRA_SCOPE_AUTH_FLOW);
      logger.addContext("extra_scope_flow", EXTRA_SCOPE_BIOMETRICS_FLOW);
      return apiResponse(200, { transaction_id, next_endpoint, unsigned_challenge });
    } catch (error: any) {
      logger.warn(`Failed to start biometrics transaction: ${error?.message || error}`);
    }
  }

  // typical extra-scope passcode flow (without additional sms otp step)
  const next_endpoint = `${transaction_id}/extra-scope/passcode/verify`;
  const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

  await putItemMethod({
    TableName: AUTH_TRANSACTIONS_TABLE,
    Item: {
      transaction_id,
      onmouuid: requestOnmouuid,
      device_id,
      scope: newAndPrevScopes.join(","), // token will have both scope sets
      code_challenge,
      next_endpoint,
      auth_flow: EXTRA_SCOPE_AUTH_FLOW,
      extra_scope_flow: EXTRA_SCOPE_PASSCODE_FLOW,
      create_refresh_token: false,
      passcode_attempt_count: 0,
      passcode_verified: false,
      ttl,
    },
  });

  logger.addContext("transaction_id", transaction_id);
  logger.addContext("auth_flow", EXTRA_SCOPE_AUTH_FLOW);
  logger.addContext("extra_scope_flow", EXTRA_SCOPE_PASSCODE_FLOW);
  return apiResponse(200, { transaction_id, next_endpoint });
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(extraScopeAuthorize);
