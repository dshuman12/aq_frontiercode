import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestTransaction,
  deleteTestTransaction,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  clearAllRateLimitsForUser,
  testModes,
} from "@libs/testUtils";
import {
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EMAIL_CHANGE_FLOW,
  OTP_SEND_LIMIT,
  OTP_ATTEMPT_LIMIT,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeExtraScopeResendOTP } from "src/test-e2e/e2eTestUtils";

const testPhoneNumber = "+447776661234";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
let testAccessToken: string;
let testTransactionId: string;

interface ResendOTPSuccessResponse {
  message: string;
  next_endpoint: string;
}

interface ResendOTPErrorResponse {
  message?: string;
  error_code?: string;
  next_endpoint?: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
    testOnmouuid = testCreditAccountUserCreds.customerId;
    testDeviceId = testCreditAccountUserCreds.device_id;
  });

  beforeEach(async () => {
    await clearAllRateLimitsForUser(testOnmouuid);

    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: AUTH_SERVICES_SCOPE,
      code_challenge: TEST_CODE_CHALLENGE,
    });

    const tokenResponse = await createTestTokenRecord({
      scope: AUTH_SERVICES_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 5,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testOnmouuid,
      domain: "app",
    });

    testAccessToken = tokenResponse.access_token;
    testTokenId = tokenResponse.token_id;

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EXTRA_SCOPE_OTP_PASSCODE_FLOW,
        next_endpoint: `${testTransactionId}/extra-scope/otp/resend`,
        phone_number: testPhoneNumber,
        verify_code: 1234,
        device_id: testDeviceId,
        otp_sms_send_count: 1,
        otp_sms_attempt_count: 0,
        otp_sms_verified: false,
        otp_sms_expiry_time: getCurrentTimestampInSeconds() + 300,
        create_refresh_token: false,
      },
    });
  });

  afterEach(async () => {
    await deleteTestTransaction(testTransactionId);

    if (testTokenId && testOnmouuid) {
      await deleteTestTokenRecord({
        token_id: testTokenId,
        onmouuid: testOnmouuid,
      });
    }
  });

  test("happy path - OTP resend successful from otp/resend next_endpoint", async () => {
    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const body = (await response.json()) as ResendOTPSuccessResponse;
    expect(body.message).toEqual("OTP resent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);

    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryRes.Count).toBe(1);
    const transaction = queryRes.Items![0];
    expect(transaction.otp_sms_send_count).toBe(2);
    expect(transaction.otp_sms_attempt_count).toBe(0);
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);
    expect(transaction.verify_code).toBeDefined();
    expect(transaction.otp_sms_expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
  });

  test("happy path - OTP resend from otp/verify next_endpoint (after failed verify attempt)", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: `${testTransactionId}/extra-scope/otp/verify` },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const body = (await response.json()) as ResendOTPSuccessResponse;
    expect(body.message).toEqual("OTP resent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);
  });

  test("happy path - EMAIL_CHANGE_FLOW also accepted", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: EMAIL_CHANGE_FLOW },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const body = (await response.json()) as ResendOTPSuccessResponse;
    expect(body.message).toEqual("OTP resent successfully");
  });

  test("happy path - test phone number gets test OTP code (1111)", async () => {
    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryRes.Count).toBe(1);
    const transaction = queryRes.Items![0];
    expect(transaction.verify_code).toBe(1111);
  });

  test("transaction not found", async () => {
    const response = await invokeExtraScopeResendOTP(
      "non-existent-transaction-id",
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("missing authorization header", async () => {
    const response = await invokeExtraScopeResendOTP(testTransactionId);

    expect(response.status).toBe(401);
  });

  test("unauthorized - token onmouuid does not match transaction onmouuid", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { onmouuid: "different-onmouuid" },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "wrong_flow" },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "wrong_flow" },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("expired transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: getCurrentTimestampInSeconds() - 100 },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("create_refresh_token is true in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { create_refresh_token: true },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("missing phone_number in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "phone_number",
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("OTP already verified", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_verified: true },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "unexpected/next/endpoint" },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("OTP attempt limit reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_attempt_count: OTP_ATTEMPT_LIMIT },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("otp_sms_send_count less than 1", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_send_count: 0 },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("OTP send limit reached - returns 422 and deletes transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_send_count: OTP_SEND_LIMIT },
    });

    const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(422);
    const body = (await response.json()) as ResendOTPErrorResponse;
    expect(body.error_code).toEqual(OTP_SEND_LIMIT_REACHED);
    expect(body.next_endpoint).toEqual("authorize/extra-scope");

    // Transaction should have been deleted
    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });
    expect(queryRes.Count).toBe(0);
  });

  test("rate limited access", async () => {
    const testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "otp_sms_send",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(typeof body.expiry_time).toBe("number");
    } finally {
      await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
    }
  });

  test("super rate limited access", async () => {
    const testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "otp_sms_send",
    });

    try {
      const response = await invokeExtraScopeResendOTP(testTransactionId, testAccessToken);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toBe("no_expiry");
    } finally {
      await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
    }
  });
});
