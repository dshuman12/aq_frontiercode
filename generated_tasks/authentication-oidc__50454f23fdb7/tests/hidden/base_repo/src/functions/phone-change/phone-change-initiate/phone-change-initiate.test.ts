import { beforeAll, afterAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  createTestTransaction,
  deleteTestTransaction,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  testModes,
} from "@libs/testUtils";
import {
  EXTRA_SCOPE_AUTH_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
  AUTH_SERVICES_SCOPE,
  FIVE_MINUTES,
  AUTH_TRANSACTIONS_TABLE,
  AUTH_TOKENS_TABLE,
  ENV,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokePhoneChangeInitiate } from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testTokenId: string;
let testAccessToken: string;
const testPhoneNumber = "+447000000000";

interface PhoneChangeInitiateErrorResponse {
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

  afterAll(async () => {
    await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  });

  beforeEach(async () => {
    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: "phone_change",
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
        extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
        next_endpoint: `${testTransactionId}/phone-change/initiate`,
        first_name: "Test",
        new_phone_number: testPhoneNumber,
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

  test("happy path - OTP sent successfully", async () => {
    await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);

    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.transaction_id).toEqual(testTransactionId);

    expect(transaction).toHaveProperty("verify_code");
    expect(transaction).toHaveProperty("phone_validation_expiry_time");
    expect(transaction).toHaveProperty("phone_validation_status");
    expect(transaction.next_endpoint).toBe(`${testTransactionId}/phone-change/otp/verify`);
    expect(transaction.phone_validation_status).toBe("pending");

    expect(typeof transaction.verify_code).toBe("number");
    expect(transaction.verify_code.toString().length).toBe(4);

    const now = getCurrentTimestampInSeconds();
    const expectedExpiry = now + FIVE_MINUTES;
    expect(transaction.phone_validation_expiry_time).toBeGreaterThanOrEqual(now);
    expect(transaction.phone_validation_expiry_time).toBeLessThanOrEqual(expectedExpiry);
  });

  test("invalid phone number format", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        new_phone_number: "123456789",
      },
    });

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Invalid phone number format");
  });

  test("transaction not found", async () => {
    const response = await invokePhoneChangeInitiate(
      "non-existent-transaction-id",
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("expired transaction", async () => {
    const pastTime = getCurrentTimestampInSeconds() - 100;
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: pastTime },
    });

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing new_phone_number in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_phone_number",
    });

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing device_id in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "device_id",
    });

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
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

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
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

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
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

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing code_challenge in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "code_challenge",
    });

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing scope in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "scope",
    });

    const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

    expect(response.status).toBe(500);
    const body = (await response.json()) as PhoneChangeInitiateErrorResponse;
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
      const response = await invokePhoneChangeInitiate(testTransactionId, wrongScopeToken);

      expect(response.status).toBe(401);
      const body = (await response.json()) as PhoneChangeInitiateErrorResponse;

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
    let testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

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
    let testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
    });

    try {
      const response = await invokePhoneChangeInitiate(testTransactionId, testAccessToken);

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
