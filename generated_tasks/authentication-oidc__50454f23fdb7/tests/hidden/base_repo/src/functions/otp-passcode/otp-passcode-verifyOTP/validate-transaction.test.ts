import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@onmoapp/logger";
import { hasRecordExpired } from "@libs/utils";
import {
  FIRST_TIME_LOGIN_FLOW,
  OTP_ATTEMPT_LIMIT,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_SEND_LIMIT,
} from "@libs/config";
import { validateTransactionForOTPVerify } from "./validate-transaction";
import { OTP_PASSCODE_OTP_VERIFY } from "../otp-passcode.constants";

// Mock the dependencies
vi.mock("@libs/utils", () => ({
  hasRecordExpired: vi.fn(),
}));

vi.mock("@onmoapp/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    addContext: vi.fn(),
  },
}));

describe("validateTransactionForOTPVerify", () => {
  const transaction_id = "test-transaction-id";
  const phone_number = "1234567890";
  const storedVerifyCode = 1234;

  const createValidTransactionRecord = (): Record<string, any> => ({
    transaction_id,
    auth_flow: OTP_PASSCODE_AUTH_FLOW,
    login_flow: FIRST_TIME_LOGIN_FLOW,
    ttl: Date.now() / 1000 + 300,
    next_endpoint: `${transaction_id}/${OTP_PASSCODE_OTP_VERIFY}`,
    create_refresh_token: true,
    phone_number,
    verify_code: storedVerifyCode,
    otp_sms_verified: false,
    otp_sms_expiry_time: Date.now() / 1000 + 300,
    otp_sms_send_count: 1,
    otp_sms_attempt_count: 0,
    passcode_attempt_count: 0,
    passcode_verified: false,
    code_challenge: "test-code-challenge",
    scope: "test-scope",
    device_id: "test-device-id",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (hasRecordExpired as any).mockReturnValue(false);
  });

  it("should successfully validate a valid transaction", () => {
    const transactionRecord = createValidTransactionRecord();

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).not.toThrow();

    expect(logger.addContext).toHaveBeenCalledWith("auth_flow", OTP_PASSCODE_AUTH_FLOW);
    expect(logger.addContext).toHaveBeenCalledWith("login_flow", FIRST_TIME_LOGIN_FLOW);
    expect(logger.addContext).toHaveBeenCalledWith("storedVerifyCode", storedVerifyCode);
    expect(logger.addContext).toHaveBeenCalledWith("otp_sms_send_count", 1);
    expect(logger.addContext).toHaveBeenCalledWith("otp_sms_attempt_count", 0);
  });

  it("should throw error when auth_flow is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.auth_flow;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("[suspicious_activity] Transaction does not have auth_flow");
  });

  it("should throw error when auth_flow is incorrect", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.auth_flow = "wrong-flow";

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow(
      `[suspicious_activity] Transaction login_flow: wrong-flow, expected: ${OTP_PASSCODE_AUTH_FLOW}`,
    );
  });

  it("should throw error when login_flow is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.login_flow;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("[suspicious_activity] Transaction does not have login_flow");
  });

  it("should throw error when login_flow is incorrect", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.login_flow = "wrong-flow";

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow(
      `[suspicious_activity] Transaction login_flow: wrong-flow, expected: ${FIRST_TIME_LOGIN_FLOW}`,
    );
  });

  it("should throw error when transaction TTL has expired", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.ttl = Date.now() / 1000 - 300;

    (hasRecordExpired as any).mockReturnValue(true);

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow(
      `Transaction with transaction_id ${transaction_id} has expired. TTL: ${transactionRecord.ttl}`,
    );
  });

  it("should throw error when next_endpoint is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.next_endpoint;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have next_endpoint");
  });

  it("should throw error when create_refresh_token is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.create_refresh_token;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction missing create_refresh token");
  });

  it("should throw error when create_refresh_token is false", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.create_refresh_token = false;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction not marked with create_refresh_token=true");
  });

  it("should throw error when phone_number is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.phone_number;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have phone_number");
  });

  it("should throw error when verify_code is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.verify_code;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have verify_code");
  });

  it("should throw error when otp_sms_verified is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.otp_sms_verified;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have otp_sms_verified");
  });

  it("should throw error when otp_sms_expiry_time is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.otp_sms_expiry_time;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have otp_sms_expiry_time");
  });

  it("should throw error when otp_sms_send_count is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.otp_sms_send_count;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have otp_sms_send_count");
  });

  it("should throw error when otp_sms_attempt_count is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.otp_sms_attempt_count;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have otp_sms_attempt_count");
  });

  it("should throw error when passcode_attempt_count is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.passcode_attempt_count;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have passcode_attempt_count");
  });

  it("should throw error when passcode_verified is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.passcode_verified;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction does not have passcode_attempt_count");
  });

  it("should throw error when code_challenge is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.code_challenge;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("[suspicious_activity] Missing attributes in transaction:");
  });

  it("should throw error when scope is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.scope;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("[suspicious_activity] Missing attributes in transaction:");
  });

  it("should throw error when device_id is missing", () => {
    const transactionRecord = createValidTransactionRecord();
    delete transactionRecord.device_id;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("[suspicious_activity] Missing attributes in transaction:");
  });

  it("should throw error when passcode_attempt_count is greater than 0", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.passcode_attempt_count = 1;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction should have passcode_attempt_count of 0");
  });

  it("should throw error when passcode_verified is true", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.passcode_verified = true;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Passcode has already been verified");
  });

  it("should throw error when otp_sms_verified is true", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_verified = true;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("OTP has already been verified");
  });

  it("should throw error when auth_code exists", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.auth_code = "some-auth-code";

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction already been used for an auth code");
  });

  it("should throw error when next_endpoint does not match expected endpoint", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.next_endpoint = "wrong-endpoint";

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction next_endpoint does not match this endpoint");
  });

  it("should throw error when phone_number does not match", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.phone_number = "different-phone";

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Phone number on transaction does not match provided one");
  });

  it("should throw error when otp_sms_send_count is less than 1", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_send_count = 0;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow("Transaction should have otp_sms_send_count of at least 1");
  });

  it("should throw error when otp_sms_send_count exceeds limit", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_send_count = OTP_SEND_LIMIT + 1;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow(`Transaction has otp_sms_send_count greater than limit of ${OTP_SEND_LIMIT}`);
  });

  it("should throw error when otp_sms_send_count equals limit", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_send_count = OTP_SEND_LIMIT;

    // Should not throw for equals limit, only greater than
    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).not.toThrow();
  });

  it("should throw error when otp_sms_attempt_count equals limit", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_attempt_count = OTP_ATTEMPT_LIMIT;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow(`Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
  });

  it("should throw error when otp_sms_attempt_count exceeds limit", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_attempt_count = OTP_ATTEMPT_LIMIT + 1;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).toThrow(`Transaction has already reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);
  });

  it("should not throw when otp_sms_attempt_count is below limit", () => {
    const transactionRecord = createValidTransactionRecord();
    transactionRecord.otp_sms_attempt_count = OTP_ATTEMPT_LIMIT - 1;

    expect(() => {
      validateTransactionForOTPVerify({
        transactionRecord,
        transaction_id,
        phone_number,
        storedVerifyCode,
      });
    }).not.toThrow();
  });
});
