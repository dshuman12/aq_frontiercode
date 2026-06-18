import { beforeEach, afterEach, test, expect } from "vitest";
import {
  UserCreds,
  createTestTokenRecord,
  deleteAllTokensForOnmouuid,
  deleteTestRefreshTokenRecord,
  deleteTestUser,
  setUpTestUser,
} from "@libs/testUtils";
import {
  APR_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/constants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { SigningKeySecrets } from "@shared-types/secrets";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { verifyToken } from "@libs/crypto";
import { hasRecordExpired } from "@libs/utils";
import { TEST_AUTH_CODE, TEST_CODE_CHALLENGE, TEST_CODE_VERIFIER } from "@libs/testConstants";

type SuccessRespBody = { access_token: string; refresh_token: string };
type ErrorRespBody = { message: string };

const api_test_secret = process.env.API_TEST_SECRET as string;
const env = process.env.ENVIRONMENT as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const onmo_api_url = process.env.ONMO_API_URL as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

let testUserCreds: UserCreds;
let testRefreshTokenCreds: { token_id: string; onmouuid: string; access_token: string };

const invokeToken = async (eventBody: any) => {
  const token_url = `https://${onmo_auth_url}/oidc/next/token`;

  return await fetch(token_url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-test-secret": api_test_secret },
    body: JSON.stringify(eventBody),
  });
};

beforeEach(async () => {
  testUserCreds = await setUpTestUser();
  testUserCreds.scope = APR_SCOPE;
  testUserCreds.code_challenge = TEST_CODE_CHALLENGE;
  testUserCreds.auth_code = TEST_AUTH_CODE;
  testUserCreds.code_verifier = TEST_CODE_VERIFIER;
  testRefreshTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: env,
    expiryTimeMinutes: 10,
    tableName: auth_refresh_tokens_table,
    onmouuid: testUserCreds.onmouuid,
    domain: "web",
  });
});

afterEach(async () => {
  await Promise.all([
    deleteTestUser(testUserCreds),
    deleteTestRefreshTokenRecord({
      token_id: testRefreshTokenCreds.token_id as string,
      onmouuid: testUserCreds.onmouuid as string,
    }),
  ]);
});

test("happy path - no existing access token -> new access_token", async () => {
  const event = { refresh_token: testRefreshTokenCreds.access_token };
  const response = await invokeToken(event);
  const body = (await response.json()) as SuccessRespBody;

  const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
  if (!SecretString) {
    throw new Error("Token signing keys secrets string is undefined");
  }
  const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
  if (!pub_signing_key) {
    throw new Error("Missing necessary signing public key");
  }

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("access_token");
  const decodedAccessToken = await verifyToken({
    token: body.access_token,
    pubKey: pub_signing_key,
  });
  expect(decodedAccessToken).toBeTruthy();
  expect(decodedAccessToken.iss).toBe(`${onmo_auth_url}/oidc`);
  expect(decodedAccessToken.aud).toBe(onmo_api_url);
  expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
  expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
  expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

  const queryAuthTokensTableRes = await queryTableMethod({
    TableName: auth_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
  });
  expect(queryAuthTokensTableRes.Count).toBe(1);
  const authTokenRecord = queryAuthTokensTableRes.Items![0];
  expect(authTokenRecord).toHaveProperty("scope");
  expect(authTokenRecord).toHaveProperty("token");
  expect(authTokenRecord).toHaveProperty("ttl");
  expect(hasRecordExpired(authTokenRecord.ttl)).toBeFalsy();

  const queryAuthRefreshTokensTableRes = await queryTableMethod({
    TableName: auth_refresh_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
  });
  expect(queryAuthRefreshTokensTableRes.Count).toBe(1);
  const authRefreshTokenRecord = queryAuthRefreshTokensTableRes.Items![0];
  expect(authRefreshTokenRecord).toHaveProperty("scope");
  expect(authRefreshTokenRecord).toHaveProperty("token");
  expect(authRefreshTokenRecord).toHaveProperty("ttl");
  expect(hasRecordExpired(authRefreshTokenRecord.ttl)).toBeFalsy();

  await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
});

test("happy path - existing access token with same scope -> new access_token", async () => {
  await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: env,
    expiryTimeMinutes: 10,
    tableName: auth_tokens_table,
    onmouuid: testUserCreds.onmouuid,
    domain: "web",
  });

  const event = { refresh_token: testRefreshTokenCreds.access_token };
  const response = await invokeToken(event);
  const body = (await response.json()) as SuccessRespBody;

  const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
  if (!SecretString) {
    throw new Error("Token signing keys secrets string is undefined");
  }
  const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
  if (!pub_signing_key) {
    throw new Error("Missing necessary signing public key");
  }

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("access_token");
  const decodedAccessToken = await verifyToken({
    token: body.access_token,
    pubKey: pub_signing_key,
  });
  expect(decodedAccessToken).toBeTruthy();
  expect(decodedAccessToken.iss).toBe(`${onmo_auth_url}/oidc`);
  expect(decodedAccessToken.aud).toBe(onmo_api_url);
  expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
  expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
  expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

  const queryAuthTokensTableRes = await queryTableMethod({
    TableName: auth_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
  });
  expect(queryAuthTokensTableRes.Count).toBe(1);
  const authTokenRecord = queryAuthTokensTableRes.Items![0];
  expect(authTokenRecord).toHaveProperty("scope");
  expect(authTokenRecord).toHaveProperty("token");
  expect(authTokenRecord).toHaveProperty("ttl");
  expect(hasRecordExpired(authTokenRecord.ttl)).toBeFalsy();

  const queryAuthRefreshTokensTableRes = await queryTableMethod({
    TableName: auth_refresh_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
  });
  expect(queryAuthRefreshTokensTableRes.Count).toBe(1);
  const authRefreshTokenRecord = queryAuthRefreshTokensTableRes.Items![0];
  expect(authRefreshTokenRecord).toHaveProperty("scope");
  expect(authRefreshTokenRecord).toHaveProperty("token");
  expect(authRefreshTokenRecord).toHaveProperty("ttl");
  expect(hasRecordExpired(authRefreshTokenRecord.ttl)).toBeFalsy();

  await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
});

test("happy path - existing access & refresh tokens with different scope -> new access_token", async () => {
  const differentScope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;
  await createTestTokenRecord({
    scope: differentScope,
    environment: env,
    expiryTimeMinutes: 10,
    tableName: auth_tokens_table,
    onmouuid: testUserCreds.onmouuid,
    domain: "app",
  });
  await createTestTokenRecord({
    scope: differentScope,
    environment: env,
    expiryTimeMinutes: 10,
    tableName: auth_refresh_tokens_table,
    onmouuid: testUserCreds.onmouuid,
    domain: "app",
  });

  const event = { refresh_token: testRefreshTokenCreds.access_token };
  const response = await invokeToken(event);
  const body = (await response.json()) as SuccessRespBody;

  const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
  if (!SecretString) {
    throw new Error("Token signing keys secrets string is undefined");
  }
  const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
  if (!pub_signing_key) {
    throw new Error("Missing necessary signing public key");
  }

  expect(response.status).toBe(200);
  expect(body).toHaveProperty("access_token");
  const decodedAccessToken = await verifyToken({
    token: body.access_token,
    pubKey: pub_signing_key,
  });
  expect(decodedAccessToken).toBeTruthy();
  expect(decodedAccessToken.iss).toBe(`${onmo_auth_url}/oidc`);
  expect(decodedAccessToken.aud).toBe(onmo_api_url);
  expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
  expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
  expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

  const queryAuthTokensTableRes = await queryTableMethod({
    TableName: auth_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
  });
  expect(queryAuthTokensTableRes.Count).toBe(2);
  const authTokenRecord = queryAuthTokensTableRes.Items![0];
  expect(authTokenRecord).toHaveProperty("scope");
  expect(authTokenRecord).toHaveProperty("token");
  expect(authTokenRecord).toHaveProperty("ttl");
  expect(hasRecordExpired(authTokenRecord.ttl)).toBeFalsy();

  const queryAuthRefreshTokensTableRes = await queryTableMethod({
    TableName: auth_refresh_tokens_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
  });
  expect(queryAuthRefreshTokensTableRes.Count).toBe(2);
  const authRefreshTokenRecord = queryAuthRefreshTokensTableRes.Items![0];
  expect(authRefreshTokenRecord).toHaveProperty("scope");
  expect(authRefreshTokenRecord).toHaveProperty("token");
  expect(authRefreshTokenRecord).toHaveProperty("ttl");
  expect(hasRecordExpired(authRefreshTokenRecord.ttl)).toBeFalsy();

  await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
});

test("transaction_id is in request body", async () => {
  const event = {
    refresh_token: testRefreshTokenCreds.access_token,
    transaction_id: "fake-transaction-id",
  };
  const response = await invokeToken(event);
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("auth_code is in request body", async () => {
  const event = {
    refresh_token: testRefreshTokenCreds.access_token,
    auth_code: "fake-auth-code",
  };
  const response = await invokeToken(event);
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("code_verifier is in request body", async () => {
  const event = {
    refresh_token: testRefreshTokenCreds.access_token,
    code_verifier: "fake-code-verifier",
  };
  const response = await invokeToken(event);
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("refresh_token is for wrong environment", async () => {
  const testRefreshTokenCredsProd = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: "prod",
    expiryTimeMinutes: 10,
    tableName: auth_refresh_tokens_table,
    onmouuid: testUserCreds.onmouuid,
    domain: "web",
  });

  const event = { refresh_token: testRefreshTokenCredsProd.access_token };
  const response = await invokeToken(event);
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");

  await deleteTestRefreshTokenRecord({
    token_id: testRefreshTokenCredsProd.token_id as string,
    onmouuid: testUserCreds.onmouuid as string,
  });
});

test("missing refresh token record", async () => {
  await deleteTestRefreshTokenRecord({
    token_id: testRefreshTokenCreds.token_id as string,
    onmouuid: testUserCreds.onmouuid as string,
  });

  const event = { refresh_token: testRefreshTokenCreds.access_token };
  const response = await invokeToken(event);
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(500);
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");
});

test("refresh token record expired", async () => {
  const testRefreshTokenCredsProd = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: env,
    expiryTimeMinutes: -5,
    tableName: auth_refresh_tokens_table,
    onmouuid: testUserCreds.onmouuid,
    domain: "web",
  });

  const event = { refresh_token: testRefreshTokenCredsProd.access_token };
  const response = await invokeToken(event);
  const body = (await response.json()) as ErrorRespBody;

  expect(response.status).toBe(400);
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");
  expect(body).toHaveProperty("message");
  expect(body.message).toBe("Something went wrong");

  await deleteTestRefreshTokenRecord({
    token_id: testRefreshTokenCredsProd.token_id as string,
    onmouuid: testUserCreds.onmouuid as string,
  });
});
