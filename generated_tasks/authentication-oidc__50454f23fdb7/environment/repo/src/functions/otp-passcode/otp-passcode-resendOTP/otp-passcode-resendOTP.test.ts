import { beforeAll, afterAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  TestCreditAccountUserCreds,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
  deleteTestTransaction,
  createTestTransaction,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  testModes,
} from "@libs/testUtils";
import {
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  FIVE_MINUTES,
  COMPLETED_STATUS,
  FIRST_TIME_LOGIN_FLOW,
  OTP_SEND_LIMIT,
  OTP_ATTEMPT_LIMIT,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_AUTH_FLOW,
  RELOGIN_FLOW,
  OTP_SEND_LIMIT_REACHED,
  AUTH_TRANSACTIONS_TABLE,
} from "@libs/config";
import { OTP_PASSCODE_OTP_VERIFY, OTP_PASSCODE_OTP_RESEND } from "../otp-passcode.constants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { invokeOTPPasscodeResendOTP } from "src/test-e2e/e2eTestUtils";

type SuccessRespBody = { next_endpoint: string };
type ErrorRespBody = { message: string };
type OTPLimitRespBody = SuccessRespBody & { error_code: string };

const INTENTIONALLY_DIFFERENT_TEST_NUMBER = "+447776668080";
const combinedScopes = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;

const happyPathAttrs = {
  create_refresh_token: true,
  otp_sms_expiry_time: getCurrentTimestampInSeconds() + FIVE_MINUTES,
  otp_sms_send_count: 1,
  otp_sms_attempt_count: 1,
  otp_sms_verified: false,
  passcode_attempt_count: 0,
  passcode_verified: false,
  verify_code: 1111,
  phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER,
  login_flow: FIRST_TIME_LOGIN_FLOW,
  auth_flow: OTP_PASSCODE_AUTH_FLOW,
};

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testDeviceId: string;
let thisEndpoint: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: INTENTIONALLY_DIFFERENT_TEST_NUMBER,
      onboarded_status: COMPLETED_STATUS,
    });
    testDeviceId = testCreditAccountUserCreds.device_id;
  });

  afterAll(async () => {
    await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  });

  beforeEach(async () => {
    testTransactionId = await createTestTransaction({
      onmouuid: testCreditAccountUserCreds.customerId,
      scope: combinedScopes,
      code_challenge: TEST_CODE_CHALLENGE,
    });
    thisEndpoint = `${testTransactionId}/${OTP_PASSCODE_OTP_VERIFY}`;
  });

  afterEach(async () => {
    await deleteTestTransaction(testTransactionId);
  });

  test("happy path - first otp resend", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `${testTransactionId}/${OTP_PASSCODE_OTP_VERIFY}`;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
    expect(transactionRecord.verify_code).toEqual(1111);
    expect(transactionRecord.otp_sms_verified).toBe(false);
    expect(transactionRecord.otp_sms_send_count).toBe(2);
    expect(transactionRecord.otp_sms_attempt_count).toBe(0);
    expect(transactionRecord.passcode_verified).toBe(false);
    expect(transactionRecord.passcode_attempt_count).toBe(0);
    expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
  });

  test("happy path - final otp resend", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_send_count: 2,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `${testTransactionId}/${OTP_PASSCODE_OTP_VERIFY}`;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];

    expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
    expect(transactionRecord.verify_code).toEqual(1111);
    expect(transactionRecord.otp_sms_verified).toBe(false);
    expect(transactionRecord.otp_sms_send_count).toBe(3);
    expect(transactionRecord.otp_sms_attempt_count).toBe(0);
    expect(transactionRecord.passcode_verified).toBe(false);
    expect(transactionRecord.passcode_attempt_count).toBe(0);
    expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
  });

  test("happy path - next_endpoint on transaction is .../otp-passcode/otp/resend", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: `${testTransactionId}/${OTP_PASSCODE_OTP_RESEND}`,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `${testTransactionId}/${OTP_PASSCODE_OTP_VERIFY}`;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
    expect(transactionRecord.verify_code).toEqual(1111);
    expect(transactionRecord.otp_sms_verified).toBe(false);
    expect(transactionRecord.otp_sms_send_count).toBe(2);
    expect(transactionRecord.otp_sms_attempt_count).toBe(0);
    expect(transactionRecord.passcode_verified).toBe(false);
    expect(transactionRecord.passcode_attempt_count).toBe(0);
    expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
  });

  test("missing phone_number in request", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = {};

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing transaction", async () => {
    await deleteTestTransaction(testTransactionId);

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("missing onmouuid in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "onmouuid",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "auth_flow",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("incorrect auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        auth_flow: OTP_AUTH_FLOW,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing login_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "login_flow",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("incorrect login_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        login_flow: RELOGIN_FLOW,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("transaction expired", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        ttl: getCurrentTimestampInSeconds() - FIVE_MINUTES,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing create_refresh_token in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "create_refresh_token",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing phone_number in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "phone_number",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing verify_code in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "verify_code",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing otp_sms_verified in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_verified",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing otp_sms_expiry_time in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_expiry_time",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing otp_sms_send_count in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_send_count",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing otp_sms_attempt_count in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "otp_sms_attempt_count",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing code_challenge in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "code_challenge",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing scope in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "scope",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing device_id in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "device_id",
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("otp_sms_verified=true already in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_verified: true,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("auth_code already in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        auth_code: "fake-auth-code",
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("incorrect next_endpoint in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: "fake-next-endpoint",
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("incorrect phone_number in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        phone_number: "+447776668081",
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("already reached otp attempt limit in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_attempt_count: OTP_ATTEMPT_LIMIT,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("otp_sms_send_count < 1 in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_send_count: 0,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("reached otp send limit in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_send_count: OTP_SEND_LIMIT,
      },
    });

    const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

    const response = await invokeOTPPasscodeResendOTP(event, testTransactionId);
    const body = (await response.json()) as OTPLimitRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(422);
    expect(body.error_code).toEqual(OTP_SEND_LIMIT_REACHED);
    expect(body.next_endpoint).toEqual("authorize/otp-passcode");
    expect(queryTransactionsTableRes.Count).toBe(0);
  });
});
