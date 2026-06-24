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
import { EXTRA_SCOPE_AUTH_FLOW, EMAIL_CHANGE_FLOW, AUTH_TRANSACTIONS_TABLE } from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { handler } from "@functions/email-change/email-change-email-resend/email-change-email-resend";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
const testNewEmail = "test@test.com";
const testFirstName = "John";

interface EmailChangeEmailResendSuccessResponse {
  message: string;
  next_endpoint: string;
  email: string;
}

interface EmailChangeEmailResendErrorResponse {
  message?: string;
  error_code?: string;
  next_endpoint?: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const createHandlerEvent = (transactionId: string, onmouuid: string) => ({
  pathParameters: { transaction_id: transactionId },
  requestContext: { authorizer: { onmouuid } },
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
        new_email: testNewEmail,
        first_name: testFirstName,
        device_id: testDeviceId,
        email_validation_attempt_count: 0,
        email_validation_send_count: 1,
        email_validation_expiry_time: getCurrentTimestampInSeconds() + 300,
        verify_code: 1234,
      },
    });
  });

  afterEach(async () => {
    await deleteTestTransaction(testTransactionId);
  });

  test("happy path - Email resend successful", async () => {
    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(200);

    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendSuccessResponse)
        : (result.body as unknown as EmailChangeEmailResendSuccessResponse);

    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("email");
    expect(body.message).toEqual("Verification email resent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/email-change/redirect`);
    expect(body.email).toEqual(testNewEmail);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.email_validation_send_count).toBe(2);
    expect(transaction.email_validation_attempt_count).toBe(0);
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/email-change/redirect`);
    expect(transaction.verify_code).toBeDefined();
    expect(transaction.email_validation_expiry_time).toBeGreaterThan(
      getCurrentTimestampInSeconds(),
    );
  });

  test("happy path - direct email_change auth flow", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: "email_change",
        extra_scope_flow: null,
      },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(200);

    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendSuccessResponse)
        : (result.body as unknown as EmailChangeEmailResendSuccessResponse);
    expect(body.message).toEqual("Verification email resent successfully");
  });

  test("happy path - first time send (send_count = 0)", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_send_count: 0 },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(200);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.email_validation_send_count).toBe(1);
  });

  test("missing onmouuid from authorizer", async () => {
    const result = await callHandler({
      pathParameters: { transaction_id: testTransactionId },
      requestContext: { authorizer: { onmouuid: "" } },
      headers: {},
      body: null,
    });

    expect(result.statusCode).toBe(401);
  });

  test("transaction not found", async () => {
    const result = await callHandler(
      createHandlerEvent("non-existent-transaction-id", testOnmouuid),
    );

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("unauthorized - different onmouuid", async () => {
    const result = await callHandler(createHandlerEvent(testTransactionId, "different-onmouuid"));

    expect(result.statusCode).toBe(401);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Unauthorized");
  });

  test("expired transaction", async () => {
    const pastTime = getCurrentTimestampInSeconds() - 100;
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: pastTime },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "incorrect_flow" },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: "incorrect_flow" },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing new_email in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_email",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "incorrect_endpoint" },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing first_name in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "first_name",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("email validation attempt limit reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_attempt_count: 3 },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("email validation send limit reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_send_count: 3 },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(422);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
        : (result.body as unknown as EmailChangeEmailResendErrorResponse);
    expect(body).toHaveProperty("error_code");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual("authorize/email-change");
  });

  test("backward compatibility - missing email validation counts", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "email_validation_attempt_count",
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "email_validation_send_count",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(200);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.email_validation_send_count).toBe(1);
    expect(transaction.email_validation_attempt_count).toBe(0);
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
      const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

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
    let testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
    });

    try {
      const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

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

  test("test email gets test verification code", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { new_email: "test@test.com" },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(200);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.verify_code).toBe(1111);
  });
});
