import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestTransaction,
  deleteTestTransaction,
  updateAttributesOnRecord,
  createTestAuthHashRecord,
  deleteTestAuthHashRecord,
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
  AUTH_CODES_TABLE,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_PASSCODE_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EMAIL_CHANGE_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
  PASSCODE_ATTEMPT_LIMIT,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
} from "@libs/config";
import { TEST_CODE_CHALLENGE, TEST_PASSCODE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { deleteItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeExtraScopeVerifyPasscode } from "src/test-e2e/e2eTestUtils";

const testPhoneNumber = "+447776661234";
const wrongPasscode = "999999";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
let testAccessToken: string;
let testTransactionId: string;
let createdAuthCode: string | null = null;

interface VerifyPasscodeSuccessResponse {
  auth_code: string;
  next_endpoint: string;
}

interface VerifyPasscodeErrorResponse {
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
    createdAuthCode = null;

    await clearAllRateLimitsForUser(testOnmouuid);

    await createTestAuthHashRecord({ onmouuid: testOnmouuid, passcode: TEST_PASSCODE });

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

    // Default setup: EXTRA_SCOPE_PASSCODE_FLOW (no OTP fields)
    // Matches transaction state written by extra-scope-authorize for the passcode flow
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EXTRA_SCOPE_PASSCODE_FLOW,
        next_endpoint: `${testTransactionId}/extra-scope/passcode/verify`,
        device_id: testDeviceId,
        passcode_attempt_count: 0,
        passcode_verified: false,
        create_refresh_token: false,
      },
    });
  });

  afterEach(async () => {
    if (createdAuthCode) {
      await deleteItemMethod({
        TableName: AUTH_CODES_TABLE,
        Key: { auth_code: createdAuthCode },
      });
      createdAuthCode = null;
    }

    await deleteTestTransaction(testTransactionId);
    await deleteTestAuthHashRecord(testOnmouuid);

    if (testTokenId && testOnmouuid) {
      await deleteTestTokenRecord({
        token_id: testTokenId,
        onmouuid: testOnmouuid,
      });
    }
  });

  test("happy path - EXTRA_SCOPE_PASSCODE_FLOW, correct passcode", async () => {
    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as VerifyPasscodeSuccessResponse;
    expect(body).toHaveProperty("auth_code");
    expect(body.next_endpoint).toEqual("token");

    createdAuthCode = body.auth_code;

    // Transaction updated correctly
    const txQueryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });
    expect(txQueryRes.Count).toBe(1);
    const transaction = txQueryRes.Items![0];
    expect(transaction.passcode_verified).toBe(true);
    expect(transaction.passcode_attempt_count).toBe(1);
    expect(transaction.auth_code).toBe(body.auth_code);
    expect(transaction.next_endpoint).toEqual("token");

    // Auth code record created
    const codeQueryRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": body.auth_code },
    });
    expect(codeQueryRes.Count).toBe(1);
    const authCodeRecord = codeQueryRes.Items![0];
    expect(authCodeRecord.onmouuid).toBe(testOnmouuid);
    expect(authCodeRecord.transaction_id).toBe(testTransactionId);
    expect(authCodeRecord.scope).toBe(AUTH_SERVICES_SCOPE);
    expect(authCodeRecord.code_challenge).toBe(TEST_CODE_CHALLENGE);
    expect(authCodeRecord.create_refresh_token).toBe(false);
    expect(authCodeRecord.ttl).toBeGreaterThan(getCurrentTimestampInSeconds());
  });

  test("happy path - EXTRA_SCOPE_OTP_PASSCODE_FLOW, correct passcode", async () => {
    // Matches transaction state after extra-scope-verifyOTP succeeds
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        extra_scope_flow: EXTRA_SCOPE_OTP_PASSCODE_FLOW,
        phone_number: testPhoneNumber,
        verify_code: 1111,
        otp_sms_verified: true,
        otp_sms_expiry_time: getCurrentTimestampInSeconds() + 300,
        otp_sms_send_count: 1,
        otp_sms_attempt_count: 0,
      },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as VerifyPasscodeSuccessResponse;
    expect(body).toHaveProperty("auth_code");
    expect(body.next_endpoint).toEqual("token");

    createdAuthCode = body.auth_code;
  });

  test("happy path - EMAIL_CHANGE_FLOW, correct passcode", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: EMAIL_CHANGE_FLOW },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as VerifyPasscodeSuccessResponse;
    expect(body).toHaveProperty("auth_code");
    createdAuthCode = body.auth_code;
  });

  test("happy path - PHONE_NUMBER_CHANGE_FLOW, correct passcode", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as VerifyPasscodeSuccessResponse;
    expect(body).toHaveProperty("auth_code");
    createdAuthCode = body.auth_code;
  });

  test("missing authorization header", async () => {
    const response = await invokeExtraScopeVerifyPasscode(testTransactionId, {
      passcode: TEST_PASSCODE,
    });

    expect(response.status).toBe(401);
  });

  test("missing passcode in request body", async () => {
    const response = await invokeExtraScopeVerifyPasscode(testTransactionId, {}, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("non-numeric passcode", async () => {
    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: "abc123" },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("passcode wrong length - not 6 digits", async () => {
    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: "1234" },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("transaction not found", async () => {
    const response = await invokeExtraScopeVerifyPasscode(
      "non-existent-transaction-id",
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("token onmouuid does not match transaction onmouuid", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { onmouuid: "different-onmouuid" },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "wrong_flow" },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "wrong_flow" },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("expired transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: getCurrentTimestampInSeconds() - 100 },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("create_refresh_token is true in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { create_refresh_token: true },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("passcode already verified", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { passcode_verified: true },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("auth_code already present in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_code: "some_auth_code" },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("passcode attempt count already at limit", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { passcode_attempt_count: PASSCODE_ATTEMPT_LIMIT },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "unexpected/next/endpoint" },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("EXTRA_SCOPE_OTP_PASSCODE_FLOW - OTP not yet verified", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        extra_scope_flow: EXTRA_SCOPE_OTP_PASSCODE_FLOW,
        phone_number: testPhoneNumber,
        verify_code: 1111,
        otp_sms_verified: false,
        otp_sms_expiry_time: getCurrentTimestampInSeconds() + 300,
        otp_sms_send_count: 1,
        otp_sms_attempt_count: 0,
      },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("EXTRA_SCOPE_PASSCODE_FLOW - unexpected otp_sms_verified field present", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_verified: false },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: TEST_PASSCODE },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.message).toEqual("Bad Request");
  });

  test("wrong passcode - attempt limit not yet reached", async () => {
    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: wrongPasscode },
      testAccessToken,
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.error_code).toEqual(PASSCODE_INVALID_REATTEMPT);
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/passcode/verify`);

    // Attempt count should be incremented, transaction preserved
    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });
    expect(queryRes.Count).toBe(1);
    expect(queryRes.Items![0].passcode_attempt_count).toBe(1);
  });

  test("wrong passcode - attempt limit reached, transaction deleted", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { passcode_attempt_count: PASSCODE_ATTEMPT_LIMIT - 1 },
    });

    const response = await invokeExtraScopeVerifyPasscode(
      testTransactionId,
      { passcode: wrongPasscode },
      testAccessToken,
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as VerifyPasscodeErrorResponse;
    expect(body.error_code).toEqual(PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED);
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
      action: "passcode_verify",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const response = await invokeExtraScopeVerifyPasscode(
        testTransactionId,
        { passcode: TEST_PASSCODE },
        testAccessToken,
      );

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
      action: "passcode_verify",
    });

    try {
      const response = await invokeExtraScopeVerifyPasscode(
        testTransactionId,
        { passcode: TEST_PASSCODE },
        testAccessToken,
      );

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toBe("no_expiry");
    } finally {
      await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
    }
  });
});
