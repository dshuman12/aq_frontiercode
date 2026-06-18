import { beforeEach, afterEach, test, expect } from "vitest";
import {
  TestCreditAccountUserCreds,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
  deleteTestTransaction,
  createTestTransaction,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  createTestLegacyAuthRecords,
  deleteLegacyAuthRecord,
  deleteLegacyRSARecord,
  removeAttributeFromLegacyAuthTable,
  removeAttributeFromLegacyRSATable,
  createTestAuthHashRecord,
  deleteTestAuthHashRecord,
} from "@libs/testUtils";
import {
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  FIVE_MINUTES,
  RELOGIN_FLOW,
  FIRST_TIME_LOGIN_FLOW,
  OTP_AUTH_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_SEND_LIMIT,
  PASSCODE_ATTEMPT_LIMIT,
  OTP_ATTEMPT_LIMIT,
  PASSCODE_INVALID_REATTEMPT,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
} from "@libs/constants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import {
  TEST_AUTH_CODE,
  TEST_CODE_CHALLENGE,
  TEST_NUMBER,
  TEST_PASSCODE,
} from "@libs/testConstants";

type NextEndpoint = { next_endpoint: string };
type SuccessRespBody = { auth_code: string } & NextEndpoint;
type ErrorRespBody = { message: string };
type UnprocessableRespBody = NextEndpoint & { error_code: string };

const api_test_secret = process.env.API_TEST_SECRET as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_hashes_table = process.env.AUTH_HASHES_TABLE as string;
const legacy_auth_table = process.env.LEGACY_AUTH_TABLE as string;
const legacy_rsa_table = process.env.LEGACY_RSA_TABLE as string;

const combinedScopes = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;

const baseHappyPathAttrs = {
  passcode_attempt_count: 0,
  passcode_verified: false,
  create_refresh_token: true,
  auth_flow: OTP_PASSCODE_AUTH_FLOW,
};
const reloginHappyPathAttrs = { ...baseHappyPathAttrs, login_flow: RELOGIN_FLOW };
const firstTimeLoginHappyPathAttrs = {
  ...baseHappyPathAttrs,
  login_flow: FIRST_TIME_LOGIN_FLOW,
  otp_sms_verified: true,
  verify_code: 1111,
  phone_number: TEST_NUMBER,
  otp_sms_expiry_time: getCurrentTimestampInSeconds() + FIVE_MINUTES,
  otp_sms_send_count: 1,
  otp_sms_attempt_count: 1,
};

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testDeviceId: string;
let thisEndpoint: string;

const invokeOTPPasscodeVerifyPasscode = async (eventBody: any) => {
  const otp_passcode_verify_otp_url = `https://${onmo_auth_url}/oidc/next/${testTransactionId}/otp-passcode/passcode/verify`;
  return await fetch(otp_passcode_verify_otp_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-test-secret": api_test_secret },
    body: JSON.stringify(eventBody),
  });
};

beforeEach(async () => {
  testCreditAccountUserCreds = await setUpTestCreditCustomerAccount();
  testTransactionId = await createTestTransaction({
    onmouuid: testCreditAccountUserCreds.customerId,
    scope: combinedScopes,
    code_challenge: TEST_CODE_CHALLENGE,
  });
  testDeviceId = testCreditAccountUserCreds.device_id;
  thisEndpoint = `${testTransactionId}/otp-passcode/passcode/verify`;
  await createTestLegacyAuthRecords({
    onmouuid: testCreditAccountUserCreds.customerId,
    passcode: TEST_PASSCODE,
  });
});

afterEach(async () => {
  await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  await deleteTestTransaction(testTransactionId);
  await deleteLegacyAuthRecord(testCreditAccountUserCreds.customerId);
  await deleteLegacyRSARecord(testCreditAccountUserCreds.customerId);
  await deleteTestAuthHashRecord(testCreditAccountUserCreds.customerId);
});

test("happy path - relogin -> legacy app user with encrypted passcode is migrated and verified", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as SuccessRespBody;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("auth_code");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual("token");

  const queryLegacyAuthTableRes = await queryTableMethod({
    TableName: legacy_auth_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
  });
  expect(queryLegacyAuthTableRes.Count).toBe(0);

  const queryLegacyRsaTableRes = await queryTableMethod({
    TableName: legacy_rsa_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
  });
  expect(queryLegacyRsaTableRes.Count).toBe(0);

  const queryAuthHashesTableRes = await queryTableMethod({
    TableName: auth_hashes_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
  });
  expect(queryAuthHashesTableRes.Count).toBe(1);
  expect(queryAuthHashesTableRes.Items![0]).toHaveProperty("salt");
  expect(queryAuthHashesTableRes.Items![0]).toHaveProperty("hash");

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.login_flow).toEqual(RELOGIN_FLOW);
  expect(transaction.passcode_verified).toBe(true);
  expect(transaction.passcode_attempt_count).toBe(1);
  expect(transaction.auth_code).toEqual(body.auth_code);
});

test("happy path - relogin -> new app user with hashed passcode is verified", async () => {
  await Promise.all([
    deleteLegacyAuthRecord(testCreditAccountUserCreds.customerId),
    deleteLegacyRSARecord(testCreditAccountUserCreds.customerId),
    createTestAuthHashRecord({
      onmouuid: testCreditAccountUserCreds.customerId,
      passcode: TEST_PASSCODE,
    }),
  ]);
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as SuccessRespBody;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("auth_code");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual("token");

  const queryLegacyAuthTableRes = await queryTableMethod({
    TableName: legacy_auth_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
  });
  expect(queryLegacyAuthTableRes.Count).toBe(0);

  const queryLegacyRsaTableRes = await queryTableMethod({
    TableName: legacy_rsa_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
  });
  expect(queryLegacyRsaTableRes.Count).toBe(0);

  const queryAuthHashesTableRes = await queryTableMethod({
    TableName: auth_hashes_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
  });
  expect(queryAuthHashesTableRes.Count).toBe(1);
  expect(queryAuthHashesTableRes.Items![0]).toHaveProperty("salt");
  expect(queryAuthHashesTableRes.Items![0]).toHaveProperty("hash");

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction.login_flow).toEqual(RELOGIN_FLOW);
  expect(transaction.passcode_verified).toBe(true);
  expect(transaction.passcode_attempt_count).toBe(1);
  expect(transaction.auth_code).toEqual(body.auth_code);
});

test("happy path - relogin -> supplied passcode matches stored passcode", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("auth_code");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual("token");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("login_flow");
  expect(transaction).toHaveProperty("passcode_verified");
  expect(transaction).toHaveProperty("auth_code");
  expect(transaction).not.toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("verify_code");
  expect(transaction).not.toHaveProperty("phone_number");
  expect(transaction).not.toHaveProperty("otp_sms_expiry_time");
  expect(transaction.login_flow).toEqual(RELOGIN_FLOW);
  expect(transaction.passcode_verified).toBe(true);
  expect(transaction.passcode_attempt_count).toBe(1);
  expect(transaction.auth_code).toEqual(body.auth_code);

  const queryAuthCodesTableRes = await queryTableMethod({
    TableName: auth_codes_table,
    KeyConditionExpression: "auth_code = :auth_code",
    ExpressionAttributeValues: { ":auth_code": body.auth_code },
  });

  expect(queryAuthCodesTableRes.Count).toBe(1);
  const authCodeRecord = queryAuthCodesTableRes.Items![0];
  expect(authCodeRecord).toHaveProperty("onmouuid");
  expect(authCodeRecord).toHaveProperty("scope");
  expect(authCodeRecord).toHaveProperty("code_challenge");
  expect(authCodeRecord).toHaveProperty("transaction_id");
  expect(authCodeRecord).toHaveProperty("create_refresh_token");
  expect(authCodeRecord.onmouuid).toEqual(testCreditAccountUserCreds.customerId);
  expect(authCodeRecord.scope).toEqual(combinedScopes);
  expect(authCodeRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
  expect(authCodeRecord.transaction_id).toEqual(testTransactionId);
});

test("happy path - first time login -> supplied passcode matches stored passcode", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("auth_code");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual("token");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("login_flow");
  expect(transaction).toHaveProperty("passcode_verified");
  expect(transaction).toHaveProperty("auth_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("phone_number");
  expect(transaction).toHaveProperty("otp_sms_expiry_time");
  expect(transaction.login_flow).toEqual(FIRST_TIME_LOGIN_FLOW);
  expect(transaction.passcode_verified).toBe(true);
  expect(transaction.passcode_attempt_count).toBe(1);
  expect(transaction.auth_code).toEqual(body.auth_code);

  const queryAuthCodesTableRes = await queryTableMethod({
    TableName: auth_codes_table,
    KeyConditionExpression: "auth_code = :auth_code",
    ExpressionAttributeValues: { ":auth_code": body.auth_code },
  });

  expect(queryAuthCodesTableRes.Count).toBe(1);
  const authCodeRecord = queryAuthCodesTableRes.Items![0];
  expect(authCodeRecord).toHaveProperty("onmouuid");
  expect(authCodeRecord).toHaveProperty("scope");
  expect(authCodeRecord).toHaveProperty("code_challenge");
  expect(authCodeRecord).toHaveProperty("transaction_id");
  expect(authCodeRecord).toHaveProperty("create_refresh_token");
  expect(authCodeRecord.onmouuid).toEqual(testCreditAccountUserCreds.customerId);
  expect(authCodeRecord.scope).toEqual(combinedScopes);
  expect(authCodeRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
  expect(authCodeRecord.transaction_id).toEqual(testTransactionId);
});

test("missing passcode in request", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = {};

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("non-numeric characters in supplied passcode", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { passcode: "ABC123" };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("length of supplied passcode !== 6", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { passcode: "12345" };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing transaction", async () => {
  await deleteTestTransaction(testTransactionId);

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("missing onmouuid in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "onmouuid",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "auth_flow",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("invalid auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      auth_flow: OTP_AUTH_FLOW,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing login_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "login_flow",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("invalid login_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      login_flow: "invalid_login_flow",
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("transaction expired", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      ttl: getCurrentTimestampInSeconds() - FIVE_MINUTES,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing next_endpoint in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing create_refresh_token in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "create_refresh_token",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing passcode_verified in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "passcode_verified",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing passcode_attempt_count in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "passcode_attempt_count",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing code_challenge in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "code_challenge",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing scope in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "scope",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing device_id in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, next_endpoint: thisEndpoint },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("transaction already has auth_code", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      auth_code: TEST_AUTH_CODE,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("transaction already has passcode_verified=true", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      passcode_verified: true,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test(`passcode_attempt_count >= ${PASSCODE_ATTEMPT_LIMIT} in transaction`, async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      passcode_attempt_count: PASSCODE_ATTEMPT_LIMIT,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("incorrect next_endpoint in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: "fake-next-endpoint",
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> missing phone_number in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "phone_number",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> missing verify_code in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "verify_code",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> missing otp_sms_verified in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "otp_sms_verified",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> missing otp_sms_expiry_time in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "otp_sms_expiry_time",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> missing otp_sms_send_count in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "otp_sms_send_count",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> missing otp_sms_attempt_count in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
    },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "otp_sms_attempt_count",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> otp_sms_send_count < 1 in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_send_count: 0,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test(`first time login -> otp_sms_send_count > ${OTP_SEND_LIMIT} in transaction`, async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_send_count: OTP_SEND_LIMIT + 1,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test(`first time login -> otp_sms_send_count > ${OTP_SEND_LIMIT} in transaction`, async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_attempt_count: OTP_ATTEMPT_LIMIT + 1,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("first time login -> otp has not been verified", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...firstTimeLoginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_verified: false,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("relogin -> phone_number in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      phone_number: "fake-phone-number",
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("relogin -> verify_code in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      verify_code: "fake-verify-code",
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("relogin -> otp_sms_verified in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_verified: true,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("relogin -> otp_sms_expiry_time in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_expiry_time: "fake-otp-expiry-time",
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("relogin -> otp_sms_send_count in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_send_count: 1,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("relogin -> otp_sms_attempt_count in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_attempt_count: 1,
    },
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing passcode_enc_b64 in legacy_auth_table record", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromLegacyAuthTable({
    onmouuid: testCreditAccountUserCreds.customerId,
    attributeName: "passcode_enc_b64",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Something went wrong");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("missing priviv in legacy_rsa_table record", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromLegacyRSATable({
    onmouuid: testCreditAccountUserCreds.customerId,
    attributeName: "priviv",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Something went wrong");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("missing privatekey in legacy_rsa_table record", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromLegacyRSATable({
    onmouuid: testCreditAccountUserCreds.customerId,
    attributeName: "privatekey",
  });

  const event = { passcode: TEST_PASSCODE };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("auth_code");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Something went wrong");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("not final attempt -> supplied passcode does not match stored passcode", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...reloginHappyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const incorrectPasscode = "654321";
  const event = { passcode: incorrectPasscode };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as UnprocessableRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(422);
  expect(body.error_code).toEqual(PASSCODE_INVALID_REATTEMPT);
  expect(body).not.toHaveProperty("auth_code");
  expect(body.next_endpoint).toEqual(thisEndpoint);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.login_flow).toEqual(RELOGIN_FLOW);
  expect(transaction.passcode_verified).toBe(false);
  expect(transaction.passcode_attempt_count).toBe(1);
  expect(transaction.next_endpoint).toBe(thisEndpoint);
});

test("final attempt -> supplied passcode does not match stored passcode", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...reloginHappyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      passcode_attempt_count: PASSCODE_ATTEMPT_LIMIT - 1,
    },
  });

  const incorrectPasscode = "654321";
  const event = { passcode: incorrectPasscode };

  const response = await invokeOTPPasscodeVerifyPasscode(event);
  const body = (await response.json()) as UnprocessableRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  const authorize_endpoint = "authorize/otp-passcode";

  expect(response.status).toBe(422);
  expect(body.error_code).toEqual(PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED);
  expect(body).not.toHaveProperty("auth_code");
  expect(body.next_endpoint).toEqual(authorize_endpoint);
  expect(queryTransactionsTableRes.Count).toBe(0);
});
