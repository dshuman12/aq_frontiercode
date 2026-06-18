import { beforeEach, afterEach, test, expect } from "vitest";
import {
  UserCreds,
  createTestTokenRecord,
  createUserRecordInMobileTable,
  deleteTestTokenRecord,
  deleteUserRecordInMobileTable,
  generateUniqueIdentifier,
} from "@libs/testUtils";
import { CUSTOMER_CARE_SCOPE, LOAN_ACCOUNT_ID_SCOPE } from "@libs/constants";
import { TEST_LOAN_ACCOUNT_ID } from "@libs/testConstants";

type InvokeUserInfoInput = { onmouuid?: string; access_token?: string };
type SuccessRespBody = { loanAccountId: string };
type ErrorRespBody = { message: string };

const api_test_secret = process.env.API_TEST_SECRET as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;

let testUserCreds: UserCreds = {};

const invokeUserInfo = async ({ onmouuid, access_token }: InvokeUserInfoInput) => {
  const token_url = `https://${onmo_auth_url}/oidc/next/user-info?${onmouuid ? `onmouuid=${onmouuid}` : ""}`;

  return await fetch(token_url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-test-secret": api_test_secret,
      ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
    },
  });
};

beforeEach(async () => {
  const { access_token, onmouuid, token_id } = await createTestTokenRecord({
    scope: `${CUSTOMER_CARE_SCOPE},${LOAN_ACCOUNT_ID_SCOPE}`,
    environment: "staging",
    expiryTimeMinutes: 10,
    tableName: auth_tokens_table,
    domain: "web",
  });
  testUserCreds.onmouuid = onmouuid;
  testUserCreds.mambuCreditCardAccountID = TEST_LOAN_ACCOUNT_ID;
  testUserCreds.token_id = token_id;
  testUserCreds.access_token = access_token;
  await createUserRecordInMobileTable({
    onmouuid: testUserCreds.onmouuid,
    mambuCreditCardAccountID: testUserCreds.mambuCreditCardAccountID,
  });
});

afterEach(async () => {
  await Promise.all([
    deleteTestTokenRecord({
      onmouuid: testUserCreds.onmouuid as string,
      token_id: testUserCreds.token_id as string,
    }),
    deleteUserRecordInMobileTable(testUserCreds.onmouuid as string),
  ]);
});

test("happy path - user info acquired", async () => {
  const response = await invokeUserInfo({
    onmouuid: testUserCreds.onmouuid as string,
    access_token: testUserCreds.access_token as string,
  });
  const body = (await response.json()) as SuccessRespBody;

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("loanAccountId");
  expect(body.loanAccountId).toEqual(TEST_LOAN_ACCOUNT_ID);
});

test("onmouuid missing from request body", async () => {
  const response = await invokeUserInfo({
    access_token: testUserCreds.access_token as string,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("authorization header missing", async () => {
  const response = await invokeUserInfo({
    onmouuid: testUserCreds.onmouuid as string,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(401);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Unauthorized");
});

test("invalid access token in authorization header", async () => {
  const response = await invokeUserInfo({
    onmouuid: testUserCreds.onmouuid as string,
    access_token: "fake-access-token" as string,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(401);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Unauthorized");
});

test("query onmouuid does not match authorizer onmouuid", async () => {
  const response = await invokeUserInfo({
    onmouuid: generateUniqueIdentifier(),
    access_token: testUserCreds.access_token,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("no token exists", async () => {
  await deleteTestTokenRecord({
    onmouuid: testUserCreds.onmouuid as string,
    token_id: testUserCreds.token_id as string,
  });
  const response = await invokeUserInfo({
    onmouuid: testUserCreds.onmouuid as string,
    access_token: testUserCreds.access_token as string,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(401);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Unauthorized");
});

test("no user exists", async () => {
  await deleteUserRecordInMobileTable(testUserCreds.onmouuid as string);
  const response = await invokeUserInfo({
    onmouuid: testUserCreds.onmouuid as string,
    access_token: testUserCreds.access_token as string,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("missing loan account id on user record", async () => {
  await deleteUserRecordInMobileTable(testUserCreds.onmouuid as string);
  await createUserRecordInMobileTable({ onmouuid: testUserCreds.onmouuid });
  const response = await invokeUserInfo({
    onmouuid: testUserCreds.onmouuid as string,
    access_token: testUserCreds.access_token as string,
  });
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});
