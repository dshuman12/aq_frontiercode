import { beforeEach, afterEach, test, expect } from "vitest";
import {
  UserCreds,
  createRecordInAprIncreasesTable,
  deleteRecordInAprIncreasesTable,
  deleteTestTransaction,
  deleteTestUser,
  deleteUserRecordInMobileTable,
  removeAttributeFromUserRecord,
  setUpTestUser,
} from "@libs/testUtils";
import { APR_SCOPE, OTP_AUTH_FLOW } from "@libs/constants";
import {
  AuthorizeErrorRespBody,
  AuthorizeSuccessRespBody,
  TEST_CODE_CHALLENGE,
} from "@libs/testConstants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

const api_test_secret = process.env.API_TEST_SECRET as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

const authorize_otp_url = `https://${onmo_auth_url}/oidc/next/authorize/otp`;

let testUserCreds: UserCreds;

const invokeAuthorizeOTP = async (eventBody: any) => {
  return await fetch(authorize_otp_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-test-secret": api_test_secret },
    body: JSON.stringify(eventBody),
  });
};

beforeEach(async () => {
  testUserCreds = await setUpTestUser();
  await createRecordInAprIncreasesTable(testUserCreds.onmouuid as string);
});

afterEach(async () => {
  await deleteTestUser(testUserCreds);
  await deleteRecordInAprIncreasesTable(testUserCreds.onmouuid as string);
});

test("happy path - transaction created", async () => {
  const event = {
    code_challenge: TEST_CODE_CHALLENGE,
    scope: APR_SCOPE,
    onmouuid: testUserCreds.onmouuid,
  };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeSuccessRespBody;

  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    KeyConditionExpression: "transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
  });

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("transaction_id");
  expect(body).toHaveProperty("next_endpoint");
  expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp/send`);
  expect(queryTransactionsTableRes.Count).toBe(1);
  const transactionRecord = queryTransactionsTableRes?.Items![0];
  expect(transactionRecord.onmouuid).toEqual(testUserCreds.onmouuid);
  expect(transactionRecord.scope).toEqual(APR_SCOPE);
  expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
  expect(transactionRecord.auth_flow).toEqual(OTP_AUTH_FLOW);

  await deleteTestTransaction(body.transaction_id);
});

test("user not eligible for apr scope", async () => {
  await deleteRecordInAprIncreasesTable(testUserCreds.onmouuid as string);
  const event = {
    code_challenge: TEST_CODE_CHALLENGE,
    scope: APR_SCOPE,
    onmouuid: testUserCreds.onmouuid,
  };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing onmouuid in request", async () => {
  const event = { code_challenge: TEST_CODE_CHALLENGE, scope: APR_SCOPE };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing code_challenge in request", async () => {
  const event = { scope: APR_SCOPE, onmouuid: testUserCreds.onmouuid };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("missing scope in request", async () => {
  const event = { code_challenge: TEST_CODE_CHALLENGE, onmouuid: testUserCreds.onmouuid };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("unsupported scope in request", async () => {
  const event = {
    code_challenge: TEST_CODE_CHALLENGE,
    scope: "invalid_scope",
    onmouuid: testUserCreds.onmouuid,
  };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("user record not found in mobile-${environment} table", async () => {
  await deleteUserRecordInMobileTable(testUserCreds.onmouuid as string);
  const event = {
    code_challenge: TEST_CODE_CHALLENGE,
    scope: APR_SCOPE,
    onmouuid: testUserCreds.onmouuid,
  };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});

test("no mambuID on user record", async () => {
  await removeAttributeFromUserRecord({
    onmouuid: testUserCreds.onmouuid as string,
    attributeName: "mambuID",
  });
  const event = {
    code_challenge: TEST_CODE_CHALLENGE,
    scope: APR_SCOPE,
    onmouuid: testUserCreds.onmouuid,
  };

  const response = await invokeAuthorizeOTP(event);
  const body = (await response.json()) as AuthorizeErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toEqual("Something went wrong");
});
