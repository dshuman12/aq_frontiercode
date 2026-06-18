import { beforeEach, afterEach, test, expect } from "vitest";
import {
  UserCreds,
  createTestTransaction,
  deleteTestTransaction,
  deleteTestUser,
  expireTestTransaction,
  removeAttributeFromTransaction,
  setAuthCodeOnTestTransaction,
  setOtpVerifiedTestTransaction,
  setUpTestUser,
  updateAttributesOnRecord,
} from "@libs/testUtils";
import { APR_SCOPE, OTP_AUTH_FLOW, OTP_PASSCODE_AUTH_FLOW } from "@libs/constants";
import { TEST_AUTH_CODE, TEST_CODE_CHALLENGE } from "@libs/testConstants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

type SuccessRespBody = { auth_code: string; next_endpoint: string };
type ErrorRespBody = { message: string };

let testUserCreds: UserCreds;

const api_test_secret = process.env.API_TEST_SECRET as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

const happyPathAttrs = { auth_flow: OTP_AUTH_FLOW, otp_sms_verified: false, verify_code: 1111 };

const invokeVerifyOTP = async (bodyEvent: any) => {
  const verify_otp_url = `https://${onmo_auth_url}/oidc/next/${testUserCreds.transaction_id}/otp/verify`;

  return await fetch(verify_otp_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-test-secret": api_test_secret },
    body: JSON.stringify(bodyEvent),
  });
};

beforeEach(async () => {
  testUserCreds = await setUpTestUser();
  testUserCreds.scope = APR_SCOPE;
  testUserCreds.code_challenge = TEST_CODE_CHALLENGE;
  testUserCreds.transaction_id = await createTestTransaction(testUserCreds);
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testUserCreds.transaction_id,
    attributes: { ...happyPathAttrs },
  });
});

afterEach(async () => {
  await deleteTestUser(testUserCreds);
  await deleteTestTransaction(testUserCreds.transaction_id as string);
});

test("happy path - verifying OTP", async () => {
  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };

  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as SuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("auth_code");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(`${testUserCreds.transaction_id}/token`);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(true);
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
  expect(authCodeRecord.onmouuid).toEqual(testUserCreds.onmouuid);
  expect(authCodeRecord.scope).toEqual(testUserCreds.scope);
  expect(authCodeRecord.code_challenge).toEqual(testUserCreds.code_challenge);
  expect(authCodeRecord.transaction_id).toEqual(testUserCreds.transaction_id);
});

test("onmouuid missing in request body", async () => {
  const event = { verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(false);
});

test("verify_code missing in request body", async () => {
  const event = { onmouuid: testUserCreds.onmouuid };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(false);
});

test("no transaction exists", async () => {
  await deleteTestTransaction(testUserCreds.transaction_id as string);

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(0);
});

test("transaction has expired", async () => {
  await expireTestTransaction(testUserCreds.transaction_id as string);

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");

  // handle case of table ttl deleting record before tests
  if (queryTransactionsTableRes.Count) {
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).toHaveProperty("verify_code");
    expect(transaction).toHaveProperty("otp_sms_verified");
    expect(transaction).not.toHaveProperty("auth_code");
    expect(transaction.verify_code).toEqual(1111);
    expect(transaction.otp_sms_verified).toBe(false);
  }
});

test("transaction is missing onmouuid attribute", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    attributeName: "onmouuid",
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.otp_sms_verified).toBe(false);
});

test("provided onmouuid does not match in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testUserCreds.transaction_id,
    attributes: { onmouuid: "fake-onmouuid" },
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.otp_sms_verified).toBe(false);
});

test("transaction is missing auth_flow attribute", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    attributeName: "auth_flow",
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.otp_sms_verified).toBe(false);
});

test("incorrect auth_flow in transaction", async () => {
  await updateAttributesOnRecord({
    tableName: auth_transactions_table,
    keyName: "transaction_id",
    keyValue: testUserCreds.transaction_id,
    attributes: { auth_flow: OTP_PASSCODE_AUTH_FLOW },
  });
  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.otp_sms_verified).toBe(false);
});

test("transaction is missing verify_code attribute", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    attributeName: "verify_code",
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).not.toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.otp_sms_verified).toBe(false);
});

test("transaction is missing code_challenge attribute", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    attributeName: "code_challenge",
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(false);
});

test("transaction is missing scope attribute", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    attributeName: "scope",
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(false);
});

test("transaction is missing otp_sms_verified attribute (no otp been sent)", async () => {
  await removeAttributeFromTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    attributeName: "otp_sms_verified",
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).not.toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
});

test("transaction already has had otp verified", async () => {
  await setOtpVerifiedTestTransaction(testUserCreds.transaction_id as string);

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(true);
});

test("transaction has already been used for an auth code", async () => {
  await setOtpVerifiedTestTransaction(testUserCreds.transaction_id as string);
  await setAuthCodeOnTestTransaction({
    transaction_id: testUserCreds.transaction_id as string,
    auth_code: TEST_AUTH_CODE,
  });

  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1111 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Bad Request");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).toHaveProperty("auth_code");
  expect(transaction.auth_code).toBe(TEST_AUTH_CODE);
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(true);
});

test("incorrect OTP", async () => {
  const event = { onmouuid: testUserCreds.onmouuid, verify_code: 1234 };
  const response = await invokeVerifyOTP(event);
  const body = (await response.json()) as ErrorRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
  });

  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Invalid OTP");
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transaction = queryTransactionsTableRes.Items![0];
  expect(transaction).toHaveProperty("verify_code");
  expect(transaction).toHaveProperty("otp_sms_verified");
  expect(transaction).not.toHaveProperty("auth_code");
  expect(transaction.verify_code).toEqual(1111);
  expect(transaction.otp_sms_verified).toBe(false);
});
