import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  createTestTransaction,
  deleteTestTransaction,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  clearAllRateLimitsForUser,
  testModes,
} from "@libs/testUtils";
import {
  EXTRA_SCOPE_AUTH_FLOW,
  EMAIL_CHANGE_FLOW,
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
  AUTH_TOKENS_TABLE,
  ENV,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeEmailChangeInitiate } from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testTokenId: string;
let testAccessToken: string;
const testNewEmail = "test@test.com";

interface EmailChangeInitiateSuccessResponse {
  message: string;
  next_endpoint: string;
  email: string;
}

interface EmailChangeInitiateErrorResponse {
  message: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
    testOnmouuid = testCreditAccountUserCreds.customerId;
  });

  beforeEach(async () => {
    // Clear any existing rate limits for the test user
    await clearAllRateLimitsForUser(testOnmouuid);

    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: "email_change",
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
        extra_scope_flow: EMAIL_CHANGE_FLOW,
        next_endpoint: `${testTransactionId}/email-change/initiate`,
        first_name: "Test",
        new_email: testNewEmail,
        device_id: testCreditAccountUserCreds.device_id,
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

  test("happy path - verification email sent", async () => {
    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(200);

    const body = (await response.json()) as EmailChangeInitiateSuccessResponse;
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("email");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/email-change/redirect`);
    expect(body.message).toEqual("Verification email sent successfully");
    expect(body.email).toEqual(testNewEmail);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).toHaveProperty("verify_code");
    expect(transaction).toHaveProperty("email_validation_expiry_time");
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/email-change/redirect`);
  });

  test("missing transaction_id", async () => {
    // Use a non-existent transaction ID to simulate missing transaction
    const response = await invokeEmailChangeInitiate("invalid-transaction-id", testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("transaction has expired", async () => {
    const pastTime = getCurrentTimestampInSeconds() - 100;
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: pastTime },
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing new_email in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_email",
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing first_name in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "first_name",
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "incorrect_flow" },
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "incorrect_flow" },
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "incorrect_endpoint" },
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing device_id in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "device_id",
    });

    const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("unauthorized access with wrong scope", async () => {
    const wrongScopeTokenResponse = await createTestTokenRecord({
      scope: "customer_profile",
      environment: ENV,
      expiryTimeMinutes: 5,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testOnmouuid,
      domain: "app",
    });

    const wrongScopeToken = wrongScopeTokenResponse.access_token;
    const wrongScopeTokenId = wrongScopeTokenResponse.token_id;

    try {
      const response = await invokeEmailChangeInitiate(testTransactionId, wrongScopeToken);

      expect(response.status).toBe(401);
      const body = (await response.json()) as EmailChangeInitiateErrorResponse;

      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Unauthorized");
    } finally {
      if (wrongScopeTokenId && testOnmouuid) {
        await deleteTestTokenRecord({
          token_id: wrongScopeTokenId,
          onmouuid: testOnmouuid,
        });
      }
    }
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
      const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;

      expect(body).toHaveProperty("expiry_time");
      expect(typeof body.expiry_time).toBe("number");
      expect(body.expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
    } finally {
      if (testRateLimitRecordId && testOnmouuid) {
        await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
      }
    }
  });

  test("super rate limited access", async () => {
    const testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
    });

    try {
      const response = await invokeEmailChangeInitiate(testTransactionId, testAccessToken);

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;

      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toBe("no_expiry");
    } finally {
      if (testRateLimitRecordId && testOnmouuid) {
        await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
      }
    }
  });
});
