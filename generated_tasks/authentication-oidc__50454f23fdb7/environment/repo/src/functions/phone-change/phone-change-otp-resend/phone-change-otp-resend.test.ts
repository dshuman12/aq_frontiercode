import { beforeAll, afterAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  createTestTransaction,
  deleteTestTransaction,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
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
  PHONE_NUMBER_CHANGE_FLOW,
  AUTH_TRANSACTIONS_TABLE,
} from "@libs/config";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { handler } from "@functions/phone-change/phone-change-otp-resend/phone-change-otp-resend";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
const testNewPhoneNumber = "+447776661234";

interface PhoneChangeOtpResendSuccessResponse {
  message: string;
  next_endpoint: string;
  phone_number: string;
}

interface PhoneChangeOtpResendErrorResponse {
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

  afterAll(async () => {
    await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  });

  beforeEach(async () => {
    await clearAllRateLimitsForUser(testOnmouuid);

    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: "phone_change",
      code_challenge: TEST_CODE_CHALLENGE,
    });

    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        auth_flow: EXTRA_SCOPE_AUTH_FLOW,
        extra_scope_flow: PHONE_NUMBER_CHANGE_FLOW,
        next_endpoint: `${testTransactionId}/phone-change/otp/verify`,
        new_phone_number: testNewPhoneNumber,
        device_id: testDeviceId,
        otp_sms_attempt_count: 0,
        otp_sms_send_count: 1,
        otp_sms_expiry_time: getCurrentTimestampInSeconds() + 300,
        verify_code: 1234,
      },
    });
  });

  afterEach(async () => {
    await deleteTestTransaction(testTransactionId);
  });

  test("happy path - OTP resend successful", async () => {
    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(200);

    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as PhoneChangeOtpResendSuccessResponse)
        : (result.body as unknown as PhoneChangeOtpResendSuccessResponse);
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("phone_number");
    expect(body.message).toEqual("OTP resent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/verify`);
    expect(body.phone_number).toEqual(testNewPhoneNumber);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.otp_sms_send_count).toBe(2);
    expect(transaction.otp_sms_attempt_count).toBe(0);
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/phone-change/otp/verify`);
    expect(transaction.verify_code).toBeDefined();
    expect(transaction.otp_sms_expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
  });

  test("missing onmouuid from authorizer", async () => {
    const result = await callHandler({
      pathParameters: { transaction_id: testTransactionId },
      requestContext: { authorizer: {} },
      headers: {},
      body: null,
    });

    expect(result.statusCode).toBe(400);
  });

  test("transaction not found", async () => {
    const result = await callHandler(
      createHandlerEvent("non-existent-transaction-id", testOnmouuid),
    );

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("unauthorized - different onmouuid", async () => {
    const result = await callHandler(createHandlerEvent(testTransactionId, "different-onmouuid"));

    expect(result.statusCode).toBe(401);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing new_phone_number in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "new_phone_number",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing otp_sms_attempt_count in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_attempt_count",
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
    expect(transaction.otp_sms_attempt_count).toBe(0);
  });

  test("missing otp_sms_send_count in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_send_count",
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
    expect(transaction.otp_sms_send_count).toBe(1);
  });

  test("OTP attempt limit reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_attempt_count: 3 },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("OTP send limit reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_send_count: 3 },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(422);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as PhoneChangeOtpResendErrorResponse)
        : (result.body as unknown as PhoneChangeOtpResendErrorResponse);
    expect(body).toHaveProperty("error_code");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual("authorize/phone-change");
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

  test("test phone number gets test OTP code", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { new_phone_number: "+447776661111" },
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
