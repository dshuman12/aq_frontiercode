import { beforeAll, beforeEach, afterEach, afterAll, test, expect, describe } from "vitest";
import {
  UserCreds,
  createAuthCodeRecord,
  createTestTokenRecord,
  createTestTransaction,
  deleteAllTokensForOnmouuid,
  deleteAuthCodeRecord,
  deleteTestTransaction,
  deleteTestUser,
  expireAuthCode,
  expireTestTransaction,
  removeAttributeAuthCodeRecord,
  removeAttributeFromTransaction,
  setUpTestUser,
  testModes,
  updateAttributesOnRecord,
} from "@libs/testUtils";
import {
  APR_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  OTP_AUTH_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  SUPPORT_SERVICES_SCOPE,
  ENV,
  ONMO_AUTH_URL,
  ONMO_API_URL,
  AUTH_CODES_TABLE,
  AUTH_TOKENS_TABLE,
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_TRANSACTIONS_TABLE,
} from "@libs/config";
import { TEST_AUTH_CODE, TEST_CODE_CHALLENGE, TEST_CODE_VERIFIER } from "@libs/testConstants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { SigningKeySecrets } from "@shared-types/secrets";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { verifyToken } from "@libs/crypto";
import { hasRecordExpired } from "@libs/utils";
import { invokeToken } from "src/test-e2e/e2eTestUtils";

type SuccessAccessRespBody = { access_token: string };
type SuccessRefreshRespBody = SuccessAccessRespBody & { refresh_token: string };
type ErrorRespBody = { message: string };

const happyPathOTPAttrs = { auth_flow: OTP_AUTH_FLOW, otp_sms_verified: true };
const happyPathOTPPasscodeAttrs = { auth_flow: OTP_PASSCODE_AUTH_FLOW, passcode_verified: true };

const differentScope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;

let testUserCreds: UserCreds;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testUserCreds = await setUpTestUser(codePath);
  });

  beforeEach(async () => {
    testUserCreds.scope = APR_SCOPE;
    testUserCreds.code_challenge = TEST_CODE_CHALLENGE;
    testUserCreds.auth_code = TEST_AUTH_CODE;
    testUserCreds.code_verifier = TEST_CODE_VERIFIER;
    testUserCreds.transaction_id = await createTestTransaction(testUserCreds);
    await createAuthCodeRecord(testUserCreds);
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestTransaction(testUserCreds.transaction_id as string),
      deleteAuthCodeRecord(testUserCreds),
    ]);
  });

  afterAll(async () => {
    await deleteTestUser(testUserCreds);
  });

  test("happy path - otp && no existing tokens -> new access_token NO refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessAccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).not.toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
    });
    expect(queryAuthRefreshTokensTableRes.Count).toBe(0);

    await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
  });

  test("happy path - otp && existing access token (same scope) -> new access_token NO refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await createTestTokenRecord({
      scope: APR_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessAccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).not.toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
    });
    expect(queryAuthRefreshTokensTableRes.Count).toBe(0);

    await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
  });

  test("happy path - otp && existing refresh token (same scope) -> new access_token NO refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await createTestTokenRecord({
      scope: APR_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessAccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).not.toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
    });
    expect(queryAuthRefreshTokensTableRes.Count).toBe(0);

    await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
  });

  test("happy path - otp && existing access AND refresh tokens (same scope) -> new access_token NO refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await createTestTokenRecord({
      scope: APR_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });
    await createTestTokenRecord({
      scope: APR_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessAccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).not.toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
    });
    expect(queryAuthRefreshTokensTableRes.Count).toBe(0);

    await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
  });

  test("happy path - otp && existing access AND refresh tokens (different scope) -> new access_token NO refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await createTestTokenRecord({
      scope: differentScope,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "app",
    });
    await createTestTokenRecord({
      scope: differentScope,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "app",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessAccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).not.toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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
      TableName: AUTH_REFRESH_TOKENS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": testUserCreds.onmouuid },
    });
    expect(queryAuthRefreshTokensTableRes.Count).toBe(1);

    await deleteAllTokensForOnmouuid(testUserCreds.onmouuid as string);
  });

  test("happy path - otp-passode && no existing tokens -> new access_token & refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPPasscodeAttrs,
        create_refresh_token: true,
        auth_code: testUserCreds.auth_code,
      },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { create_refresh_token: true },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessRefreshRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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

    const decodedRefreshToken = await verifyToken({
      token: body.refresh_token,
      pubKey: pub_signing_key,
    });
    expect(decodedRefreshToken).toBeTruthy();
    expect(decodedRefreshToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedRefreshToken.aud).toBe(ONMO_API_URL);
    expect(decodedRefreshToken.scope).toBe(testUserCreds.scope);
    expect(decodedRefreshToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedRefreshToken.exp as number)).toBeFalsy();

    const queryAuthRefreshTokensTableRes = await queryTableMethod({
      TableName: AUTH_REFRESH_TOKENS_TABLE,
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

  test("happy path - otp-passode && existing tokens (same scope) -> new access_token & refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPPasscodeAttrs,
        create_refresh_token: true,
        auth_code: testUserCreds.auth_code,
      },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { create_refresh_token: true },
    });
    await createTestTokenRecord({
      scope: APR_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });
    await createTestTokenRecord({
      scope: APR_SCOPE,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessRefreshRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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

    const decodedRefreshToken = await verifyToken({
      token: body.refresh_token,
      pubKey: pub_signing_key,
    });
    expect(decodedRefreshToken).toBeTruthy();
    expect(decodedRefreshToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedRefreshToken.aud).toBe(ONMO_API_URL);
    expect(decodedRefreshToken.scope).toBe(testUserCreds.scope);
    expect(decodedRefreshToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedRefreshToken.exp as number)).toBeFalsy();

    const queryAuthRefreshTokensTableRes = await queryTableMethod({
      TableName: AUTH_REFRESH_TOKENS_TABLE,
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

  test("happy path - otp-passode && existing tokens (different scope & domain) -> new access_token & refresh_token", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPPasscodeAttrs,
        create_refresh_token: true,
        auth_code: testUserCreds.auth_code,
      },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { create_refresh_token: true },
    });
    await createTestTokenRecord({
      scope: differentScope,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });
    await createTestTokenRecord({
      scope: differentScope,
      environment: ENV,
      expiryTimeMinutes: 10,
      tableName: AUTH_REFRESH_TOKENS_TABLE,
      onmouuid: testUserCreds.onmouuid,
      domain: "web",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as SuccessRefreshRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });
    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
    if (!SecretString) {
      throw new Error("Token signing keys secrets string is undefined");
    }
    const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
    if (!pub_signing_key) {
      throw new Error("Missing necessary signing public key");
    }

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("access_token");
    expect(body).toHaveProperty("refresh_token");
    expect(queryTransactionsTableRes.Count).toBe(0);
    expect(queryAuthCodesTableRes.Count).toBe(0);
    const decodedAccessToken = await verifyToken({
      token: body.access_token,
      pubKey: pub_signing_key,
    });
    expect(decodedAccessToken).toBeTruthy();
    expect(decodedAccessToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedAccessToken.aud).toBe(ONMO_API_URL);
    expect(decodedAccessToken.scope).toBe(testUserCreds.scope);
    expect(decodedAccessToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedAccessToken.exp as number)).toBeFalsy();

    const queryAuthTokensTableRes = await queryTableMethod({
      TableName: AUTH_TOKENS_TABLE,
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

    const decodedRefreshToken = await verifyToken({
      token: body.refresh_token,
      pubKey: pub_signing_key,
    });
    expect(decodedRefreshToken).toBeTruthy();
    expect(decodedRefreshToken.iss).toBe(`${ONMO_AUTH_URL}/oidc`);
    expect(decodedRefreshToken.aud).toBe(ONMO_API_URL);
    expect(decodedRefreshToken.scope).toBe(testUserCreds.scope);
    expect(decodedRefreshToken.sub).toBe(testUserCreds.onmouuid);
    expect(hasRecordExpired(decodedRefreshToken.exp as number)).toBeFalsy();

    const queryAuthRefreshTokensTableRes = await queryTableMethod({
      TableName: AUTH_REFRESH_TOKENS_TABLE,
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

  test("transaction_id is missing from request body", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });

    const event = {
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Bad Request");
    expect(queryAuthCodesTableRes.Count).toBe(1);
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("auth_code is missing from request body", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Bad Request");
    expect(queryAuthCodesTableRes.Count).toBe(1);
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("code_verifier is missing from the request body", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Bad Request");
    expect(queryAuthCodesTableRes.Count).toBe(1);
    expect(queryTransactionsTableRes.Count).toBe(1);
  });

  test("no transaction exists", async () => {
    await deleteTestTransaction(testUserCreds.transaction_id as string);
    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("transaction is expired", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await expireTestTransaction(testUserCreds.transaction_id as string);

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("onmouuid missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "onmouuid",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("auth_code missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "auth_code",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("code_challenge missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "code_challenge",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("scope missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "scope",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("auth_flow missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "auth_flow",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("invalid auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPAttrs,
        auth_code: testUserCreds.auth_code,
        auth_flow: "fake-auth-flow",
      },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("otp -> otp_sms_verified missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "otp_sms_verified",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("otp -> otp_sms_verified=false in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPAttrs,
        auth_code: testUserCreds.auth_code,
        otp_sms_verified: false,
      },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("otp-passcode -> passcode_verified missing from transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPPasscodeAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeFromTransaction({
      transaction_id: testUserCreds.transaction_id as string,
      attributeName: "passcode_verified",
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("otp-passcode -> passcode_verified=false in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPPasscodeAttrs,
        auth_code: testUserCreds.auth_code,
        passcode_verified: false,
      },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("incorrect authcode supplied", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: "fake-auth-code" },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("no authcode record in authcode table", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await deleteAuthCodeRecord(testUserCreds);

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("authcode has expired", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await expireAuthCode(testUserCreds);

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("authcode record missing onmouuid", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeAuthCodeRecord({ testUserCreds, attributeName: "onmouuid" });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("authcode record missing transaction_id", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeAuthCodeRecord({ testUserCreds, attributeName: "transaction_id" });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("authcode record missing scope", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeAuthCodeRecord({ testUserCreds, attributeName: "scope" });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("authcode record missing code_challenge", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await removeAttributeAuthCodeRecord({ testUserCreds, attributeName: "code_challenge" });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("onmouuid in transaction does not match in authcode record", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { onmouuid: "fake-onmouuid" },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("transaction_id does not match in authcode record", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { transaction_id: "fake-transaction-id" },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("scope in transaction does not match in authcode record", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { scope: "fake-scope" },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("generated code_challenge from supplied code_verifier does not match transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPAttrs,
        auth_code: testUserCreds.auth_code,
        code_challenge: "fake-code-challenge",
      },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("generated code_challenge from supplied code_verifier does not match authcode record", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: { ...happyPathOTPAttrs, auth_code: testUserCreds.auth_code },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { code_challenge: "fake-code-challenge" },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("transaction create_refresh_token does not match authcode record", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testUserCreds.transaction_id,
      attributes: {
        ...happyPathOTPAttrs,
        auth_code: testUserCreds.auth_code,
        create_refresh_token: true,
      },
    });
    await updateAttributesOnRecord({
      tableName: AUTH_CODES_TABLE,
      keyName: "auth_code",
      keyValue: testUserCreds.auth_code,
      attributes: { create_refresh_token: false },
    });

    const event = {
      transaction_id: testUserCreds.transaction_id,
      auth_code: testUserCreds.auth_code,
      code_verifier: testUserCreds.code_verifier,
    };
    const response = await invokeToken(event);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testUserCreds.transaction_id },
    });

    const queryAuthCodesTableRes = await queryTableMethod({
      TableName: AUTH_CODES_TABLE,
      KeyConditionExpression: "auth_code = :auth_code",
      ExpressionAttributeValues: { ":auth_code": testUserCreds.auth_code },
    });

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
    expect(queryAuthCodesTableRes.Count).toBe(0);
    expect(queryTransactionsTableRes.Count).toBe(0);
  });
});
