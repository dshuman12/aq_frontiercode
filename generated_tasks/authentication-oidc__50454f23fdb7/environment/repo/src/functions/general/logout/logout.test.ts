import { expect, test, beforeEach, afterEach } from "vitest";
import {
  APR_SCOPE,
  AUTH_SERVICES_SCOPE,
  CUSTOMER_CARE_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
  AUTH_TOKENS_TABLE,
  AUTH_REFRESH_TOKENS_TABLE,
} from "@libs/config";
import {
  createTestTokenRecord,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  generateUniqueIdentifier,
} from "@libs/testUtils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeLogout } from "src/test-e2e/e2eTestUtils";

type CreateTestTokenRecordRes = { access_token: string; token_id: string };
type ErrorRespBody = { message: string };

const webScopes = `${CUSTOMER_CARE_SCOPE},${LOAN_ACCOUNT_ID_SCOPE},${APR_SCOPE}`;
const appScopes = `${AUTH_SERVICES_SCOPE}`;

let onmouuid: string;
let app_access_token: CreateTestTokenRecordRes;
let app_refresh_token: CreateTestTokenRecordRes;
let web_access_token: CreateTestTokenRecordRes;
let web_refresh_token: CreateTestTokenRecordRes;

beforeEach(async () => {
  onmouuid = generateUniqueIdentifier();
  [app_access_token, app_refresh_token, web_access_token, web_refresh_token] = await Promise.all([
    createTestTokenRecord({
      scope: appScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      scope: appScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      scope: webScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid,
      domain: "web",
    }),
    createTestTokenRecord({
      scope: webScopes,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
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
  const response = await invokeLogout({ onmouuid }, app_access_token.access_token);
  expect(response.status).toBe(200);

  const queryTokensTableRes = await queryTableMethod({
    TableName: AUTH_TOKENS_TABLE,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  expect(queryTokensTableRes?.Count).toBe(1);
  const tokenRecord = queryTokensTableRes.Items![0];
  expect(tokenRecord.token_id).toEqual(web_access_token.token_id);

  const queryRefTokensTableRes = await queryTableMethod({
    TableName: AUTH_REFRESH_TOKENS_TABLE,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  expect(queryTokensTableRes?.Count).toBe(1);
  const refTokenRecord = queryRefTokensTableRes.Items![0];
  expect(refTokenRecord.token_id).toEqual(web_refresh_token.token_id);
});

test("authorization header missing in request", async () => {
  const response = await invokeLogout({ onmouuid }, "");
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
  expect(response.status).toBe(400);
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Bad Request");
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
