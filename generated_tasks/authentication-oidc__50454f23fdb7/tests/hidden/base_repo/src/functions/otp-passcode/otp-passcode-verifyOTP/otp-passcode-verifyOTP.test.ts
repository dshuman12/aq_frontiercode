import { beforeAll, afterAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  TestCreditAccountUserCreds,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
  deleteTestTransaction,
  createTestTransaction,
  createTestAuthHashRecord,
  createTestLegacyAuthRecords,
  deleteLegacyAuthRecord,
  deleteLegacyRSARecord,
  deleteTestAuthHashRecord,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  testModes,
} from "@libs/testUtils";
import {
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  FIVE_MINUTES,
  FIRST_TIME_LOGIN_FLOW,
  LOGIN_SCENARIO_FIRST_TIME_EXISTING_CUSTOMER,
  LOGIN_SCENARIO_FIRST_TIME_NEW_CUSTOMER,
  LOGIN_SCENARIO_FIRST_TIME_NEW_DEVICE,
  RELOGIN_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_AUTH_FLOW,
  OTP_SEND_LIMIT,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  AUTH_TRANSACTIONS_TABLE,
} from "@libs/config";
import { OTP_PASSCODE_OTP_VERIFY, OTP_PASSCODE_OTP_RESEND } from "../otp-passcode.constants";
import { TEST_CODE_CHALLENGE, TEST_NUMBER, TEST_PASSCODE } from "@libs/testConstants";

import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { invokeOTPPasscodeVerifyOTP } from "src/test-e2e/e2eTestUtils";

type SuccessRespBody = {
  next_endpoint: string;
  login_scenario?: string;
};
type ErrorRespBody = { message: string };
type UnprocessableRespBody = SuccessRespBody & { error_code: string };

const combinedScopes = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;

const happyPathAttrs = {
  create_refresh_token: true,
  otp_sms_verified: false,
  otp_sms_send_count: 1,
  otp_sms_attempt_count: 1,
  verify_code: 1111,
  phone_number: TEST_NUMBER,
  otp_sms_expiry_time: getCurrentTimestampInSeconds() + FIVE_MINUTES,
  auth_flow: OTP_PASSCODE_AUTH_FLOW,
  login_flow: FIRST_TIME_LOGIN_FLOW,
  passcode_verified: false,
  passcode_attempt_count: 0,
};

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testDeviceId: string;
let thisEndpoint: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
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
    await deleteLegacyAuthRecord(testCreditAccountUserCreds.customerId);
    await deleteLegacyRSARecord(testCreditAccountUserCreds.customerId);
    await deleteTestAuthHashRecord(testCreditAccountUserCreds.customerId);
  });

  test("happy path - supplied verify_code matches transaction verify_code", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `${testTransactionId}/otp-passcode/passcode/verify`;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord).toHaveProperty("verify_code");
    expect(transactionRecord).toHaveProperty("otp_sms_verified");
    expect(transactionRecord).toHaveProperty("passcode_verified");
    expect(transactionRecord).toHaveProperty("next_endpoint");
    expect(transactionRecord.verify_code).toEqual(1111);
    expect(transactionRecord.otp_sms_verified).toBe(true);
    expect(transactionRecord.passcode_verified).toBe(false);
    expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
    expect(transactionRecord.otp_sms_attempt_count).toBe(2);
    expect(transactionRecord.passcode_attempt_count).toBe(0);
  });

  test("happy path - verify_code match -> new customer scenario when user has no passcode records", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    expect(response.status).toBe(200);
    expect(body.next_endpoint).toEqual(`${testTransactionId}/otp-passcode/passcode/verify`);
    expect(body.login_scenario).toBe(LOGIN_SCENARIO_FIRST_TIME_NEW_CUSTOMER);
  });

  test("happy path - verify_code match -> new device scenario when user has existing passcode", async () => {
    await createTestAuthHashRecord({
      onmouuid: testCreditAccountUserCreds.customerId,
      passcode: TEST_PASSCODE,
    });
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    expect(response.status).toBe(200);
    expect(body.next_endpoint).toEqual(`${testTransactionId}/otp-passcode/passcode/verify`);
    expect(body.login_scenario).toBe(LOGIN_SCENARIO_FIRST_TIME_NEW_DEVICE);
  });

  test("happy path - verify_code match -> existing customer scenario when user has encrypted passcode records", async () => {
    await createTestLegacyAuthRecords({
      onmouuid: testCreditAccountUserCreds.customerId,
      passcode: TEST_PASSCODE,
    });
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    expect(response.status).toBe(200);
    expect(body.next_endpoint).toEqual(`${testTransactionId}/otp-passcode/passcode/verify`);
    expect(body.login_scenario).toBe(LOGIN_SCENARIO_FIRST_TIME_EXISTING_CUSTOMER);
  });

  test("missing phone_number in request", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing verify_code in request", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });

    const event = { phone_number: TEST_NUMBER };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing transaction", async () => {
    await deleteTestTransaction(testTransactionId);

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing passcode_attempt_count in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "passcode_attempt_count",
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("missing passcode_verified in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
    });
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "passcode_verified",
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("passcode_attempt_count > 0 in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        passcode_attempt_count: 1,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("passcode_verified=true in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        passcode_verified: true,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("phone_number in request != phone_number in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        phone_number: "fake-phone-number",
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test(`otp_sms_send_count > ${OTP_SEND_LIMIT} in transaction`, async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_send_count: OTP_SEND_LIMIT + 1,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test(`otp_sms_attempt_count >= ${OTP_ATTEMPT_LIMIT} in transaction`, async () => {
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

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).not.toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("OTP expired -> next_endpoint is resend OTP", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_expiry_time: getCurrentTimestampInSeconds() - FIVE_MINUTES,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as UnprocessableRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `${testTransactionId}/${OTP_PASSCODE_OTP_RESEND}`;

    expect(response.status).toBe(422);
    expect(body.error_code).toEqual(OTP_EXPIRED_RESEND);
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
    expect(transactionRecord.verify_code).toEqual(1111);
    expect(transactionRecord.otp_sms_verified).toBe(false);
    expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
  });

  test("OTP expired && otp_sms_send_count=limit -> next_endpoint is authorize/otp-passcode", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        otp_sms_send_count: 3,
        otp_sms_expiry_time: getCurrentTimestampInSeconds() - FIVE_MINUTES,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as UnprocessableRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `authorize/otp-passcode`;

    expect(response.status).toBe(422);
    expect(body.error_code).toEqual(OTP_EXPIRED_SEND_LIMIT_REACHED);
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("incorrect verify_code -> otp limit reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        verify_code: 1234,
        otp_sms_attempt_count: OTP_ATTEMPT_LIMIT - 1,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as UnprocessableRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `authorize/otp-passcode`;

    expect(response.status).toBe(422);
    expect(body.error_code).toEqual(OTP_INVALID_ATTEMPT_LIMIT_REACHED);
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("incorrect verify_code -> otp limit not reached", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: {
        ...happyPathAttrs,
        device_id: testDeviceId,
        next_endpoint: thisEndpoint,
        verify_code: 1234,
      },
    });

    const event = { phone_number: TEST_NUMBER, verify_code: 1111 };

    const response = await invokeOTPPasscodeVerifyOTP(event, testTransactionId);
    const body = (await response.json()) as UnprocessableRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    const nextEndpoint = `${testTransactionId}/${OTP_PASSCODE_OTP_VERIFY}`;

    expect(response.status).toBe(422);
    expect(body.error_code).toEqual(OTP_INVALID_REATTEMPT);
    expect(body.next_endpoint).toEqual(nextEndpoint);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
    expect(transactionRecord.verify_code).toEqual(1234);
    expect(transactionRecord.otp_sms_verified).toBe(false);
    expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
  });
});
