import { Logger } from "@onmoapp/onmo-logger";
import { getParameter } from "@onmoapp/onmo-ssm";
import { putItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { noScopeConflict } from "@libs/scopes";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { v4 as uuidv4 } from "uuid";
import { getCurrentTimestampInSeconds, toLMSResult } from "@libs/utils";
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
} from "@libs/constants";
import { generateUnsignedChallenge } from "@libs/crypto";
import { AuthorizerEvent, checkRateLimit, jsonCodec } from "@libs/shared";
import { toHttpResponse } from "@onmoapp/core-banking";
import { getLogger } from "@libs/logger";
import { TransactionsService } from "@services/transaction/transaction";
import { z } from "zod";
import { BankingService } from "@services/banking/bankingService";
import { EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION } from "@functions/general/eligibility/extra-scope-authorize.constants";
import { BankingServiceInterface } from "@services/banking/interface";

type Context = {
  authorizedUuid: string;
  requestUuid: string;
  deviceId: string;
  biometrics: boolean;
  codeChallenge: string;
  newEmail: string | undefined;
  newPhone: string | undefined;
  authorizedScopes: string[];
  requestedScopes: string[];
  allScopes: string[];
  logger: Logger;
  forcedCodePath: string | undefined;
};

const parsedReqBodySchema = z.object({
  onmouuid: z.string(),
  device_id: z.string(),
  code_challenge: z.string(),
  scope: z.string(),
  biometrics: z.boolean().optional(),
  new_email: z.email().optional(),
  new_phone_number: z.string().optional(),
});

type ParsedReqBody = z.infer<typeof parsedReqBodySchema>;

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

const ensurePayloadIntegrity = (
  payload: ParsedReqBody,
  authorizedUuid: string,
  authScope: string,
) => {
  if (!authorizedUuid) {
    throw new Error("Missing onmouuid from authorizer");
  }
  if (!payload.device_id) {
    throw new Error("Missing device_id in request");
  }
  if (!authScope) {
    throw new Error("Missing scope from authorizer");
  }
  if (!payload.onmouuid) {
    throw new Error("Missing onmouuid in request");
  }
  if (!payload.scope) {
    throw new Error("Missing scope in request");
  }
  if (!payload.code_challenge) {
    throw new Error("Missing code_challenge in request");
  }
  if (payload.onmouuid !== authorizedUuid) {
    throw new Error("[suspicious_activity] Authorizer onmouuid does not match request onmouuid");
  }
};

const ensureNoScopeConflicts = async (ctx: Context) => {
  const [{ Parameter: nonConflictParameter }, { Parameter: exclusiveParameter }] =
    await Promise.all([
      getParameter({ Name: NON_CONFLICT_SCOPES_PARAM }),
      getParameter({ Name: EXCLUSIVE_SCOPES_PARAM }),
    ]);
  if (!nonConflictParameter?.Value || !exclusiveParameter?.Value) {
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const nonConflictGroups = JSON.parse(nonConflictParameter.Value) as string[][];
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

  // check for conflict with requested extra scopes & existing scopes
  const noScopeConflicts = noScopeConflict({
    newScopes: ctx.allScopes,
    nonConflictGroups,
  });
  if (!noScopeConflicts) {
    throw new Error(`Conflict in requested scope: ${ctx.requestedScopes}`);
  }
  const { EXTRA_SCOPE_TO_RESOURCE_MAP } = await getSpecificScopeToResourceMaps();

  for (const scope of ctx.requestedScopes) {
    if (!(scope in EXTRA_SCOPE_TO_RESOURCE_MAP)) {
      throw new Error(`Scope ${scope} not currently supported`);
    }
  }

  return { exclusiveScopes };
};

const eligibilityChecks = async (ctx: Context, bankingService: BankingServiceInterface) => {
  const eligibilityChecks = ctx.requestedScopes.map(async (scope) => {
    if (scope in EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION) {
      ctx.logger.info(`${scope} scope has eligibility criteria, checking...`);
      const isEligibleFunction = EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION[scope];
      return {
        scope,
        eligible: await isEligibleFunction(bankingService),
      };
    }
  });
  const results = (await Promise.all(eligibilityChecks)).filter((it) => it !== undefined);

  if (results.some((it) => !it.eligible.ok)) {
    results
      .filter((it) => !it.eligible.ok)
      .forEach((it) =>
        ctx.logger.warn(
          `${it.scope} scope is not eligible: ${!it.eligible.ok && it.eligible.error.message}`,
        ),
      );
    throw new Error(
      `Eligibility check failed for scopes: ${results.filter((it) => !it.eligible.ok).map((it) => it.scope)}`,
    );
  }

  ctx.logger.info(`All requested scopes are supported. Scopes are: ${ctx.requestedScopes}`);
};

const createAuthTransaction = async (ctx: Context, bankingService: BankingServiceInterface) => {
  const transaction_id = uuidv4();
  if (phone_validation_step_scopes.some((scope) => ctx.requestedScopes.includes(scope))) {
    if (!ctx.newPhone) {
      ctx.logger.warn("Missing new_phone_number for phone number change flow");

      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    // Basic phone number format validation
    const phoneNumberRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneNumberRegex.test(ctx.newPhone)) {
      ctx.logger.warn("Invalid phone number format");

      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }

    ctx.logger.info("Retrieving first name from Core Banking API for phone change flow");

    const customerDetails = await bankingService.customerSummary();
    if (!customerDetails.ok) return toHttpResponse(customerDetails);
    const first_name_to_use = customerDetails.data.firstName;

    const next_endpoint = `${transaction_id}/phone-change/initiate`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: ctx.requestUuid,
        device_id: ctx.deviceId,
        scope: ctx.allScopes.join(","),
        code_challenge: ctx.codeChallenge,
        new_phone_number: ctx.newPhone,
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

    return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
  } else if (email_validation_step_scopes.some((scope) => ctx.requestedScopes.includes(scope))) {
    // Basic email format validation
    const emailParse = toLMSResult(z.email().safeParse(ctx.newEmail), "extra-scope: parse email");
    if (!emailParse.ok) return toHttpResponse(emailParse);

    const customerDetails = await bankingService.customerSummary();
    if (!customerDetails.ok) return toHttpResponse(customerDetails);
    const first_name_to_use = customerDetails.data.firstName;

    ctx.logger.info(`Starting email change flow for email: ${ctx.newEmail}`);

    const next_endpoint = `${transaction_id}/email-change/initiate`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: ctx.requestUuid,
        device_id: ctx.deviceId,
        scope: ctx.allScopes.join(","),
        code_challenge: ctx.codeChallenge,
        new_email: ctx.newEmail,
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

    return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
  } else if (otp_sms_step_scopes.some((scope) => ctx.requestedScopes.includes(scope))) {
    const next_endpoint = `${transaction_id}/extra-scope/otp/send`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: ctx.requestUuid,
        device_id: ctx.deviceId,
        scope: ctx.allScopes.join(","),
        code_challenge: ctx.codeChallenge,
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
    return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
  } else if (
    ctx.biometrics &&
    allow_biometrics_step_scopes.some((scope) => ctx.requestedScopes.includes(scope))
  ) {
    try {
      const queryAuthKeysTableRes = await queryTableMethod({
        TableName: AUTH_KEYS_TABLE,
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": ctx.requestUuid },
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
      if (ctx.deviceId !== authKeysDeviceId) {
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
          onmouuid: ctx.requestUuid,
          device_id: ctx.deviceId,
          unsigned_challenge,
          fe_public_key,
          scope: ctx.allScopes.join(","),
          code_challenge: ctx.codeChallenge,
          next_endpoint,
          auth_flow: EXTRA_SCOPE_AUTH_FLOW,
          extra_scope_flow: EXTRA_SCOPE_BIOMETRICS_FLOW,
          create_refresh_token: false,
          biometrics_verified: false,
          ttl,
        },
      });
      return formatJSONResponse({
        statusCode: 200,
        body: { transaction_id, next_endpoint, unsigned_challenge },
      });
    } catch (error: any) {
      ctx.logger.warn(`Failed to start biometrics transaction: ${error?.message || error}`);
      return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
    }
  } else {
    // typical extra-scope passcode flow (without additional sms otp step)
    const next_endpoint = `${transaction_id}/extra-scope/passcode/verify`;
    const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;

    await putItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Item: {
        transaction_id,
        onmouuid: ctx.requestUuid,
        device_id: ctx.deviceId,
        scope: ctx.allScopes.join(","),
        code_challenge: ctx.codeChallenge,
        next_endpoint,
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EXTRA_SCOPE_PASSCODE_FLOW,
        create_refresh_token: false,
        passcode_attempt_count: 0,
        passcode_verified: false,
        ttl,
      },
    });

    return formatJSONResponse({ statusCode: 200, body: { transaction_id, next_endpoint } });
  }
};

export const handler = async (event: AuthorizerEvent) => {
  const logger = getLogger();
  const forcedCodePath = event.headers?.["x-force-hal"];
  try {
    const { onmouuid: authorizedUuid, scope: authScope } = event.requestContext.authorizer;
    logger.addContext({ authOnmouuid: authorizedUuid, authScope });
    const payload = jsonCodec(parsedReqBodySchema).safeDecode(event.body);
    if (!payload.success) {
      return toHttpResponse(toLMSResult(payload, "jsonCodec event schema"));
    }

    if (!authScope) throw new Error("missing auth scope");

    ensurePayloadIntegrity(payload.data, authorizedUuid, authScope);

    const {
      onmouuid: requestOnmouuid,
      device_id,
      scope: requestScope,
      code_challenge,
      biometrics,
      new_email,
      new_phone_number,
    } = payload.data;
    logger.addContext({ requestOnmouuid, requestScope, biometrics: !!biometrics });

    const authorizedScopes = authScope.split(",").map((scope) => scope.trim());
    const requestedScopes = requestScope.split(",").map((scope) => scope.trim());

    const ctx: Context = {
      authorizedUuid: authorizedUuid,
      requestUuid: requestOnmouuid,
      deviceId: device_id,
      biometrics: !!biometrics,
      codeChallenge: code_challenge,
      newEmail: new_email,
      newPhone: new_phone_number,
      authorizedScopes,
      requestedScopes,
      allScopes: [...authorizedScopes, ...requestedScopes],
      logger,
      forcedCodePath,
    };

    logger.info(`requestScope: ${requestScope}`);

    const rateLimitResponse = await checkRateLimit(
      {
        onmouuid: requestOnmouuid,
        domain: "auth_extra_scope",
        action: "authorize",
      },
      logger,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const transactionsService = new TransactionsService(logger);

    const { exclusiveScopes } = await ensureNoScopeConflicts(ctx);

    const deleteTransByIdRes = await transactionsService.deleteByOnmoId(requestOnmouuid, [
      {
        exclusiveScopes,
        newScopes: requestedScopes,
      },
    ]);

    if (!deleteTransByIdRes.ok) return toHttpResponse(deleteTransByIdRes);

    const deleteTransByDevRes = await transactionsService.deleteByDeviceId(device_id);
    if (!deleteTransByDevRes.ok) return toHttpResponse(deleteTransByDevRes);

    const bankingService = await BankingService.init(
      ctx.requestUuid,
      ctx.logger,
      ctx.forcedCodePath,
    );
    await eligibilityChecks(ctx, bankingService);
    return await createAuthTransaction(ctx, bankingService);
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
