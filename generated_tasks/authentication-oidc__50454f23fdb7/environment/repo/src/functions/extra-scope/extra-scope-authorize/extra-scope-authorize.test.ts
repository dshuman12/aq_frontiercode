import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  clearAllRateLimitsForUser,
  deleteTestTransaction,
  createTestAuthKeyRecord,
  deleteTestAuthKeyRecord,
  testModes,
} from "@libs/testUtils";
import {
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  MOBILE_NUMBER_CHANGE_SCOPE,
  TEST_OTP_STEP_EXTRA_SCOPE,
  TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_PASSCODE_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EXTRA_SCOPE_BIOMETRICS_FLOW,
  EMAIL_CHANGE_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/config";
import { TEST_ACTIVE_CREDIT_CUSTOMER, TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeAuthorizeExtraScope } from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
let testAccessToken: string;
let createdTransactionId: string | null = null;

interface ExtraScopeAuthorizeSuccessResponse {
  transaction_id: string;
  next_endpoint: string;
  unsigned_challenge?: string;
}

interface ExtraScopeAuthorizeErrorResponse {
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
    createdTransactionId = null;

    await clearAllRateLimitsForUser(testOnmouuid);

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
  });

  afterEach(async () => {
    if (createdTransactionId) {
      await deleteTestTransaction(createdTransactionId);
      createdTransactionId = null;
    }

    if (testTokenId && testOnmouuid) {
      await deleteTestTokenRecord({
        token_id: testTokenId,
        onmouuid: testOnmouuid,
      });
    }
  });

  test("happy path - passcode flow (default)", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as ExtraScopeAuthorizeSuccessResponse;
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/extra-scope/passcode/verify`);

    createdTransactionId = body.transaction_id;

    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": createdTransactionId },
    });

    expect(queryRes.Count).toBe(1);
    const transaction = queryRes.Items![0];
    expect(transaction.auth_flow).toBe(EXTRA_SCOPE_AUTH_FLOW);
    expect(transaction.extra_scope_flow).toBe(EXTRA_SCOPE_PASSCODE_FLOW);
    expect(transaction.onmouuid).toBe(testOnmouuid);
    expect(transaction.device_id).toBe(testDeviceId);
    expect(transaction.passcode_verified).toBe(false);
    expect(transaction.passcode_attempt_count).toBe(0);
  });

  test("happy path - OTP passcode flow", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: TEST_OTP_STEP_EXTRA_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as ExtraScopeAuthorizeSuccessResponse;
    expect(body).toHaveProperty("transaction_id");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/extra-scope/otp/send`);

    createdTransactionId = body.transaction_id;

    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": createdTransactionId },
    });

    expect(queryRes.Count).toBe(1);
    const transaction = queryRes.Items![0];
    expect(transaction.auth_flow).toBe(EXTRA_SCOPE_AUTH_FLOW);
    expect(transaction.extra_scope_flow).toBe(EXTRA_SCOPE_OTP_PASSCODE_FLOW);
    expect(transaction.otp_sms_send_count).toBe(0);
    expect(transaction.otp_sms_verified).toBe(false);
    expect(transaction.passcode_verified).toBe(false);
  });

  test("happy path - biometrics flow", async () => {
    await createTestAuthKeyRecord({ onmouuid: testOnmouuid, device_id: testDeviceId });

    try {
      const response = await invokeAuthorizeExtraScope(
        {
          onmouuid: testOnmouuid,
          device_id: testDeviceId,
          scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
          code_challenge: TEST_CODE_CHALLENGE,
          biometrics: true,
        },
        testAccessToken,
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as ExtraScopeAuthorizeSuccessResponse;
      expect(body).toHaveProperty("transaction_id");
      expect(body).toHaveProperty("unsigned_challenge");
      expect(body.next_endpoint).toEqual(`${body.transaction_id}/extra-scope/biometrics/verify`);

      createdTransactionId = body.transaction_id;

      const queryRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": createdTransactionId },
      });

      expect(queryRes.Count).toBe(1);
      const transaction = queryRes.Items![0];
      expect(transaction.auth_flow).toBe(EXTRA_SCOPE_AUTH_FLOW);
      expect(transaction.extra_scope_flow).toBe(EXTRA_SCOPE_BIOMETRICS_FLOW);
      expect(transaction.biometrics_verified).toBe(false);
      expect(transaction.unsigned_challenge).toBeDefined();
      expect(transaction.fe_public_key).toBeDefined();
    } finally {
      await deleteTestAuthKeyRecord(testOnmouuid);
    }
  });

  // Uses TEST_ACTIVE_CREDIT_CUSTOMER because the eligibility check for EMAIL_ADDRESS_CHANGE_SCOPE
  // enforces a 30-day account age restriction, which freshly created test accounts cannot satisfy.
  // TODO Skipped for HAL until a static HAL test account with 30+ day history is available.
  test.runIf(codePath === "MAMBU")("happy path - email change flow", async () => {
    const staticOnmouuid = TEST_ACTIVE_CREDIT_CUSTOMER.customerId;
    const staticDeviceId = TEST_ACTIVE_CREDIT_CUSTOMER.deviceId;

    await clearAllRateLimitsForUser(staticOnmouuid);

    const tokenResponse = await createTestTokenRecord({
      scope: AUTH_SERVICES_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 5,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: staticOnmouuid,
      domain: "app",
    });

    try {
      const response = await invokeAuthorizeExtraScope(
        {
          onmouuid: staticOnmouuid,
          device_id: staticDeviceId,
          scope: EMAIL_ADDRESS_CHANGE_SCOPE,
          code_challenge: TEST_CODE_CHALLENGE,
          new_email: "newemail@test.com",
        },
        tokenResponse.access_token,
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as ExtraScopeAuthorizeSuccessResponse;
      expect(body).toHaveProperty("transaction_id");
      expect(body.next_endpoint).toEqual(`${body.transaction_id}/email-change/initiate`);

      const queryRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
      });

      expect(queryRes.Count).toBe(1);
      const transaction = queryRes.Items![0];
      expect(transaction.auth_flow).toBe(EXTRA_SCOPE_AUTH_FLOW);
      expect(transaction.extra_scope_flow).toBe(EMAIL_CHANGE_FLOW);
      expect(transaction.new_email).toBe("newemail@test.com");
      expect(transaction.email_validation_status).toBe("PENDING");

      await deleteTestTransaction(body.transaction_id);
    } finally {
      await deleteTestTokenRecord({
        token_id: tokenResponse.token_id,
        onmouuid: staticOnmouuid,
      });
    }
  });

  // Uses TEST_ACTIVE_CREDIT_CUSTOMER because the eligibility check for MOBILE_NUMBER_CHANGE_SCOPE
  // enforces a 30-day account age restriction, which freshly created test accounts cannot satisfy.
  // TODO Skipped for HAL until a static HAL test account with 30+ day history is available.
  test.runIf(codePath === "MAMBU")("happy path - phone change flow", async () => {
    const staticOnmouuid = TEST_ACTIVE_CREDIT_CUSTOMER.customerId;
    const staticDeviceId = TEST_ACTIVE_CREDIT_CUSTOMER.deviceId;

    await clearAllRateLimitsForUser(staticOnmouuid);

    const tokenResponse = await createTestTokenRecord({
      scope: AUTH_SERVICES_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 5,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: staticOnmouuid,
      domain: "app",
    });

    try {
      const response = await invokeAuthorizeExtraScope(
        {
          onmouuid: staticOnmouuid,
          device_id: staticDeviceId,
          scope: MOBILE_NUMBER_CHANGE_SCOPE,
          code_challenge: TEST_CODE_CHALLENGE,
          new_phone_number: "+447700900123",
        },
        tokenResponse.access_token,
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as ExtraScopeAuthorizeSuccessResponse;
      expect(body).toHaveProperty("transaction_id");
      expect(body.next_endpoint).toEqual(`${body.transaction_id}/phone-change/initiate`);

      const queryRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
      });

      expect(queryRes.Count).toBe(1);
      const transaction = queryRes.Items![0];
      expect(transaction.auth_flow).toBe(EXTRA_SCOPE_AUTH_FLOW);
      expect(transaction.extra_scope_flow).toBe(PHONE_NUMBER_CHANGE_FLOW);
      expect(transaction.new_phone_number).toBe("+447700900123");
      expect(transaction.phone_validation_status).toBe("pending");

      await deleteTestTransaction(body.transaction_id);
    } finally {
      await deleteTestTokenRecord({
        token_id: tokenResponse.token_id,
        onmouuid: staticOnmouuid,
      });
    }
  });

  test("missing authorization header", async () => {
    const response = await invokeAuthorizeExtraScope({
      onmouuid: testOnmouuid,
      device_id: testDeviceId,
      scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
      code_challenge: TEST_CODE_CHALLENGE,
    });

    expect(response.status).toBe(401);
  });

  test("onmouuid in body does not match token", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: "different-onmouuid",
        device_id: testDeviceId,
        scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as ExtraScopeAuthorizeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("unsupported scope", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: "unsupported_scope",
        code_challenge: TEST_CODE_CHALLENGE,
      },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as ExtraScopeAuthorizeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("email change flow - missing new_email", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: EMAIL_ADDRESS_CHANGE_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ExtraScopeAuthorizeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("email change flow - invalid email format", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: EMAIL_ADDRESS_CHANGE_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
        new_email: "notanemail",
      },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ExtraScopeAuthorizeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("phone change flow - missing new_phone_number", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: MOBILE_NUMBER_CHANGE_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ExtraScopeAuthorizeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("phone change flow - invalid phone number format", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: MOBILE_NUMBER_CHANGE_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
        new_phone_number: "07700900123",
      },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as ExtraScopeAuthorizeErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("biometrics requested but no auth key record - falls through to passcode flow", async () => {
    const response = await invokeAuthorizeExtraScope(
      {
        onmouuid: testOnmouuid,
        device_id: testDeviceId,
        scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
        biometrics: true,
      },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as ExtraScopeAuthorizeSuccessResponse;
    expect(body).toHaveProperty("transaction_id");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/extra-scope/passcode/verify`);

    createdTransactionId = body.transaction_id;

    const queryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": createdTransactionId },
    });

    const transaction = queryRes.Items![0];
    expect(transaction.extra_scope_flow).toBe(EXTRA_SCOPE_PASSCODE_FLOW);
  });

  test("rate limited access", async () => {
    const testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const response = await invokeAuthorizeExtraScope(
        {
          onmouuid: testOnmouuid,
          device_id: testDeviceId,
          scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
          code_challenge: TEST_CODE_CHALLENGE,
        },
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
      action: "authorize",
    });

    try {
      const response = await invokeAuthorizeExtraScope(
        {
          onmouuid: testOnmouuid,
          device_id: testDeviceId,
          scope: TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
          code_challenge: TEST_CODE_CHALLENGE,
        },
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
