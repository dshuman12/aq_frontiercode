import { beforeEach, afterEach, test, expect, inject } from "vitest";
import {
  createTestTransaction,
  deleteTestTransaction,
  updateAttributesOnRecord,
  generateUniqueIdentifier,
  removeAttributeFromTransaction,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
} from "@libs/testUtils";
import {
  EXTRA_SCOPE_AUTH_FLOW,
  AUTH_SERVICES_SCOPE,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/constants";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const user_table = process.env.USER_TABLE as string;
const env = process.env.ENVIRONMENT as string;
const onmo_auth_url = inject("apiURL") ?? (process.env.ONMO_AUTH_URL as string);
const api_test_secret = process.env.API_TEST_SECRET as string;

let testTransactionId: string;
let testOnmouuid: string;
let testAccessToken: string;
let testTokenId: string;
const testNewPhoneNumber = "+447123456789";
const testVerifyCode = 123456;

interface PhoneChangeValidateOTPErrorResponse {
  message?: string;
  error_code?: string;
  next_endpoint?: string;
  expiry_time?: number;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const invokePhoneChangeValidateOTP = async (
  transactionId: string,
  token: string,
  verifyCode: number | string = testVerifyCode,
) => {
  const phone_change_validate_otp_url = `https://${onmo_auth_url}/oidc/next/${transactionId}/phone-change/otp/verify`;
  const response = await fetch(phone_change_validate_otp_url, {
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
  testOnmouuid = generateUniqueIdentifier();

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
    tableName: user_table,
    keyName: "onmouuid",
    keyValue: testOnmouuid,
    attributes: {
      mambuID: "test-mambu-id",
      email: "testemail@example.com",
    },
  });

  const currentTime = getCurrentTimestampInSeconds();
  const expiryTime = currentTime + 300;

  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      auth_flow: EXTRA_SCOPE_AUTH_FLOW,
      extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
      next_endpoint: `${testTransactionId}/phone-change/otp/verify`,
      first_name: "Test",
      new_phone_number: testNewPhoneNumber,
      verify_code: testVerifyCode,
      phone_validation_expiry_time: expiryTime,
      phone_validation_status: "pending",
      device_id: "test-device-id",
    },
  });
});

afterEach(async () => {
  try {
    await deleteTestTransaction(testTransactionId);

    if (testTokenId && testOnmouuid) {
      await deleteTestTokenRecord({
        token_id: testTokenId,
        onmouuid: testOnmouuid,
      });
    }
  } catch (error) {
    console.error("Error cleaning up test resources:", error);
  }
});

test("happy path - OTP verification successful", async () => {
  await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];

  expect(transaction.transaction_id).toEqual(testTransactionId);
});

test("incorrect verification code", async () => {
  const wrongCode = 999999;
  const response = await invokePhoneChangeValidateOTP(
    testTransactionId,
    testAccessToken,
    wrongCode,
  );

  expect(response.status).toBe(422);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("error_code");
  expect(body.error_code).toEqual("OTP_INVALID_REATTEMPT");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/verify`);

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.phone_validation_status).toEqual("pending");
  expect(transaction.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/verify`);
  expect(transaction.phone_validation_attempt_count).toEqual(1);
});

test("expired verification code", async () => {
  const pastTime = getCurrentTimestampInSeconds() - 100;
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      phone_validation_expiry_time: pastTime,
    },
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(422);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("error_code");
  expect(body.error_code).toEqual("OTP_EXPIRED_RESEND");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/send`);
});

test("missing verification code in request", async () => {
  const response = await fetch(
    `https://${onmo_auth_url}/oidc/next/${testTransactionId}/phone-change/otp/verify`,
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
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Missing verification code");
});

test("invalid request body", async () => {
  const response = await fetch(
    `https://${onmo_auth_url}/oidc/next/${testTransactionId}/phone-change/otp/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-test-secret": api_test_secret,
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: "{ invalid json",
    },
  );

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Could not process payload");
});

test("transaction not found", async () => {
  const nonExistentTransactionId = "non-existent-transaction-id";
  const response = await invokePhoneChangeValidateOTP(nonExistentTransactionId, testAccessToken);
  console.log(testAccessToken);
  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Transaction not found");
});

test("wrong auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      auth_flow: "incorrect_flow",
    },
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  // TODO: update to more appropriate status
  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("wrong extra_scope_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      extra_scope_flow: "incorrect_flow",
    },
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("wrong next_endpoint in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      next_endpoint: "incorrect_endpoint",
    },
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
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

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing verify_code in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "verify_code",
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing phone_validation_expiry_time in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "phone_validation_expiry_time",
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing new_phone_number in transaction", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "new_phone_number",
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("wrong phone_validation_status in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      phone_validation_status: "verified",
    },
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(400);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
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
    const response = await invokePhoneChangeValidateOTP(testTransactionId, wrongScopeToken);

    expect(response.status).toBe(401);
    const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;

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
    const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

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
    const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

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

test("OTP attempt limit reached - transaction voided", async () => {
  // Set the attempt count to one less than the limit
  const OTP_ATTEMPT_LIMIT = 5; // This should match the constant from your constants file
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      phone_validation_attempt_count: OTP_ATTEMPT_LIMIT - 1,
    },
  });

  const wrongCode = 999999;
  const response = await invokePhoneChangeValidateOTP(
    testTransactionId,
    testAccessToken,
    wrongCode,
  );

  expect(response.status).toBe(422);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("error_code");
  expect(body.error_code).toEqual("OTP_INVALID_ATTEMPT_LIMIT_REACHED");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/send`);

  // Verify transaction has been voided (deleted)
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("OTP expired with send limit reached - transaction voided", async () => {
  const OTP_SEND_LIMIT = 3; // This should match the constant from your constants file
  const pastTime = getCurrentTimestampInSeconds() - 100;

  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      phone_validation_expiry_time: pastTime,
      phone_validation_send_count: OTP_SEND_LIMIT,
    },
  });

  const response = await invokePhoneChangeValidateOTP(testTransactionId, testAccessToken);

  expect(response.status).toBe(422);
  const body = (await response.json()) as PhoneChangeValidateOTPErrorResponse;
  expect(body).toHaveProperty("error_code");
  expect(body.error_code).toEqual("OTP_EXPIRED_SEND_LIMIT_REACHED");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/send`);

  // Verify transaction has been voided (deleted)
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(0);
});
