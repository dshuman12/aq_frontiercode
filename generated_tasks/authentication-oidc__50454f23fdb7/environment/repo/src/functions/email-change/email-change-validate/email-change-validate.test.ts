import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
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
  testModes,
} from "@libs/testUtils";
import {
  EXTRA_SCOPE_AUTH_FLOW,
  EMAIL_CHANGE_FLOW,
  AUTH_SERVICES_SCOPE,
  AUTH_TRANSACTIONS_TABLE,
  AUTH_TOKENS_TABLE,
  ENV,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeEmailChangeValidate } from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
let testAccessToken: string;
const testNewEmail = "testemail@example.com";
const testVerifyCode = 123456;

interface EmailChangeValidateSuccessResponse {
  message: string;
  next_endpoint: string;
  new_email: string;
}

interface EmailChangeValidateErrorResponse {
  message: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
    testOnmouuid = testCreditAccountUserCreds.customerId;
    testDeviceId = testCreditAccountUserCreds.device_id;
  });

  beforeEach(async () => {
    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: "email_change",
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

    const currentTime = getCurrentTimestampInSeconds();
    const emailExpiryTime = currentTime + 300; // 5 minutes in the future

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EMAIL_CHANGE_FLOW,
        next_endpoint: `${testTransactionId}/email-change/validate`,
        first_name: "Test",
        new_email: testNewEmail,
        device_id: testDeviceId,
        verify_code: testVerifyCode,
        email_validation_expiry_time: emailExpiryTime,
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

  test("happy path - validation successful", async () => {
    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as EmailChangeValidateSuccessResponse;
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("new_email");
    expect(body.message).toEqual("Email verification successful");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/send`);
    expect(body.new_email).toEqual(testNewEmail);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.email_validation_status).toBe("VALIDATED");
    expect(transaction.verification_steps_completed).toContain("EMAIL_VALIDATED");
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/send`);
  });

  test("incorrect verification code", async () => {
    const incorrectVerifyCode = 999999;
    const response = await invokeEmailChangeValidate(
      testTransactionId,
      incorrectVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Incorrect verification code");
  });

  test("transaction not found", async () => {
    const nonExistentTransactionId = "non-existent-transaction-id";
    const response = await invokeEmailChangeValidate(
      nonExistentTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
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

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("verification code has expired", async () => {
    const pastTime = getCurrentTimestampInSeconds() - 100;
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_expiry_time: pastTime },
    });

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Verification code has expired");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "incorrect_flow" },
    });

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
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

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing verify_code in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "verify_code",
    });

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing email_validation_expiry_time in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "email_validation_expiry_time",
    });

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing new_email in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_email",
    });

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("already validated email", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { email_validation_status: "VALIDATED" },
    });

    const response = await invokeEmailChangeValidate(
      testTransactionId,
      testVerifyCode,
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as EmailChangeValidateErrorResponse;
    expect(body).toHaveProperty("message");
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
      const response = await invokeEmailChangeValidate(
        testTransactionId,
        testVerifyCode,
        testAccessToken,
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
    let testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "authorize",
    });

    try {
      const response = await invokeEmailChangeValidate(
        testTransactionId,
        testVerifyCode,
        testAccessToken,
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
});
