import { expect, test, beforeEach, afterEach, inject } from "vitest";
import {
  APR_SCOPE,
  AUTH_SERVICES_SCOPE,
  CUSTOMER_CARE_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
} from "@libs/constants";
import {
  createTestTokenRecord,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  generateUniqueIdentifier,
} from "@libs/testUtils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

type CreateTestTokenRecordRes = { access_token: string; token_id: string };
type ErrorRespBody = { message: string };

const onmo_auth_url = inject("apiURL") ?? (process.env.ONMO_AUTH_URL as string);
const api_test_secret = process.env.API_TEST_SECRET as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

const webScopes = `${CUSTOMER_CARE_SCOPE},${LOAN_ACCOUNT_ID_SCOPE},${APR_SCOPE}`;
const appScopes = `${AUTH_SERVICES_SCOPE}`;

let onmouuid: string;
let app_access_token: CreateTestTokenRecordRes;
let app_refresh_token: CreateTestTokenRecordRes;
let web_access_token: CreateTestTokenRecordRes;
let web_refresh_token: CreateTestTokenRecordRes;

export const invokeLogout = async (eventBody: any, token?: string) => {
  const logout_url = `https://${onmo_auth_url}/oidc/next/logout`;
  return await fetch(logout_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-test-secret": api_test_secret,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(eventBody),
  });
};

beforeEach(async () => {
  onmouuid = generateUniqueIdentifier();
  [app_access_token, app_refresh_token, web_access_token, web_refresh_token] = await Promise.all([
    createTestTokenRecord({
      scope: appScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: auth_tokens_table,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      scope: appScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: auth_refresh_tokens_table,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      scope: webScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: auth_tokens_table,
      onmouuid,
      domain: "web",
    }),
    createTestTokenRecord({
      scope: webScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: auth_refresh_tokens_table,
      onmouuid,
      domain: "web",
    }),
  ]);
});

afterEach(async () => {
  await Promise.all([
    deleteTestTokenRecord({ onmouuid, token_id: app_access_token.token_id }),
    deleteTestTokenRecord({ onmouuid, token_id: web_access_token.token_id }),
    deleteTestRefreshTokenRecord({ onmouuid, token_id: app_refresh_token.token_id }),
    deleteTestRefreshTokenRecord({ onmouuid, token_id: web_refresh_token.token_id }),
  ]);
});

test("happy path - all app tokens deleted, all web tokens remain", async () => {
  console.log(app_access_token.access_token);

  const response = await invokeLogout({ onmouuid }, app_access_token.access_token);
  expect(response.status).toBe(200);

  const queryTokensTableRes = await queryTableMethod({
    TableName: auth_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  expect(queryTokensTableRes?.Count).toBe(1);
  const tokenRecord = queryTokensTableRes.Items![0];
  expect(tokenRecord.token_id).toEqual(web_access_token.token_id);

  const queryRefTokensTableRes = await queryTableMethod({
    TableName: auth_refresh_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  expect(queryTokensTableRes?.Count).toBe(1);
  const refTokenRecord = queryRefTokensTableRes.Items![0];
  expect(refTokenRecord.token_id).toEqual(web_refresh_token.token_id);
});

test("authorization header missing in request", async () => {
  const response = await invokeLogout({ onmouuid });
  const body = (await response.json()) as ErrorRespBody;
  expect(response.status).toBe(401);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Unauthorized");
});

test("invalid access token in authorization header", async () => {
  const response = await invokeLogout({ onmouuid }, generateUniqueIdentifier());
  const body = (await response.json()) as ErrorRespBody;
  expect(response.status).toBe(401);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Unauthorized");
});

test("onmouuid missing in request body", async () => {
  const response = await invokeLogout({}, app_access_token.access_token);
  const body = (await response.json()) as ErrorRespBody;
  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("request onmouuid does not match authorizer onmouuid", async () => {
  const response = await invokeLogout(
    { onmouuid: generateUniqueIdentifier() },
    app_access_token.access_token,
  );
  const body = (await response.json()) as ErrorRespBody;
  expect(response.status).toBe(500);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});
