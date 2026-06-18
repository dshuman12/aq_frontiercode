import { ExtraScopeEvent } from "./shared";
import {
  EMAIL_CHANGE_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_BIOMETRICS_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EXTRA_SCOPE_PASSCODE_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT,
  PASSCODE_ATTEMPT_LIMIT,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/constants";
import { hasRecordExpired, toLMSResult } from "@libs/utils";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { Logger } from "@onmoapp/onmo-logger";
import { z, ZodRawShape } from "zod";

//TODO: potentially integrate this in to transaction service

export const ensureBaseTransactionIntegrity = <T extends ZodRawShape>(
  transactionRecord: Record<string, any>,
  nextEndpoint: string,
  authorizedUuid: string,
  logger: Logger,
  extendedSchema: T,
) => {
  const { auth_flow, ttl } = transactionRecord;

  const verifiedTransaction = z
    .object({
      auth_code: z
        .string()
        .optional()
        .refine((it) => it === undefined, "Transaction does not have onmouuid"),
      auth_flow: z
        .string("[suspicious_activity] Transaction does not have auth_flow")
        .refine((it) => it === EXTRA_SCOPE_AUTH_FLOW, {
          error: `[suspicious_activity] Transaction auth_flow: ${auth_flow}, expected: ${EXTRA_SCOPE_AUTH_FLOW}`,
        }),
      code_challenge: z.string("Transaction does not have code_challenge"),
      create_refresh_token: z
        .boolean()
        .optional()
        .refine((it) => it === false || it === undefined, {
          error: "Transaction has create_refresh_token=true",
        }),
      device_id: z.string("Transaction does not have device_id"),
      extra_scope_flow: z.string(
        "[suspicious_activity] Transaction does not have extra_scope_flow",
      ),
      nextEndpoint: z.string().refine((it) => it === nextEndpoint),
      onmouuid: z
        .string("Transaction does not have onmouuid")
        .refine((it) => it === authorizedUuid, {
          error: "[suspicious_activity] Authorizer onmouuid does not match transaction onmouuid",
        }),
      scope: z.string("Transaction does not have scope"),
      ttl: z
        .number("[suspicious_activity] Transaction does not have ttl")
        .refine((it) => !hasRecordExpired(it), { error: `Transaction has expired. TTL: ${ttl}` }),
      ...(extendedSchema ?? {}),
    })
    .safeParse(transactionRecord);

  z.object().extend(verifiedTransaction);
  if (!verifiedTransaction.success) logger.error(verifiedTransaction.error);

  return toLMSResult(verifiedTransaction);
};

export const ensureRequestIntegrity = (event: ExtraScopeEvent, logger: Logger) => {
  const params = {
    transactionId: event.pathParameters.transaction_id,
    authorizedUuid: event.requestContext.authorizer.onmouuid,
  };

  const parsed = z
    .object({
      transactionId: z.string(),
      authorizedUuid: z.string(),
    })
    .safeParse(params);

  if (parsed.success) logger.addContext(params);

  return toLMSResult(parsed);
};

export const ensureSendOTPTransactionIntegrity = (
  transactionRecord: Record<string, any>,
  logger: Logger,
) => {
  const { extra_scope_flow, otp_sms_send_count, otp_sms_attempt_count } = transactionRecord;

  try {
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW
    ) {
      logger.warn(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or ${EMAIL_CHANGE_FLOW}`,
      );
      return formatJSONResponse({ statusCode: 400, body: { message: "Something went wrong" } });
    }
    logger.addContext({ extra_scope_flow });

    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction missing otp_sms_send_count");
    }
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction missing otp_sms_send_count");
    }
    if ("otp_sms_expiry_time" in transactionRecord) {
      throw new Error(`otp_sms_expiry_time in transaction`);
    }
    if (transactionRecord.phone_number) {
      throw new Error("Transaction already has phone_number");
    }
    if (otp_sms_send_count !== 0) {
      throw new Error(`Transaction otp_sms_send_count should be 0 but is ${otp_sms_send_count}`);
    }
    if (otp_sms_attempt_count !== 0) {
      throw new Error(`Transaction otp_sms_attempt_count should be 0 but is ${otp_sms_send_count}`);
    }
  } catch (error: any) {
    logger.warn(error.message);
    return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
  }
};

export const ensureResendOTPTransactionIntegrity = (
  transactionRecord: Record<string, any>,
  transaction_id: string,
  logger: Logger,
) => {
  const { extra_scope_flow, phone_number } = transactionRecord;
  try {
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW
    ) {
      throw new Error(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or ${EMAIL_CHANGE_FLOW}`,
      );
    }
    logger.addContext({ extra_scope_flow });

    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_send_count");
    }
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_attempt_count");
    }
    if (!("otp_sms_expiry_time" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_expiry_time");
    }
    if (!transactionRecord.phone_number) {
      throw new Error("Transaction does not have phone_number");
    }
    logger.addContext({ phone_number });
    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }
    if (!("otp_sms_verified" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_verified");
    }
    if (transactionRecord.otp_sms_verified) {
      throw new Error("OTP has already been verified");
    }

    const { next_endpoint } = transactionRecord;
    if (next_endpoint === `${transaction_id}/extra-scope/otp/verify`) {
      logger.info(`** Resend OTP reason: failed verify OTP attempt **`);
    } //
    else if (next_endpoint === `${transaction_id}/extra-scope/otp/resend`) {
      logger.info(`** Resend OTP reason: OTP expired or manually requested to resend **`);
    } //
    else {
      throw new Error(
        `Expected transaction next_endpoint of ${transaction_id}/extra-scope/otp/verify or ${transaction_id}/extra-scope/otp/resend, but received: ${next_endpoint}`,
      );
    }

    if (transactionRecord.otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(`Transaction already reached OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
    }
    if (transactionRecord.otp_sms_send_count < 1) {
      throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
    }
  } catch (error: any) {
    logger.warn(error.message);
    return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
  }
};

export const ensureVerifyBiometricsTransactionIntegrity = (
  transactionRecord: Record<string, any>,
  device_id: string,
  logger: Logger,
) => {
  const { extra_scope_flow } = transactionRecord;

  if (extra_scope_flow !== EXTRA_SCOPE_BIOMETRICS_FLOW) {
    throw new Error(
      `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_BIOMETRICS_FLOW}`,
    );
  }
  logger.info(`*** EXTRA SCOPE FLOW: ${extra_scope_flow} ***`);
  logger.addContext({ extra_scope_flow });

  if (!transactionRecord.unsigned_challenge) {
    throw new Error("Transaction missing unsigned_challenge");
  }
  if (!transactionRecord.fe_public_key) {
    throw new Error("Transaction missing fe_public_key");
  }

  if (transactionRecord.biometrics_verified) {
    throw new Error("Biometrics has already been verified");
  }

  if (device_id !== transactionRecord.device_id) {
    throw new Error("Supplied device_id does not match transaction device_id");
  }
};

export const ensureVerifyOTPTransactionIntegrity = (
  transactionRecord: Record<string, any>,
  logger: Logger,
) => {
  const {
    extra_scope_flow,
    verify_code: storedVerifyCode,
    otp_sms_attempt_count,
    otp_sms_send_count,
  } = transactionRecord;

  try {
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW
    ) {
      throw new Error(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or ${EMAIL_CHANGE_FLOW}`,
      );
    }
    logger.addContext({ extra_scope_flow });

    logger.addContext({ storedVerifyCode });

    if (!("otp_sms_send_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_send_count");
    }
    logger.addContext({ otp_sms_send_count });
    if (!("otp_sms_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_attempt_count");
    }
    logger.addContext({ otp_sms_attempt_count });
    if (!("otp_sms_expiry_time" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_expiry_time");
    }
    if (!("otp_sms_verified" in transactionRecord)) {
      throw new Error("Transaction does not have otp_sms_verified");
    }
    if (!transactionRecord.phone_number) {
      throw new Error("Transaction does not have phone_number");
    }
    if (!transactionRecord.verify_code) {
      throw new Error("Transaction does not have verify_code");
    }
    if (!("passcode_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_attempt_count");
    }
    if (!("passcode_verified" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_attempt_count");
    }
    if (transactionRecord.passcode_attempt_count > 0) {
      throw new Error(`Transaction should have passcode_attempt_count of 0`);
    }
    if (transactionRecord.passcode_verified) {
      throw new Error("Passcode has already been verified");
    }
    if (transactionRecord.otp_sms_verified) {
      throw new Error("OTP has already been verified");
    }
    if (otp_sms_send_count < 1) {
      throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
    }
    if (otp_sms_send_count > OTP_SEND_LIMIT) {
      throw new Error(`Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`);
    }
    if (otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
      throw new Error(
        `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
      );
    }
  } catch (error: any) {
    logger.warn(error.message);
    return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
  }
};

export const ensureVerifyPasscodeTransactionIntegrity = (
  transactionRecord: Record<string, any>,
  logger: Logger,
) => {
  const { extra_scope_flow, passcode_attempt_count } = transactionRecord;
  try {
    if (
      extra_scope_flow !== EXTRA_SCOPE_OTP_PASSCODE_FLOW &&
      extra_scope_flow !== EXTRA_SCOPE_PASSCODE_FLOW &&
      extra_scope_flow !== EMAIL_CHANGE_FLOW &&
      extra_scope_flow !== PHONE_NUMBER_CHANGE_FLOW
    ) {
      throw new Error(
        `[suspicious_activity] Transaction extra_scope_flow: ${extra_scope_flow}, expected: ${EXTRA_SCOPE_OTP_PASSCODE_FLOW} or: ${EXTRA_SCOPE_PASSCODE_FLOW} or: ${EMAIL_CHANGE_FLOW} or: ${PHONE_NUMBER_CHANGE_FLOW}`,
      );
    }
    logger.info(`*** EXTRA SCOPE FLOW: ${extra_scope_flow} ***`);
    logger.addContext({ extra_scope_flow });

    if (!("passcode_verified" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_verified");
    }
    if (!("passcode_attempt_count" in transactionRecord)) {
      throw new Error("Transaction does not have passcode_attempt_count");
    }

    logger.addContext({ passcode_attempt_count });
    if (transactionRecord.passcode_verified) {
      throw new Error("Passcode has already been verified");
    }
    if (passcode_attempt_count >= PASSCODE_ATTEMPT_LIMIT) {
      throw new Error(
        `Transaction has already reached total passcode attempt limit of ${PASSCODE_ATTEMPT_LIMIT}`,
      );
    }

    if (extra_scope_flow === EXTRA_SCOPE_OTP_PASSCODE_FLOW) {
      if (!transactionRecord.phone_number) {
        throw new Error("Transaction does not have phone_number");
      }
      if (!transactionRecord.verify_code) {
        throw new Error("Transaction does not have verify_code");
      }
      if (!("otp_sms_verified" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_verified");
      }
      if (!("otp_sms_expiry_time" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_expiry_time");
      }
      if (!("otp_sms_send_count" in transactionRecord)) {
        throw new Error("Transaction does not have otp_sms_send_count");
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

    if (extra_scope_flow === EXTRA_SCOPE_PASSCODE_FLOW) {
      if (transactionRecord.phone_number) {
        throw new Error("Transaction has phone_number, not expected");
      }
      if (transactionRecord.verify_code) {
        throw new Error("Transaction has verify_code, not expected");
      }
      if ("otp_sms_verified" in transactionRecord) {
        throw new Error("Transaction has otp_sms_verified, not expected");
      }
      if ("otp_sms_expiry_time" in transactionRecord) {
        throw new Error("Transaction has otp_sms_expiry_time, not expected");
      }
      if ("otp_sms_send_count" in transactionRecord) {
        throw new Error("Transaction has otp_sms_send_count, not expected");
      }
      if ("otp_sms_attempt_count" in transactionRecord) {
        throw new Error("Transaction has otp_sms_attempt_count, not expected");
      }
    }
  } catch (error: any) {
    logger.warn(error.message);
    return formatJSONResponse({ statusCode: 400, body: { message: "Bad Request" } });
  }
};
