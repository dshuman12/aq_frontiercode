import { beforeEach, afterEach, test, expect, beforeAll } from "vitest";
import {
  TestCreditAccountUserCreds,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
  deleteTestTransaction,
  createTestTransaction,
  updateAttributesOnRecord,
  removeAttributeFromTransaction,
  deleteUserRecordInMobileTable,
  removeAttributeFromUserRecord,
  createUserRecordInMobileTable,
  generateUniqueIdentifier,
  updateTestCreditCustomerAccountState,
} from "@libs/testUtils";
import {
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  FIVE_MINUTES,
  COMPLETED_STATUS,
  FIRST_TIME_LOGIN_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  OTP_AUTH_FLOW,
  RELOGIN_FLOW,
} from "@libs/constants";
import {
  TEST_ACTIVE_CREDIT_CUSTOMER,
  TEST_ACTIVE_IN_ARREARS_CREDIT_CUSTOMER,
  TEST_CODE_CHALLENGE,
} from "@libs/testConstants";
import { deleteItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type SuccessRespBody = { next_endpoint: string };
type ErrorRespBody = { message: string };

const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const api_test_secret = process.env.API_TEST_SECRET as string;
const user_table = process.env.USER_TABLE as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

const INTENTIONALLY_DIFFERENT_TEST_NUMBER = "+447776669090";
const combinedScopes = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;

const happyPathAttrs = {
  create_refresh_token: true,
  login_flow: FIRST_TIME_LOGIN_FLOW,
  auth_flow: OTP_PASSCODE_AUTH_FLOW,
  otp_sms_send_count: 0,
  otp_sms_attempt_count: 0,
  otp_sms_verified: false,
  passcode_attempt_count: 0,
  passcode_verified: false,
};

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testCreditAccountId: string;
let testTransactionId: string;
let testDeviceId: string;
let testOnmouuid: string;
let thisEndpoint: string;

const invokeOTPPasscodeSendOTP = async (eventBody: any, transactionId?: string) => {
  const transaction_id = transactionId || testTransactionId;
  const otp_passcode_send_otp_url = `https://${onmo_auth_url}/oidc/next/${transaction_id}/otp-passcode/otp/send`;
  return await fetch(otp_passcode_send_otp_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-test-secret": api_test_secret },
    body: JSON.stringify(eventBody),
  });
};

beforeAll(async () => {
  const queryUserTableRes = await queryTableMethod({
    TableName: user_table,
    IndexName: "phonenumber-index",
    KeyConditionExpression: "phonenumber = :phonenumber",
    ExpressionAttributeValues: { ":phonenumber": INTENTIONALLY_DIFFERENT_TEST_NUMBER },
  });
  if (queryUserTableRes?.Items?.length) {
    for (const record of queryUserTableRes?.Items) {
      const { onmouuid } = record;
      await deleteItemMethod({ TableName: user_table, Key: { onmouuid } });
    }
  }
});

beforeEach(async () => {
  testCreditAccountUserCreds = await setUpTestCreditCustomerAccount({
    mobile_phone: INTENTIONALLY_DIFFERENT_TEST_NUMBER,
    onboarded_status: COMPLETED_STATUS,
  });
  testOnmouuid = testCreditAccountUserCreds.customerId;
  testCreditAccountId = testCreditAccountUserCreds.mambuCreditCardAccountID;
  testTransactionId = await createTestTransaction(
    {
      onmouuid: testOnmouuid,
      scope: combinedScopes,
      code_challenge: TEST_CODE_CHALLENGE,
    },
    false, // includeOnmouuid
  );
  testDeviceId = testCreditAccountUserCreds.device_id;
  thisEndpoint = `${testTransactionId}/otp-passcode/otp/send`;
});

afterEach(async () => {
  await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  await deleteTestTransaction(testTransactionId);
});

test("happy path - APPROVED credit account state", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  const nextEndpoint = `${testTransactionId}/otp-passcode/otp/verify`;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(nextEndpoint);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transactionRecord = queryTransactionsTableRes.Items![0];
  expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
  expect(transactionRecord.verify_code).toEqual(1111);
  expect(transactionRecord.otp_sms_verified).toBe(false);
  expect(transactionRecord.otp_sms_send_count).toBe(1);
  expect(transactionRecord.otp_sms_attempt_count).toBe(0);
  expect(transactionRecord.passcode_verified).toBe(false);
  expect(transactionRecord.passcode_attempt_count).toBe(0);
  expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
});

test("happy path - ACTIVE credit account state", async () => {
  const { customerId, deviceId, mobileNumber } = TEST_ACTIVE_CREDIT_CUSTOMER;

  const activeAccountTestTransactionId = await createTestTransaction(
    {
      onmouuid: customerId,
      scope: combinedScopes,
      code_challenge: TEST_CODE_CHALLENGE,
    },
    false, // includeOnmouuid
  );
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: activeAccountTestTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: deviceId,
      next_endpoint: `${activeAccountTestTransactionId}/otp-passcode/otp/send`,
    },
  });

  const event = { phone_number: mobileNumber };

  const response = await invokeOTPPasscodeSendOTP(event, activeAccountTestTransactionId);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": activeAccountTestTransactionId },
  });

  const nextEndpoint = `${activeAccountTestTransactionId}/otp-passcode/otp/verify`;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(nextEndpoint);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transactionRecord = queryTransactionsTableRes.Items![0];
  expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
  expect(transactionRecord.verify_code).toEqual(1111);
  expect(transactionRecord.otp_sms_verified).toBe(false);
  expect(transactionRecord.otp_sms_send_count).toBe(1);
  expect(transactionRecord.otp_sms_attempt_count).toBe(0);
  expect(transactionRecord.passcode_verified).toBe(false);
  expect(transactionRecord.passcode_attempt_count).toBe(0);
  expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);

  await deleteTestTransaction(activeAccountTestTransactionId);
});

test("happy path - ACTIVE_IN_ARREARS credit account state", async () => {
  const { customerId, deviceId, mobileNumber } = TEST_ACTIVE_IN_ARREARS_CREDIT_CUSTOMER;

  const activeAccountTestTransactionId = await createTestTransaction(
    {
      onmouuid: customerId,
      scope: combinedScopes,
      code_challenge: TEST_CODE_CHALLENGE,
    },
    false, // includeOnmouuid
  );
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: activeAccountTestTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: deviceId,
      next_endpoint: `${activeAccountTestTransactionId}/otp-passcode/otp/send`,
    },
  });

  const event = { phone_number: mobileNumber };

  const response = await invokeOTPPasscodeSendOTP(event, activeAccountTestTransactionId);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": activeAccountTestTransactionId },
  });

  const nextEndpoint = `${activeAccountTestTransactionId}/otp-passcode/otp/verify`;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(nextEndpoint);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transactionRecord = queryTransactionsTableRes.Items![0];
  expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
  expect(transactionRecord.verify_code).toEqual(1111);
  expect(transactionRecord.otp_sms_verified).toBe(false);
  expect(transactionRecord.otp_sms_send_count).toBe(1);
  expect(transactionRecord.otp_sms_attempt_count).toBe(0);
  expect(transactionRecord.passcode_verified).toBe(false);
  expect(transactionRecord.passcode_attempt_count).toBe(0);
  expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);

  await deleteTestTransaction(activeAccountTestTransactionId);
});

test("happy path - CLOSED credit account state", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await updateTestCreditCustomerAccountState({
    creditAccountId: testCreditAccountId,
    action: "WITHDRAW",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  const nextEndpoint = `${testTransactionId}/otp-passcode/otp/verify`;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(nextEndpoint);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transactionRecord = queryTransactionsTableRes.Items![0];
  expect(transactionRecord).toHaveProperty("otp_sms_expiry_time");
  expect(transactionRecord.verify_code).toEqual(1111);
  expect(transactionRecord.otp_sms_verified).toBe(false);
  expect(transactionRecord.otp_sms_send_count).toBe(1);
  expect(transactionRecord.otp_sms_attempt_count).toBe(0);
  expect(transactionRecord.passcode_verified).toBe(false);
  expect(transactionRecord.passcode_attempt_count).toBe(0);
  expect(transactionRecord.next_endpoint).toEqual(nextEndpoint);
});

test("happy path - transaction already exists for onmouuid with same scopes-> existing transaction deleted", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await createTestTransaction({
    onmouuid: testOnmouuid,
    scope: combinedScopes,
    code_challenge: TEST_CODE_CHALLENGE,
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testOnmouuid },
    ProjectionExpression: "transaction_id",
  });

  const nextEndpoint = `${testTransactionId}/otp-passcode/otp/verify`;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(nextEndpoint);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transactionRecord = queryTransactionsTableRes.Items![0];
  expect(transactionRecord.transaction_id).toEqual(testTransactionId);
});

test("missing phone_number in request", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = {};

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
  deleteTestTransaction(testTransactionId);

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("onmouuid in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      onmouuid: testOnmouuid,
    },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "auth_flow",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
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

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "login_flow",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
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

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
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

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "create_refresh_token",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "code_challenge",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "scope",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "device_id",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "otp_sms_send_count",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("otp_sms_send_count !== 0 in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_send_count: 1,
    },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromTransaction({
    transaction_id: testTransactionId,
    attributeName: "otp_sms_attempt_count",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("otp_sms_attempt_count !== 0 in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      otp_sms_attempt_count: 1,
    },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("phone_number already in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: thisEndpoint,
      phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER,
    },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
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

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
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
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: {
      ...happyPathAttrs,
      device_id: testDeviceId,
      next_endpoint: "fake-next-endpoint",
    },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing user record", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await deleteUserRecordInMobileTable(testOnmouuid);

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("user record not fully onboarded", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  removeAttributeFromUserRecord({ onmouuid: testOnmouuid, attributeName: "onboarded_status" });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("multiple fully onboarded user records share phone number", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  const duplicateNumberOnmouuid = generateUniqueIdentifier();
  await createUserRecordInMobileTable({
    onmouuid: duplicateNumberOnmouuid,
    onboarded_status: COMPLETED_STATUS,
    phonenumber: INTENTIONALLY_DIFFERENT_TEST_NUMBER,
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Something went wrong");
  expect(queryTransactionsTableRes.Count).toBe(0);

  await deleteUserRecordInMobileTable(duplicateNumberOnmouuid);
});

test("missing mambu credit account id in user record", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromUserRecord({
    onmouuid: testOnmouuid,
    attributeName: "mambuCreditCardAccountID",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("missing mambu client id in user record", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await removeAttributeFromUserRecord({
    onmouuid: testOnmouuid,
    attributeName: "mambuID",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("PENDING_APPROVAL credit account state", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await updateTestCreditCustomerAccountState({
    creditAccountId: testCreditAccountId,
    action: "UNDO_APPROVE",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("PARTIAL_APPLICATION credit account state", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });
  await updateTestCreditCustomerAccountState({
    creditAccountId: testCreditAccountId,
    action: "UNDO_APPROVE",
  });
  await updateTestCreditCustomerAccountState({
    creditAccountId: testCreditAccountId,
    action: "SET_INCOMPLETE",
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});

test("onmouuid in user table does not match in mambu client", async () => {
  await deleteUserRecordInMobileTable(testOnmouuid);
  const nonMatchingOnmouuid = generateUniqueIdentifier();
  await createUserRecordInMobileTable({
    onmouuid: nonMatchingOnmouuid,
    mambuCreditCardAccountID: testCreditAccountId,
    dev: testDeviceId,
    mambuID: testCreditAccountUserCreds.coreBankingCustomerId,
    phonenumber: INTENTIONALLY_DIFFERENT_TEST_NUMBER,
    onboarded_status: COMPLETED_STATUS,
  });
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { phone_number: INTENTIONALLY_DIFFERENT_TEST_NUMBER };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);

  deleteUserRecordInMobileTable(nonMatchingOnmouuid);
});

test("phonenumber in user table does not match in mambu client", async () => {
  await deleteUserRecordInMobileTable(testOnmouuid);
  const nonMatchingPhoneNumber = "+447776669095";
  await createUserRecordInMobileTable({
    onmouuid: testOnmouuid,
    mambuCreditCardAccountID: testCreditAccountId,
    dev: testDeviceId,
    mambuID: testCreditAccountUserCreds.coreBankingCustomerId,
    phonenumber: nonMatchingPhoneNumber,
    onboarded_status: COMPLETED_STATUS,
  });
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testTransactionId,
    attributes: { ...happyPathAttrs, device_id: testDeviceId, next_endpoint: thisEndpoint },
  });

  const event = { phone_number: nonMatchingPhoneNumber };

  const response = await invokeOTPPasscodeSendOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testTransactionId },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body).not.toHaveProperty("next_endpoint");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
});
