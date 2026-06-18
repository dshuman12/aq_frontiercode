import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  createTestTransaction,
  deleteTestTransaction,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  clearAllRateLimitsForUser,
  testModes,
} from "@libs/testUtils";
import {
  EXTRA_SCOPE_AUTH_FLOW,
  EMAIL_CHANGE_FLOW,
  AUTH_TRANSACTIONS_TABLE,
  ENV,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { handler } from "@functions/email-change/email-change-redirect/email-change-redirect";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
const testNewEmail = "testemail@example.com";
const testVerifyCode = "123456";

interface EmailChangeRedirectResponse {
  message?: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const createHandlerEvent = (transactionId: string, verifyCode: string, userAgent: string) => ({
  pathParameters: { transaction_id: transactionId },
  queryStringParameters: { verify_code: verifyCode },
  requestContext: { identity: { userAgent } },
  headers: {},
  body: null,
});

const callHandler = (event: any) => handler(event, {} as any);

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
      scope: "email_change",
      code_challenge: TEST_CODE_CHALLENGE,
    });

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EMAIL_CHANGE_FLOW,
        next_endpoint: `${testTransactionId}/email-change/redirect`,
        first_name: "Test",
        new_email: testNewEmail,
        device_id: testDeviceId,
        verify_code: testVerifyCode,
      },
    });
  });

  afterEach(async () => {
    await deleteTestTransaction(testTransactionId);
  });

  test("happy path - Android user agent redirects to app", async () => {
    const androidUserAgent =
      "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36";

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, androidUserAgent),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);
    expect(result.headers?.["Location"]).toBe(
      `onmoapp://UpdateEmailAddressOTP?verify_code=${testVerifyCode}`,
    );

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/email-change/validate`);
  });

  test("happy path - iPhone user agent redirects to app", async () => {
    const iOSUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, iOSUserAgent),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);
    expect(result.headers?.["Location"]).toBe(
      `onmoapp://UpdateEmailAddressOTP?verify_code=${testVerifyCode}`,
    );

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/email-change/validate`);
  });

  test("transaction not found", async () => {
    const result = await callHandler(
      createHandlerEvent("non-existent-transaction-id", testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeRedirectResponse)
        : (result.body as unknown as EmailChangeRedirectResponse);
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

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeRedirectResponse)
        : (result.body as unknown as EmailChangeRedirectResponse);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing auth_flow in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "auth_flow",
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "incorrect_flow" },
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("missing extra_scope_flow in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "extra_scope_flow",
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "incorrect_flow" },
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("missing new_email in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_email",
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("already validated email", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_status: "VALIDATED" },
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("missing next_endpoint in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "next_endpoint",
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "incorrect_endpoint" },
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeRedirectResponse)
        : (result.body as unknown as EmailChangeRedirectResponse);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing verify_code in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "verify_code",
    });

    const result = await callHandler(
      createHandlerEvent(testTransactionId, testVerifyCode, "Android"),
    );

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("missing verify_code in request", async () => {
    const result = await callHandler({
      pathParameters: { transaction_id: testTransactionId },
      queryStringParameters: {},
      requestContext: { identity: { userAgent: "Android" } },
      headers: {},
      body: null,
    });

    expect(result.statusCode).toBe(302);
    expect("Location" in (result.headers ?? {})).toBe(true);

    const expectedErrorUrl =
      ENV === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
    expect(result.headers?.["Location"]).toBe(expectedErrorUrl);
  });

  test("rate limited access", async () => {
    const androidUserAgent =
      "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36";

    let testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const result = await callHandler(
        createHandlerEvent(testTransactionId, testVerifyCode, androidUserAgent),
      );

      expect(result.statusCode).toBe(429);
      const body =
        typeof result.body === "string"
          ? (JSON.parse(result.body) as RateLimitedResponse)
          : (result.body as unknown as RateLimitedResponse);
      expect(body).toHaveProperty("expiry_time");
      expect(typeof body.expiry_time).toBe("number");
    } finally {
      if (testRateLimitRecordId && testOnmouuid) {
        await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
      }
    }
  });

  test("super rate limited access", async () => {
    const androidUserAgent =
      "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36";

    let testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
    });

    try {
      const result = await callHandler(
        createHandlerEvent(testTransactionId, testVerifyCode, androidUserAgent),
      );

      expect(result.statusCode).toBe(429);
      const body =
        typeof result.body === "string"
          ? (JSON.parse(result.body) as RateLimitedResponse)
          : (result.body as unknown as RateLimitedResponse);
      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toBe("no_expiry");
    } finally {
      if (testRateLimitRecordId && testOnmouuid) {
        await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
      }
    }
  });
});
