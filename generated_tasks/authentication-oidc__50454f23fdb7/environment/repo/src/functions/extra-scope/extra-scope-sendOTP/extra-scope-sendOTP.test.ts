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
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeExtraScopeSendOTP } from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
let testAccessToken: string;
let testTransactionId: string;

interface SendOTPSuccessResponse {
  message: string;
  next_endpoint: string;
}

interface SendOTPErrorResponse {
  message?: string;
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

    // Matches the transaction state written by extra-scope-authorize for the OTP passcode flow
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EXTRA_SCOPE_OTP_PASSCODE_FLOW,
        next_endpoint: `${testTransactionId}/extra-scope/otp/send`,
        device_id: testDeviceId,
        otp_sms_send_count: 0,
        otp_sms_attempt_count: 0,
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

  test("happy path - OTP sent successfully", async () => {
    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const body = (await response.json()) as SendOTPSuccessResponse;
    expect(body.message).toEqual("OTP sent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);

    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryRes.Count).toBe(1);
    const transaction = queryRes.Items![0];
    expect(transaction.otp_sms_send_count).toBe(1);
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);
    expect(transaction.phone_number).toBeDefined();
    expect(transaction.verify_code).toBeDefined();
    expect(transaction.otp_sms_expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
  });

  test("happy path - EMAIL_CHANGE_FLOW also accepted", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: EMAIL_CHANGE_FLOW },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const body = (await response.json()) as SendOTPSuccessResponse;
    expect(body.message).toEqual("OTP sent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);
  });

  test("happy path - test phone number gets verify_code 1111", async () => {
    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

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
    const response = await invokeExtraScopeSendOTP("non-existent-transaction-id", testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("missing authorization header", async () => {
    const response = await invokeExtraScopeSendOTP(testTransactionId);

    expect(response.status).toBe(401);
  });

  test("unauthorized - token onmouuid does not match transaction onmouuid", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { onmouuid: "different-onmouuid" },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    // This handler returns 403 (not 400) for onmouuid mismatch
    expect(response.status).toBe(403);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "wrong_flow" },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "wrong_flow" },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
  });

  test("expired transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: getCurrentTimestampInSeconds() - 100 },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("create_refresh_token is true in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { create_refresh_token: true },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("otp_sms_send_count is not 0 - OTP already sent", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_send_count: 1 },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("otp_sms_attempt_count is not 0", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_attempt_count: 1 },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("otp_sms_expiry_time already present in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() + 300 },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("phone_number already present in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { phone_number: "+447776661234" },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("auth_code already present in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_code: "some_auth_code" },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "unexpected/next/endpoint" },
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("missing otp_sms_send_count in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_send_count",
    });

    const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as SendOTPErrorResponse;
    expect(body.message).toEqual("Bad Request");
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
      const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

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
      const response = await invokeExtraScopeSendOTP(testTransactionId, testAccessToken);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toBe("no_expiry");
    } finally {
      await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
    }
  });
});
