import { beforeAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import { createSign, randomBytes } from "crypto";
import {
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  createTestTokenRecord,
  deleteTestTokenRecord,
  createTestTransaction,
  deleteTestTransaction,
  updateAttributesOnRecord,
  createTestAuthKeyRecord,
  deleteTestAuthKeyRecord,
  createTestRateLimitRecord,
  deleteTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  clearAllRateLimitsForUser,
  testModes,
} from "@libs/testUtils";
import {
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
  AUTH_CODES_TABLE,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  EXTRA_SCOPE_BIOMETRICS_FLOW,
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { deleteItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeBiometricsVerify } from "src/test-e2e/e2eTestUtils";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testOnmouuid: string;
let testDeviceId: string;
let testTokenId: string;
let testAccessToken: string;
let testTransactionId: string;
let testPrivateKey: string;
let testUnsignedChallenge: string;
let createdAuthCode: string | null = null;

interface VerifyBiometricsSuccessResponse {
  auth_code: string;
  next_endpoint: string;
}

interface VerifyBiometricsErrorResponse {
  message?: string;
}

interface RateLimitedResponse {
  expiry_time: number | "no_expiry";
}

const signChallenge = (challenge: string, privateKey: string): string => {
  const signer = createSign("RSA-SHA256");
  signer.update(challenge);
  return signer.sign(privateKey, "base64");
};

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
    testOnmouuid = testCreditAccountUserCreds.customerId;
    testDeviceId = testCreditAccountUserCreds.device_id;
  });

  beforeEach(async () => {
    createdAuthCode = null;

    await clearAllRateLimitsForUser(testOnmouuid);

    const { fe_public_key, privateKey } = await createTestAuthKeyRecord({
      onmouuid: testOnmouuid,
      device_id: testDeviceId,
    });
    testPrivateKey = privateKey;

    testUnsignedChallenge = randomBytes(64).toString("base64");

    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: AUTH_SERVICES_SCOPE,
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

    // Matches the transaction state written by extra-scope-authorize for the biometrics flow
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: EXTRA_SCOPE_BIOMETRICS_FLOW,
        next_endpoint: `${testTransactionId}/extra-scope/biometrics/verify`,
        device_id: testDeviceId,
        unsigned_challenge: testUnsignedChallenge,
        fe_public_key,
        biometrics_verified: false,
        create_refresh_token: false,
      },
    });
  });

  afterEach(async () => {
    if (createdAuthCode) {
      await deleteItemMethod({
        TableName: AUTH_CODES_TABLE,
        Key: { auth_code: createdAuthCode },
      });
      createdAuthCode = null;
    }

    await deleteTestTransaction(testTransactionId);
    await deleteTestAuthKeyRecord(testOnmouuid);

    if (testTokenId && testOnmouuid) {
      await deleteTestTokenRecord({
        token_id: testTokenId,
        onmouuid: testOnmouuid,
      });
    }
  });

  test("happy path - biometrics verified, auth code issued", async () => {
    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as VerifyBiometricsSuccessResponse;
    expect(body).toHaveProperty("auth_code");
    expect(body.next_endpoint).toEqual("token");

    createdAuthCode = body.auth_code;

    // Transaction should be updated
    const txQueryRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });
    expect(txQueryRes.Count).toBe(1);
    const transaction = txQueryRes.Items![0];
    expect(transaction.biometrics_verified).toBe(true);
    expect(transaction.auth_code).toBe(body.auth_code);
    expect(transaction.next_endpoint).toEqual("token");

    // Auth code record should be created
    const codeQueryRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": body.auth_code },
    });
    expect(codeQueryRes.Count).toBe(1);
    const authCodeRecord = codeQueryRes.Items![0];
    expect(authCodeRecord.onmouuid).toBe(testOnmouuid);
    expect(authCodeRecord.transaction_id).toBe(testTransactionId);
    expect(authCodeRecord.scope).toBe(AUTH_SERVICES_SCOPE);
    expect(authCodeRecord.code_challenge).toBe(TEST_CODE_CHALLENGE);
    expect(authCodeRecord.create_refresh_token).toBe(false);
    expect(authCodeRecord.ttl).toBeGreaterThan(getCurrentTimestampInSeconds());
  });

  test("transaction not found", async () => {
    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      "non-existent-transaction-id",
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing authorization header", async () => {
    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(testTransactionId, {
      signed_challenge,
      device_id: testDeviceId,
    });

    expect(response.status).toBe(401);
  });

  test("token onmouuid does not match transaction onmouuid", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { onmouuid: "different-onmouuid" },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: "wrong_flow" },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong extra_scope_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { extra_scope_flow: EXTRA_SCOPE_OTP_PASSCODE_FLOW },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("expired transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ttl: getCurrentTimestampInSeconds() - 100 },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("create_refresh_token is true in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { create_refresh_token: true },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("device_id in request does not match transaction device_id", async () => {
    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: "wrong-device-id" },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("biometrics already verified", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { biometrics_verified: true },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("auth_code already present in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_code: "some_auth_code" },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("wrong next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { next_endpoint: "unexpected/next/endpoint" },
    });

    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("invalid signed_challenge - signature does not match", async () => {
    const wrongPrivateKey = randomBytes(64).toString("base64");

    const response = await invokeBiometricsVerify(
      testTransactionId,
      { signed_challenge: wrongPrivateKey, device_id: testDeviceId },
      testAccessToken,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as VerifyBiometricsErrorResponse;
    expect(body.message).toEqual("Something went wrong");
  });

  test("rate limited access", async () => {
    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "biometrics_verify",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

    try {
      const response = await invokeBiometricsVerify(
        testTransactionId,
        { signed_challenge, device_id: testDeviceId },
        testAccessToken,
      );

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(typeof body.expiry_time).toBe("number");
    } finally {
      await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
    }
  });

  test("super rate limited access", async () => {
    const signed_challenge = signChallenge(testUnsignedChallenge, testPrivateKey);

    const testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid: testOnmouuid,
      domain: "auth_extra_scope",
      action: "biometrics_verify",
    });

    try {
      const response = await invokeBiometricsVerify(
        testTransactionId,
        { signed_challenge, device_id: testDeviceId },
        testAccessToken,
      );

      expect(response.status).toBe(429);
      const body = (await response.json()) as RateLimitedResponse;
      expect(body).toHaveProperty("expiry_time");
      expect(body.expiry_time).toBe("no_expiry");
    } finally {
      await deleteTestRateLimitRecord(testRateLimitRecordId, testOnmouuid);
    }
  });
});
