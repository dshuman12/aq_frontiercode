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
import { handler } from "@functions/email-change/email-change-otp-resend/email-change-otp-resend";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;
let testDeviceId: string;
const testPhoneNumber = "+447776661234";

interface EmailChangeOtpResendSuccessResponse {
  message: string;
  next_endpoint: string;
  phone_number: string;
}

interface EmailChangeOtpResendErrorResponse {
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
        next_endpoint: `${testTransactionId}/extra-scope/otp/resend`,
        phone_number: testPhoneNumber,
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendSuccessResponse)
        : (result.body as unknown as EmailChangeOtpResendSuccessResponse);
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("phone_number");
    expect(body.message).toEqual("OTP resent successfully");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);
    expect(body.phone_number).toEqual(testPhoneNumber);

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction.otp_sms_send_count).toBe(2);
    expect(transaction.otp_sms_attempt_count).toBe(0);
    expect(transaction.next_endpoint).toEqual(`${testTransactionId}/extra-scope/otp/verify`);
    expect(transaction.verify_code).toBeDefined();
    expect(transaction.otp_sms_expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendSuccessResponse)
        : (result.body as unknown as EmailChangeOtpResendSuccessResponse);
    expect(body.message).toEqual("OTP resent successfully");
  });

  test("missing onmouuid from authorizer", async () => {
    const result = await callHandler({
      pathParameters: { transaction_id: testTransactionId },
      requestContext: { authorizer: {} },
      headers: {},
      body: null,
    });

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Bad Request");
  });

  test("transaction not found", async () => {
    const result = await callHandler(
      createHandlerEvent("non-existent-transaction-id", testOnmouuid),
    );

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Bad Request");
  });

  test("unauthorized - different onmouuid", async () => {
    const result = await callHandler(createHandlerEvent(testTransactionId, "different-onmouuid"));

    expect(result.statusCode).toBe(401);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing phone_number in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "phone_number",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(400);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Bad Request");
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing otp_sms_attempt_count in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_attempt_count",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing otp_sms_send_count in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_send_count",
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body.message).toEqual("Something went wrong");
  });

  test("invalid otp_sms_send_count - less than 1", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { otp_sms_send_count: 0 },
    });

    const result = await callHandler(createHandlerEvent(testTransactionId, testOnmouuid));

    expect(result.statusCode).toBe(500);
    const body =
      typeof result.body === "string"
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
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
        ? (JSON.parse(result.body) as EmailChangeOtpResendErrorResponse)
        : (result.body as unknown as EmailChangeOtpResendErrorResponse);
    expect(body).toHaveProperty("error_code");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual("authorize/email-change");
  });

  test("rate limited access", async () => {
    const testRateLimitRecordId = await createTestRateLimitRecord({
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
    const testRateLimitRecordId = await createTestSuperRateLimitRecord({
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
      attributes: { phone_number: "+447776661111" },
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
