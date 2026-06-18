// Mock the logger to avoid 'Logger used outside of runWithContext' errors
vi.mock("@onmoapp/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    addContext: vi.fn(),
  },
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    addContext: vi.fn(),
  }),
}));
import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryTableMethod, deleteItemMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import { RateLimiter } from "@onmoapp/onmo-rate-limiter";
import { hasRecordExpired } from "@libs/utils";
import { OTP_EXPIRED_RESEND, OTP_EXPIRED_SEND_LIMIT_REACHED, OTP_SEND_LIMIT } from "@libs/config";
import { OTP_PASSCODE_OTP_RESEND } from "../otp-passcode.constants";
import { logger } from "@onmoapp/logger";
import { getTransactionById, checkAndRecordRateLimit, handleExpiredOTP } from "./util";

// Mock the dependencies
vi.mock("@onmoapp/onmo-dynamodb", () => ({
  queryTableMethod: vi.fn(),
  deleteItemMethod: vi.fn(),
  updateItemMethod: vi.fn(),
}));

vi.mock("@onmoapp/onmo-rate-limiter", () => ({
  RateLimiter: vi.fn(),
}));

vi.mock("@libs/utils", () => ({
  hasRecordExpired: vi.fn(),
}));

describe("getTransactionById", () => {
  const transaction_id = "test-transaction-id";
  const auth_transactions_table = "test-auth-transactions-table";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return transaction when found", async () => {
    const mockTransaction = {
      transaction_id,
      phone_number: "1234567890",
      verify_code: 1234,
    };

    (queryTableMethod as any).mockResolvedValue({
      Items: [mockTransaction],
      Count: 1,
    });

    const result = await getTransactionById({
      transaction_id,
      auth_transactions_table,
    });

    expect(queryTableMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });

    expect(result).toEqual(mockTransaction);
  });

  it("should throw error when transaction not found", async () => {
    (queryTableMethod as any).mockResolvedValue({
      Items: [],
      Count: 0,
    });

    await expect(
      getTransactionById({
        transaction_id,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Transaction not found");
  });

  it("should throw error when Items is undefined", async () => {
    (queryTableMethod as any).mockResolvedValue({
      Items: undefined,
      Count: 0,
    });

    await expect(
      getTransactionById({
        transaction_id,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Transaction not found");
  });

  it("should throw error when queryTableMethod fails", async () => {
    const mockError = new Error("Database error");
    (queryTableMethod as any).mockRejectedValue(mockError);

    await expect(
      getTransactionById({
        transaction_id,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Database error");
  });
});

describe("checkAndRecordRateLimit", () => {
  const onmouuid = "test-onmouuid";
  const action = "otp_sms_verify";
  const domain = "auth_login";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when rate limit not exceeded", async () => {
    const mockRateLimiter = {
      checkLimits: vi.fn().mockResolvedValue({
        rate_limited: false,
        limited_actions: [],
        super_rate_limited: false,
        super_limited_actions: [],
      }),
      recordAction: vi.fn().mockResolvedValue(undefined),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    const result = await checkAndRecordRateLimit({
      onmouuid,
      action,
      domain,
    });

    expect(mockRateLimiter.checkLimits).toHaveBeenCalledWith({
      onmouuid,
      to_check: [
        { domain: "auth_general" },
        { domain: "auth_login" },
        { domain: "auth_extra_scope" },
        { domain: "auth_forgotten_passcode" },
        { domain: "auth_biometrics_registration" },
      ],
    });

    expect(mockRateLimiter.recordAction).toHaveBeenCalledWith({
      onmouuid,
      domain,
      action,
    });

    expect(result).toBeNull();
  });

  it("should return rate limit response when rate limited", async () => {
    const mockLimitedAction = {
      action: "otp_sms_verify",
      rate_limit_expiry: 1234567890,
    };

    const mockRateLimiter = {
      checkLimits: vi.fn().mockResolvedValue({
        rate_limited: true,
        limited_actions: [mockLimitedAction],
        super_rate_limited: false,
        super_limited_actions: [],
      }),
      recordAction: vi.fn(),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    const result = await checkAndRecordRateLimit({
      onmouuid,
      action,
      domain,
    });

    expect(result).toMatchObject({
      statusCode: 429,
      body: { expiry_time: 1234567890 },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      `Rate limited for actions: ${JSON.stringify([mockLimitedAction])}`,
    );

    expect(mockRateLimiter.recordAction).not.toHaveBeenCalled();
  });

  it("should return no expiry when super rate limited", async () => {
    const mockSuperLimitedAction = {
      action: "otp_sms_verify",
    };

    const mockRateLimiter = {
      checkLimits: vi.fn().mockResolvedValue({
        rate_limited: false,
        limited_actions: [],
        super_rate_limited: true,
        super_limited_actions: [mockSuperLimitedAction],
      }),
      recordAction: vi.fn(),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    const result = await checkAndRecordRateLimit({
      onmouuid,
      action,
      domain,
    });

    expect(result).toMatchObject({
      statusCode: 429,
      body: { expiry_time: "no_expiry" },
    });
  });

  it("should handle both rate limited and super rate limited", async () => {
    const mockLimitedAction = {
      action: "otp_sms_verify",
      rate_limit_expiry: 1234567890,
    };
    const mockSuperLimitedAction = {
      action: "other_action",
    };

    const mockRateLimiter = {
      checkLimits: vi.fn().mockResolvedValue({
        rate_limited: true,
        limited_actions: [mockLimitedAction],
        super_rate_limited: true,
        super_limited_actions: [mockSuperLimitedAction],
      }),
      recordAction: vi.fn(),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    const result = await checkAndRecordRateLimit({
      onmouuid,
      action,
      domain,
    });

    expect(result).toMatchObject({
      statusCode: 429,
      body: { expiry_time: "no_expiry" },
    });
  });

  it("should use max expiry time when multiple limited actions", async () => {
    const mockLimitedAction1 = {
      action: "action1",
      rate_limit_expiry: 1000,
    };
    const mockLimitedAction2 = {
      action: "action2",
      rate_limit_expiry: 2000,
    };
    const mockLimitedAction3 = {
      action: "action3",
      rate_limit_expiry: 1500,
    };

    const mockRateLimiter = {
      checkLimits: vi.fn().mockResolvedValue({
        rate_limited: true,
        limited_actions: [mockLimitedAction1, mockLimitedAction2, mockLimitedAction3],
        super_rate_limited: false,
        super_limited_actions: [],
      }),
      recordAction: vi.fn(),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    const result = await checkAndRecordRateLimit({
      onmouuid,
      action,
      domain,
    });

    expect(result).toMatchObject({
      statusCode: 429,
      body: { expiry_time: 2000 },
    });
  });

  it("should throw error when checkLimits fails", async () => {
    const mockError = new Error("Rate limiter error");
    const mockRateLimiter = {
      checkLimits: vi.fn().mockRejectedValue(mockError),
      recordAction: vi.fn(),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    await expect(
      checkAndRecordRateLimit({
        onmouuid,
        action,
        domain,
      }),
    ).rejects.toThrow("Failed to impose rate limit: Rate limiter error");
  });

  it("should throw error when recordAction fails", async () => {
    const mockError = new Error("Record action error");
    const mockRateLimiter = {
      checkLimits: vi.fn().mockResolvedValue({
        rate_limited: false,
        limited_actions: [],
        super_rate_limited: false,
        super_limited_actions: [],
      }),
      recordAction: vi.fn().mockRejectedValue(mockError),
    };

    (RateLimiter as any).mockImplementation(() => mockRateLimiter);

    await expect(
      checkAndRecordRateLimit({
        onmouuid,
        action,
        domain,
      }),
    ).rejects.toThrow("Failed to impose rate limit: Record action error");
  });
});

describe("handleExpiredOTP", () => {
  const transaction_id = "test-transaction-id";
  const auth_transactions_table = "test-auth-transactions-table";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when OTP has not expired", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 + 300, // 5 minutes in future
      otp_sms_send_count: 1,
    };

    (hasRecordExpired as any).mockReturnValue(false);

    const result = await handleExpiredOTP({
      transactionRecord,
      transaction_id,
      auth_transactions_table,
    });

    expect(result).toBeNull();
    expect(deleteItemMethod).not.toHaveBeenCalled();
    expect(updateItemMethod).not.toHaveBeenCalled();
  });

  it("should void transaction and return error when OTP expired and send limit reached", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 - 300, // expired
      otp_sms_send_count: OTP_SEND_LIMIT,
    };

    (hasRecordExpired as any).mockReturnValue(true);
    (deleteItemMethod as any).mockResolvedValue({});

    const result = await handleExpiredOTP({
      transactionRecord,
      transaction_id,
      auth_transactions_table,
    });

    expect(logger.warn).toHaveBeenCalledWith("OTP has expired");
    expect(logger.warn).toHaveBeenCalledWith(
      `Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`,
    );

    expect(deleteItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id },
    });

    expect(result).toMatchObject({
      statusCode: 422,
      body: {
        error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
        next_endpoint: "authorize/otp-passcode",
      },
    });

    expect(updateItemMethod).not.toHaveBeenCalled();
  });

  it("should handle deleteItemMethod failure gracefully when send limit reached", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 - 300,
      otp_sms_send_count: OTP_SEND_LIMIT,
    };

    const deleteError = new Error("Delete failed");
    (hasRecordExpired as any).mockReturnValue(true);
    (deleteItemMethod as any).mockRejectedValue(deleteError);

    const result = await handleExpiredOTP({
      transactionRecord,
      transaction_id,
      auth_transactions_table,
    });

    expect(logger.error).toHaveBeenCalledWith("Failed to void transaction: Delete failed");

    expect(result).toMatchObject({
      statusCode: 422,
      body: {
        error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
        next_endpoint: "authorize/otp-passcode",
      },
    });
  });

  it("should update transaction and return resend response when OTP expired but send limit not reached", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 - 300,
      otp_sms_send_count: 1,
    };

    const otp_resend_endpoint = `${transaction_id}/${OTP_PASSCODE_OTP_RESEND}`;

    (hasRecordExpired as any).mockReturnValue(true);
    (updateItemMethod as any).mockResolvedValue({});

    const result = await handleExpiredOTP({
      transactionRecord,
      transaction_id,
      auth_transactions_table,
    });

    expect(updateItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id },
      UpdateExpression: "set next_endpoint = :next_endpoint",
      ExpressionAttributeValues: { ":next_endpoint": otp_resend_endpoint },
    });

    expect(result).toMatchObject({
      statusCode: 422,
      body: {
        error_code: OTP_EXPIRED_RESEND,
        next_endpoint: otp_resend_endpoint,
      },
    });

    expect(deleteItemMethod).not.toHaveBeenCalled();
  });

  it("should throw error when updateItemMethod fails", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 - 300,
      otp_sms_send_count: 1,
    };

    const updateError = new Error("Update failed");
    (hasRecordExpired as any).mockReturnValue(true);
    (updateItemMethod as any).mockRejectedValue(updateError);

    await expect(
      handleExpiredOTP({
        transactionRecord,
        transaction_id,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Error updating transaction: Update failed");
  });

  it("should handle send count exactly at limit", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 - 300,
      otp_sms_send_count: OTP_SEND_LIMIT,
    };

    (hasRecordExpired as any).mockReturnValue(true);
    (deleteItemMethod as any).mockResolvedValue({});

    const result = await handleExpiredOTP({
      transactionRecord,
      transaction_id,
      auth_transactions_table,
    });

    expect(result).toMatchObject({
      statusCode: 422,
      body: {
        error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
        next_endpoint: "authorize/otp-passcode",
      },
    });
  });

  it("should handle send count just below limit", async () => {
    const transactionRecord = {
      transaction_id,
      otp_sms_expiry_time: Date.now() / 1000 - 300,
      otp_sms_send_count: OTP_SEND_LIMIT - 1,
    };

    const otp_resend_endpoint = `${transaction_id}/${OTP_PASSCODE_OTP_RESEND}`;

    (hasRecordExpired as any).mockReturnValue(true);
    (updateItemMethod as any).mockResolvedValue({});

    const result = await handleExpiredOTP({
      transactionRecord,
      transaction_id,
      auth_transactions_table,
    });

    expect(result).toMatchObject({
      statusCode: 422,
      body: {
        error_code: OTP_EXPIRED_RESEND,
        next_endpoint: otp_resend_endpoint,
      },
    });
  });
});
