import { beforeEach, afterEach, test, expect } from "vitest";
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
} from "@libs/testUtils";
import {
  EXTRA_SCOPE_AUTH_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
  AUTH_SERVICES_SCOPE,
} from "@libs/constants";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { handler } from "./phone-change-email-resend";

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const env = process.env.ENVIRONMENT as string;

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
const testNewPhoneNumber = "+447776661234";
const testEmail = "test@test.com";
const testFirstName = "John";

interface PhoneChangeEmailResendSuccessResponse {
  message: string;
  next_endpoint: string;
  email_masked: string;
}

interface PhoneChangeEmailResendErrorResponse {
  message?: string;
  error_code?: string;
  next_endpoint?: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const createHandlerEvent = (transactionId: string, onmouuid: string) => {
  return {
    pathParameters: { transaction_id: transactionId },
    requestContext: { authorizer: { onmouuid } },
  };
};

beforeEach(async () => {
  testCreditAccountUserCreds = await setUpTestCreditCustomerAccount();
  testOnmouuid = testCreditAccountUserCreds.customerId;
  testDeviceId = testCreditAccountUserCreds.device_id;
  testTransactionId = await createTestTransaction({
    onmouuid: testOnmouuid,
    scope: "phone_change",
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
      extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
      next_endpoint: `${testTransactionId}/phone-change/email/redirect`,
      new_phone_number: testNewPhoneNumber,
      email: testEmail,
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendSuccessResponse)
      : (result.body as unknown as PhoneChangeEmailResendSuccessResponse);

  expect(body).toHaveProperty("message");
  expect(body).toHaveProperty("next_endpoint");
  expect(body).toHaveProperty("email_masked");
  expect(body.message).toEqual("Verification email resent successfully");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/email/redirect`);
  expect(body.email_masked).toEqual("t*****t@test.com");

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.email_validation_send_count).toBe(2);
  expect(transaction.email_validation_attempt_count).toBe(0);
  expect(transaction.next_endpoint).toEqual(`${testTransactionId}/phone-change/email/redirect`);
  expect(transaction.verify_code).toBeDefined();
  expect(transaction.email_validation_expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
});

test("missing transaction_id in path parameters", async () => {
  const handlerEvent = {
    pathParameters: {},
    requestContext: { authorizer: { onmouuid: testOnmouuid } },
  };

  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("missing onmouuid from authorizer", async () => {
  const handlerEvent = {
    pathParameters: { transaction_id: testTransactionId },
    requestContext: { authorizer: { onmouuid: "" } },
  };

  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("transaction not found", async () => {
  const nonExistentTransactionId = "non-existent-transaction-id";
  const handlerEvent = createHandlerEvent(nonExistentTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(400);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("unauthorized - different onmouuid", async () => {
  const differentOnmouuid = "different-onmouuid-123";
  const handlerEvent = createHandlerEvent(testTransactionId, differentOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(403);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("missing new_phone_number in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "new_phone_number",
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("missing email in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "email",
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
});

test("invalid email_validation_send_count - less than 1", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { email_validation_send_count: 0 },
  });

  const handlerEvent = createHandlerEvent(testTransactionId, testOnmouuid);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
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
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body).toHaveProperty("error_code");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual("authorize/phone-change");
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

  expect(result.statusCode).toBe(500);
  const body =
    typeof result.body === "string"
      ? (JSON.parse(result.body) as PhoneChangeEmailResendErrorResponse)
      : (result.body as unknown as PhoneChangeEmailResendErrorResponse);
  expect(body.message).toEqual("Something went wrong");
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
    attributes: { email: "test@test.com" },
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
