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
import { EXTRA_SCOPE_AUTH_FLOW, EMAIL_CHANGE_FLOW, AUTH_SERVICES_SCOPE } from "@libs/constants";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { handler } from "./email-change-redirect";

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const env = process.env.ENVIRONMENT as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const api_test_secret = process.env.API_TEST_SECRET as string;

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
const testNewEmail = "testemail@example.com";
const testVerifyCode = "123456";

interface EmailChangeRedirectResponse {
  message?: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const invokeEmailChangeRedirect = async (
  transactionId: string,
  verifyCode: string,
  userAgent: string,
  token?: string,
) => {
  const email_change_redirect_url = `https://${onmo_auth_url}/oidc/next/${transactionId}/email-change/redirect?verify_code=${verifyCode}`;

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    "x-api-test-secret": api_test_secret,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return await fetch(email_change_redirect_url, {
    method: "GET",
    headers,
    redirect: "manual",
  });
};

const createHandlerEvent = (transactionId: string, userAgent: string, verifyCode: string) => {
  return {
    pathParameters: { transaction_id: transactionId },
    requestContext: { identity: { userAgent } },
    queryStringParameters: { verify_code: verifyCode },
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
      first_name: "Test",
      new_email: testNewEmail,
      device_id: testDeviceId,
      verify_code: testVerifyCode,
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

test("happy path - Android user agent redirects to app", async () => {
  const androidUserAgent =
    "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36";

  const handlerEvent = createHandlerEvent(testTransactionId, androidUserAgent, testVerifyCode);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(302);
  expect(result.headers).toHaveProperty("Location");
  expect(result.headers.Location).toBe(
    `onmoapp://UpdateEmailAddressOTP?verify_code=${testVerifyCode}`,
  );

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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

  const handlerEvent = createHandlerEvent(testTransactionId, iOSUserAgent, testVerifyCode);
  const result = await handler(handlerEvent);

  expect(result.statusCode).toBe(302);
  expect(result.headers).toHaveProperty("Location");
  expect(result.headers.Location).toBe(
    `onmoapp://UpdateEmailAddressOTP?verify_code=${testVerifyCode}`,
  );

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.next_endpoint).toEqual(`${testTransactionId}/email-change/validate`);
});

test("transaction not found", async () => {
  const nonExistentTransactionId = "non-existent-transaction-id";
  const response = await invokeEmailChangeRedirect(
    nonExistentTransactionId,
    testVerifyCode,
    "Android",
  );

  expect(response.status).toBe(400);
  const body = (await response.json()) as EmailChangeRedirectResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("expired transaction", async () => {
  const pastTime = getCurrentTimestampInSeconds() - 100;
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ttl: pastTime },
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(400);
  const body = (await response.json()) as EmailChangeRedirectResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing auth_flow in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "auth_flow",
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("wrong auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { auth_flow: "incorrect_flow" },
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("missing extra_scope_flow in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "extra_scope_flow",
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("wrong extra_scope_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { extra_scope_flow: "incorrect_flow" },
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("missing new_email in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "new_email",
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("already validated email", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { email_validation_status: "VALIDATED" },
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("missing next_endpoint in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "next_endpoint",
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("wrong next_endpoint in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { next_endpoint: "incorrect_endpoint" },
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(400);
  const body = (await response.json()) as EmailChangeRedirectResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing verify_code in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "verify_code",
  });

  const response = await invokeEmailChangeRedirect(testTransactionId, testVerifyCode, "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("missing verify_code in request", async () => {
  // Pass an empty verify_code
  const response = await invokeEmailChangeRedirect(testTransactionId, "", "Android");

  expect(response.status).toBe(302);
  expect(response.headers.has("location")).toBe(true);

  const expectedErrorUrl = env === "prod" ? "https://onmo.app/500" : "https://staging.onmo.app/500";
  expect(response.headers.get("location")).toBe(expectedErrorUrl);
});

test("unauthorized access with wrong scope", async () => {
  const androidUserAgent =
    "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36";

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
    const response = await invokeEmailChangeRedirect(
      testTransactionId,
      testVerifyCode,
      androidUserAgent,
      wrongScopeToken,
    );

    expect(response.status).toBe(302);
    expect(response.headers.has("location")).toBe(true);
    expect(response.headers.get("location")).toBe(
      `onmoapp://UpdateEmailAddressOTP?verify_code=${testVerifyCode}`,
    );
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
  const androidUserAgent =
    "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36";

  // Create a rate limit record for the user
  let testRateLimitRecordId = await createTestRateLimitRecord({
    onmouuid: testOnmouuid,
    domain: "auth_extra_scope",
    action: "authorize",
    rate_limit_expiry_minutes: 5,
    record_expiry_minutes: 10,
  });

  try {
    const response = await invokeEmailChangeRedirect(
      testTransactionId,
      testVerifyCode,
      androidUserAgent,
    );

    expect(response.status).toBe(429);
    const body = (await response.json()) as RateLimitedResponse;
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
    const response = await invokeEmailChangeRedirect(
      testTransactionId,
      testVerifyCode,
      androidUserAgent,
    );

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
