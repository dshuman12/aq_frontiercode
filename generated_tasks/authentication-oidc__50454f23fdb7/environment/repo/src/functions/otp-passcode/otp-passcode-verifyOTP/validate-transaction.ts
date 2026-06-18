import { hasRecordExpired } from "@libs/utils";
import { OTP_PASSCODE_OTP_VERIFY } from "../otp-passcode.constants";
import {
  FIRST_TIME_LOGIN_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_SEND_LIMIT,
} from "@libs/config";
import { logger } from "@onmoapp/logger";

type ValidateTransactionForOTPVerifyParams = {
  transactionRecord: Record<string, any>;
  transaction_id: string;
  phone_number: string;
  storedVerifyCode: number | undefined;
};

export function validateTransactionForOTPVerify({
  transactionRecord,
  transaction_id,
  phone_number,
  storedVerifyCode,
}: ValidateTransactionForOTPVerifyParams): void {
  if (!transactionRecord.auth_flow) {
    throw new Error("[suspicious_activity] Transaction does not have auth_flow");
  }
  if (transactionRecord.auth_flow !== OTP_PASSCODE_AUTH_FLOW) {
    throw new Error(
      `[suspicious_activity] Transaction login_flow: ${transactionRecord.auth_flow}, expected: ${OTP_PASSCODE_AUTH_FLOW}`,
    );
  }
  logger.addContext("auth_flow", transactionRecord.auth_flow);
  if (!transactionRecord.login_flow) {
    throw new Error("[suspicious_activity] Transaction does not have login_flow");
  }
  if (transactionRecord.login_flow !== FIRST_TIME_LOGIN_FLOW) {
    throw new Error(
      `[suspicious_activity] Transaction login_flow: ${transactionRecord.login_flow}, expected: ${FIRST_TIME_LOGIN_FLOW}`,
    );
  }
  logger.addContext("login_flow", transactionRecord.login_flow);

  logger.addContext("storedVerifyCode", storedVerifyCode);

  if (hasRecordExpired(transactionRecord.ttl)) {
    throw new Error(
      `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
    );
  }
  if (!transactionRecord.next_endpoint) {
    throw new Error("Transaction does not have next_endpoint");
  }
  if (!("create_refresh_token" in transactionRecord)) {
    throw new Error("Transaction missing create_refresh token");
  }
  if (!transactionRecord.create_refresh_token) {
    throw new Error("Transaction not marked with create_refresh_token=true");
  }
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

  logger.addContext("otp_sms_send_count", transactionRecord.otp_sms_send_count);
  if (!("otp_sms_attempt_count" in transactionRecord)) {
    throw new Error("Transaction does not have otp_sms_attempt_count");
  }

  logger.addContext("otp_sms_attempt_count", transactionRecord.otp_sms_attempt_count);
  if (!("passcode_attempt_count" in transactionRecord)) {
    throw new Error("Transaction does not have passcode_attempt_count");
  }
  if (!("passcode_verified" in transactionRecord)) {
    throw new Error("Transaction does not have passcode_attempt_count");
  }

  if (
    !transactionRecord.code_challenge ||
    !transactionRecord.scope ||
    !transactionRecord.device_id
  ) {
    throw new Error(
      `[suspicious_activity] Missing attributes in transaction: ${JSON.stringify(transactionRecord)}`,
    );
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
  if (transactionRecord.auth_code) {
    throw new Error("Transaction already been used for an auth code");
  }

  if (transactionRecord.next_endpoint !== `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}`) {
    throw new Error("Transaction next_endpoint does not match this endpoint");
  }
  if (transactionRecord.phone_number !== phone_number) {
    throw new Error("Phone number on transaction does not match provided one");
  }
  if (transactionRecord.otp_sms_send_count < 1) {
    throw new Error(`Transaction should have otp_sms_send_count of at least 1`);
  }
  if (transactionRecord.otp_sms_send_count > OTP_SEND_LIMIT) {
    throw new Error(`Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`);
  }
  if (transactionRecord.otp_sms_attempt_count >= OTP_ATTEMPT_LIMIT) {
    throw new Error(
      `Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`,
    );
  }
}
