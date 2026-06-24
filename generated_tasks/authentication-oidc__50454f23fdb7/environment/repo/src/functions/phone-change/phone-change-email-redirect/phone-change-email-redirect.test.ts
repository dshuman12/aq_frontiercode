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
  AUTH_TRANSACTIONS_TABLE,
  AUTH_TOKENS_TABLE,
  ENV,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import {
  invokePhoneChangeEmailRedirect,
  onmo_auth_url,
  api_test_secret,
} from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testTokenId: string;
const testNewPhoneNumber = "+447123456789";
const testEmail = "testemail@example.com";
const testVerifyCode = "123456";

interface PhoneChangeEmailRedirectResponse {
  message?: string;
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

    testTokenId = tokenResponse.token_id;

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
        next_endpoint: `${testTransactionId}/phone-change/email/redirect`,
        first_name: "Test",
        new_phone_number: testNewPhoneNumber,
        email: testEmail,
        verify_code: testVerifyCode,
        email_validation_status: "pending",
        phone_validation_status: "verified",
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

  test("happy path - iOS user-agent redirects to app", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";

    // Log transaction before the test
    const beforeTestQuery = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });
    console.log("Transaction before test:", JSON.stringify(beforeTestQuery.Items?.[0], null, 2));

    const response = await invokePhoneChangeEmailRedirect(
      testTransactionId,
      iosUserAgent,
      testVerifyCode,
    );

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    if (response.status !== 302) {
      const body = await response.text();
      console.log("Response body:", body);
    }

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();
    expect(locationHeader).toEqual(
      `onmoapp://UpdatePhoneNumberPasscode?verify_code=${testVerifyCode}`,
    );

    // Verify transaction details to ensure the endpoint was updated
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/phone-change/email/verify`);
  });

  test("happy path - Android user-agent redirects to app", async () => {
    const androidUserAgent =
      "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36";
    const response = await invokePhoneChangeEmailRedirect(
      testTransactionId,
      androidUserAgent,
      testVerifyCode,
    );

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();
    expect(locationHeader).toEqual(
      `onmoapp://UpdatePhoneNumberPasscode?verify_code=${testVerifyCode}`,
    );
  });

  test("missing verify_code in query params", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    const phone_change_email_redirect_url = `https://${onmo_auth_url}/oidc/next/${testTransactionId}/phone-change/email/redirect`;

    const response = await fetch(phone_change_email_redirect_url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-test-secret": api_test_secret,
        "User-Agent": iosUserAgent,
      },
      redirect: "manual", // Don't follow redirects
    });

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(locationHeader).toEqual(expectedErrorUrl);
  });

  test("transaction not found", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    const response = await invokePhoneChangeEmailRedirect(
      "non-existent-transaction-id",
      iosUserAgent,
      testVerifyCode,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as PhoneChangeEmailRedirectResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("transaction has expired", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    const pastTime = getCurrentTimestampInSeconds() - 100;
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: pastTime },
    });

    const response = await invokePhoneChangeEmailRedirect(
      testTransactionId,
      iosUserAgent,
      testVerifyCode,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as PhoneChangeEmailRedirectResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing new_phone_number in transaction", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_phone_number",
    });

    const response = await invokePhoneChangeEmailRedirect(testTransactionId, iosUserAgent);

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(locationHeader).toEqual(expectedErrorUrl);
  });

  test("missing verify_code in transaction", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "verify_code",
    });

    const response = await invokePhoneChangeEmailRedirect(testTransactionId, iosUserAgent);

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(locationHeader).toEqual(expectedErrorUrl);
  });

  test("email already validated", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_status: "VALIDATED" },
    });

    const response = await invokePhoneChangeEmailRedirect(testTransactionId, iosUserAgent);

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(locationHeader).toEqual(expectedErrorUrl);
  });

  test("wrong auth_flow in transaction", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "incorrect_flow" },
    });

    const response = await invokePhoneChangeEmailRedirect(testTransactionId, iosUserAgent);

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(locationHeader).toEqual(expectedErrorUrl);
  });

  test("wrong extra_scope_flow in transaction", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "incorrect_flow" },
    });

    const response = await invokePhoneChangeEmailRedirect(testTransactionId, iosUserAgent);

    expect(response.status).toBe(302);
    const locationHeader = response.headers.get("location");
    expect(locationHeader).toBeDefined();

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(locationHeader).toEqual(expectedErrorUrl);
  });

  test("wrong next_endpoint in transaction", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "incorrect_endpoint" },
    });

    const response = await invokePhoneChangeEmailRedirect(
      testTransactionId,
      iosUserAgent,
      testVerifyCode,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as PhoneChangeEmailRedirectResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("rate limited access", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: `${testTransactionId}/phone-change/email/redirect` },
    });

    let testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const response = await invokePhoneChangeEmailRedirect(
        testTransactionId,
        iosUserAgent,
        testVerifyCode,
      );

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toHaveProperty("expiry_time");
    } finally {
      if (testRateLimitRecordId && testOnmouuid) {
        await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
      }
    }
  });

  test("super rate limited access", async () => {
    const iosUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15";

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: `${testTransactionId}/phone-change/email/redirect` },
    });

    let testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
    });

    try {
      const response = await invokePhoneChangeEmailRedirect(
        testTransactionId,
        iosUserAgent,
        testVerifyCode,
      );

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toEqual("no_expiry");
    } finally {
      if (testRateLimitRecordId && testOnmouuid) {
        await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
      }
    }
  });
});
