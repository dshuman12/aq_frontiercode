import { beforeEach, afterEach, test, expect, inject } from "vitest";
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

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const env = process.env.ENVIRONMENT as string;
const onmo_auth_url = inject("apiURL") ?? (process.env.ONMO_AUTH_URL as string);
const api_test_secret = process.env.API_TEST_SECRET as string;

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testTokenId: string;
let testAccessToken: string;
const testEmail = "testemail@example.com";
const testNewPhoneNumber = "+1234567890";

interface PhoneChangeEmailSendSuccessResponse {
  message: string;
  next_endpoint: string;
  email_masked: string;
}

interface PhoneChangeEmailSendErrorResponse {
  message: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const invokePhoneChangeEmailSend = async (transactionId: string, token: string) => {
  const email_send_url = `https://${onmo_auth_url}/oidc/next/${transactionId}/phone-change/email/send`;
  const response = await fetch(email_send_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-test-secret": api_test_secret,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  return response;
};

beforeEach(async () => {
  testCreditAccountUserCreds = await setUpTestCreditCustomerAccount();
  testOnmouuid = testCreditAccountUserCreds.customerId;
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

  testAccessToken = tokenResponse.access_token;
  testTokenId = tokenResponse.token_id;

  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      auth_flow: EXTRA_SCOPE_AUTH_FLOW,
      extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
      next_endpoint: `${testTransactionId}/phone-change/email/send`,
      first_name: "Test",
      new_phone_number: testNewPhoneNumber,
      email: testEmail,
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

test("happy path - verification email sent", async () => {
  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(200);

  const body = (await response.json()) as PhoneChangeEmailSendSuccessResponse;
  expect(body).toHaveProperty("message");
  expect(body).toHaveProperty("next_endpoint");
  expect(body).toHaveProperty("email_masked");
  expect(body.message).toEqual("OTP sent successfully");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/email/redirect`);
  expect(body.email_masked).toEqual(`t*****l@example.com`);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("email_validation_expiry_time");
  expect(transaction.next_endpoint).toEqual(`${testTransactionId}/phone-change/email/redirect`);
  expect(transaction.email_validation_status).toEqual("pending");
});

test("missing transaction_id", async () => {
  const response = await fetch(
    `https://${onmo_auth_url}/oidc/next/undefined/phone-change/email/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-test-secret": api_test_secret,
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({}),
    },
  );

  expect(response.status).toBe(400);
});

test("unauthorized request", async () => {
  const response = await fetch(
    `https://${onmo_auth_url}/oidc/next/${testTransactionId}/phone-change/email/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-test-secret": api_test_secret,
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({}),
    },
  );

  expect(response.status).toBe(401);
});

test("transaction has expired", async () => {
  const pastTime = getCurrentTimestampInSeconds() - 100;
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ttl: pastTime },
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing new_phone_number in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "new_phone_number",
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing email in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "email",
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing first_name in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "first_name",
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("phone validation status not verified", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { phone_validation_status: "pending" },
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("wrong auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { auth_flow: "incorrect_flow" },
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("wrong extra_scope_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { extra_scope_flow: "incorrect_flow" },
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("wrong next_endpoint in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { next_endpoint: "incorrect_endpoint" },
  });

  const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("unauthorized access with wrong scope", async () => {
  const wrongScopeTokenResponse = await createTestTokenRecord({
    scope: "customer_profile",
    environment: env,
    expiryTimeMinutes: 5,
    tableName: auth_tokens_table,
    onmouuid: testOnmouuid,
    domain: "app",
  });

  const wrongScopeToken = wrongScopeTokenResponse.access_token;
  const wrongScopeTokenId = wrongScopeTokenResponse.token_id;

  try {
    const response = await invokePhoneChangeEmailSend(testTransactionId, wrongScopeToken);

    expect(response.status).toBe(401);
    const body = (await response.json()) as PhoneChangeEmailSendErrorResponse;

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
    const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

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
    const response = await invokePhoneChangeEmailSend(testTransactionId, testAccessToken);

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
