import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  createTestTokenRecord,
  createTestTransaction,
  deleteTestRateLimitRecord,
  deleteTestTokenRecord,
  deleteTestTransaction,
  removeAttributeFromTransaction,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateAttributesOnRecord,
} from "@libs/testUtils";
import { AUTH_SERVICES_SCOPE, EMAIL_CHANGE_FLOW, EXTRA_SCOPE_AUTH_FLOW } from "@libs/constants";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { handler, HandlerEvent } from "./email-change-email-resend";

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const env = process.env.ENVIRONMENT as string;

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
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

const createHandlerEvent = (transactionId: string, onmouuid: string): HandlerEvent => {
  return {
    pathParameters: { transaction_id: transactionId },
    requestContext: { authorizer: { onmouuid } },
    body: "",
  };
};

beforeEach(async () => {
  testCreditAccountUserCreds = await setUpTestCreditCustomerAccount();
  testOnmouuid = testCreditAccountUserCreds.customerId;
  testDeviceId = testCreditAccountUserCreds.device_id;
  testTransactionId = await createTestTransaction({
    onmouuid: testOnmouuid,
    scope: "email_change",
    code_challenge: TEST_CODE_CHALLENGE,
  });

  const tokenResponse = await createTestTokenRecord({
    scope: AUTH_SERVICES_SCOPE,
    environment: env,
    expiryTimeMinutes: 5,
    tableName: auth_tokens_table,
    onmouuid: testOnmouuid,
    domain: "app",
  });

  testTokenId = tokenResponse.token_id;

  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
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

  if (testTokenId && testOnmouuid) {
    await deleteTestTokenRecord({
      token_id: testTokenId,
      onmouuid: testOnmouuid,
    });
  }
});

test("happy path - Email resend successful", async () => {
  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

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
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.email_validation_send_count).toBe(2);
  expect(transaction.email_validation_attempt_count).toBe(0);
  expect(transaction.next_endpoint).toEqual(`${testTransactionId}/email-change/redirect`);
  expect(transaction.verify_code).toBeDefined();
  expect(transaction.email_validation_expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
});

test("happy path - direct email_change auth flow", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      auth_flow: "email_change",
      extra_scope_flow: null,
    },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(200);

  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendSuccessResponse)
      : (result.body as unknown as EmailChangeEmailResendSuccessResponse);
  expect(body.message).toEqual("Verification email resent successfully");
});

test("happy path - first time send (send_count = 0)", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      email_validation_send_count: 0,
    },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(200);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.email_validation_send_count).toBe(1);
});

test("missing transaction_id in path parameters", async () => {
  const handlerEvent = createHandlerEvent("", testOnmouuid);

  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("missing onmouuid from authorizer", async () => {
  const handlerEvent = createHandlerEvent(testTransactionId, "");

  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("transaction not found", async () => {
  const nonExistentTransactionId = "non-existent-transaction-id";
  const handlerEvent = createHandlerEvent(nonExistentTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(400);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("unauthorized - different onmouuid", async () => {
  const differentOnmouuid = "different-onmouuid-123";
  const handlerEvent = createHandlerEvent(testTransactionId, differentOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(403);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Unauthorized");
});

test("expired transaction", async () => {
  const pastTime = getCurrentTimestampInSeconds() - 100;
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ttl: pastTime },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(400);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("wrong auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { auth_flow: "incorrect_flow" },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(400);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("wrong extra_scope_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { extra_scope_flow: "incorrect_flow" },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

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

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("wrong next_endpoint in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { next_endpoint: "incorrect_endpoint" },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

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

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("email validation attempt limit reached", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { email_validation_attempt_count: 3 },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as EmailChangeEmailResendErrorResponse)
      : (result.body as unknown as EmailChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("email validation send limit reached", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { email_validation_send_count: 3 },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

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

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(200);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
    const result = await handler(handlerEvent);

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
    const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
    const result = await handler(handlerEvent);

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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { new_email: "test@test.com" },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(200);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.verify_code).toBe(1111);
});
