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
let testAccessToken: string;
let testTokenId: string;
const testNewPhoneNumber = "+447123456789";
const testEmail = "testemail@example.com";
const testVerifyCode = 123456;
interface PhoneChangeEmailVerifyErrorResponse {
  message: string;
  expiry_time?: number | string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const invokePhoneChangeEmailVerify = async (
  transactionId: string,
  token: string,
  verifyCode: number | string = testVerifyCode,
) => {
  const phone_change_email_verify_url = `https://${onmo_auth_url}/oidc/next/${transactionId}/phone-change/email/verify`;
  const response = await fetch(phone_change_email_verify_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-test-secret": api_test_secret,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ verify_code: verifyCode }),
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

  const currentTime = getCurrentTimestampInSeconds();
  const expiryTime = currentTime + 300; // 5 minutes in the future

  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      auth_flow: EXTRA_SCOPE_AUTH_FLOW,
      extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
      next_endpoint: `${testTransactionId}/phone-change/email/verify`,
      first_name: "Test",
      new_phone_number: testNewPhoneNumber,
      email: testEmail,
      verify_code: testVerifyCode,
      email_validation_expiry_time: expiryTime,
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

test("happy path - verification code accepted", async () => {
  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(200);

  const body = (await response.json()) as {
    message: string;
    next_endpoint: string;
    new_phone_number: string;
  };
  expect(body).toHaveProperty("message");
  expect(body).toHaveProperty("next_endpoint");
  expect(body).toHaveProperty("new_phone_number");
  expect(body.message).toEqual("Email verification successful");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/passcode/verify`);
  expect(body.new_phone_number).toEqual(testNewPhoneNumber);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).not.toHaveProperty("verify_code"); // verify_code should be removed
  expect(transaction).toHaveProperty("email_validation_verified_time");
  expect(transaction.email_validation_status).toEqual("VALIDATED");
  expect(transaction.next_endpoint).toEqual(`${testTransactionId}/extra-scope/passcode/verify`);
  expect(transaction.extra_scope_flow).toEqual(PHONE_NUMBER_CHANGE_FLOW); // Flow should remain as phone_number_change
  expect(transaction.verification_steps_completed).toContain("EMAIL_VALIDATED");
});

test("incorrect verification code", async () => {
  const wrongCode = 999999;
  const response = await invokePhoneChangeEmailVerify(
    testTransactionId,
    testAccessToken,
    wrongCode,
  );

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Incorrect verification code");

  // Verify transaction was not updated
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.email_validation_status).toEqual("pending");
  expect(transaction.extra_scope_flow).toEqual(PHONE_NUMBER_CHANGE_FLOW);
});

test("missing verification code in request", async () => {
  const response = await fetch(
    `https://${onmo_auth_url}/oidc/next/${testTransactionId}/phone-change/email/verify`,
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

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("transaction not found", async () => {
  const response = await invokePhoneChangeEmailVerify(
    "non-existent-transaction-id",
    testAccessToken,
  );

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("expired verification code", async () => {
  const pastTime = getCurrentTimestampInSeconds() - 100; // 100 seconds in the past
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { email_validation_expiry_time: pastTime },
  });

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("transaction has expired", async () => {
  const pastTime = getCurrentTimestampInSeconds() - 100;
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ttl: pastTime },
  });

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing new_phone_number in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "new_phone_number",
  });

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing verify_code in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "verify_code",
  });

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing email_validation_expiry_time in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "email_validation_expiry_time",
  });

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("email already validated", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { email_validation_status: "VALIDATED" },
  });

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
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

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
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

  const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

  expect(response.status).toBe(500);
  const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;
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
    const response = await invokePhoneChangeEmailVerify(testTransactionId, wrongScopeToken);

    expect(response.status).toBe(401);
    const body = (await response.json()) as PhoneChangeEmailVerifyErrorResponse;

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
    const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

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
    const response = await invokePhoneChangeEmailVerify(testTransactionId, testAccessToken);

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
