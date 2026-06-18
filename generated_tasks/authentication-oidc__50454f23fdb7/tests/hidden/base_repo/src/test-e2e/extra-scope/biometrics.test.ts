import { test, expect, beforeAll, beforeEach, afterEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  TEST_BIOMETRICS_STEP_EXTRA_SCOPE,
} from "@libs/config";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  createSignature,
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeExtraScope,
  invokeLogout,
  invokeNextEndpoint,
  invokeToken,
} from "../e2eTestUtils";
import {
  createTestAuthKeyRecord,
  createTestTokenRecord,
  deleteTestAuthKeyRecord,
  deleteTestCreditCustomerAccount,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  testModes,
} from "@libs/testUtils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpointBody = { next_endpoint: string };
type BioAuthorizeBody = { transaction_id: string; unsigned_challenge: string } & NextEndpointBody;
type AuthCodeBody = { auth_code: string } & NextEndpointBody;
type TokenBody = { access_token: string };
type RefreshTokenBody = { refresh_token: string } & TokenBody;
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const code_verifier = "biometrics";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${AUTH_SERVICES_SCOPE}`;
const extra_scope = `${TEST_BIOMETRICS_STEP_EXTRA_SCOPE}`;
const combined_scopes = [...scope.split(","), ...extra_scope.split(",")].sort().join();

let pubKey: string;
let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;
let privKey: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    pubKey = await getPublicSigningKey();
  });

  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(400);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
    });
    onmouuid = testCreditCustomerAccount.customerId;
    device_id = testCreditCustomerAccount.device_id;
    const { privateKey } = await createTestAuthKeyRecord({ onmouuid, device_id });
    privKey = privateKey;
    [testAccessToken, testRefreshToken] = await Promise.all([
      createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
        scope,
        environment: "staging",
        expiryTimeMinutes: 2,
        onmouuid,
        domain: "app",
      }),
      createTestTokenRecord({
        tableName: AUTH_REFRESH_TOKENS_TABLE,
        scope,
        environment: "staging",
        expiryTimeMinutes: 30,
        onmouuid,
        domain: "app",
      }),
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestCreditCustomerAccount(testCreditCustomerAccount),
      deleteTestAuthKeyRecord(onmouuid),
      deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid }),
      deleteTestRefreshTokenRecord({ token_id: testRefreshToken.token_id, onmouuid }),
    ]);
  });

  test(
    "happy path - extra_scope_flow=biometrics -> access token",
    async () => {
      const { access_token } = testAccessToken;
      const { access_token: refresh_token } = testRefreshToken;

      const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
        verifyToken({ token: access_token, pubKey }),
        verifyToken({ token: refresh_token, pubKey }),
      ]);
      expect(decodedAccessToken.scope).toEqual(scope);
      expect(decodedAccessToken.sub).toEqual(onmouuid);
      expect(decodedRefreshToken.scope).toEqual(scope);
      expect(decodedRefreshToken.sub).toEqual(onmouuid);
      console.log(
        `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );
      console.log(
        `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );

      const authorizeExtraScopeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
        biometrics: true,
      };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as BioAuthorizeBody;
      const { transaction_id: extra_scope_transaction_id, unsigned_challenge } =
        authorizeExtraScopeBody;
      expect(authorizeExtraScopeRes.status).toBe(200);

      // Sign the login challenge using RSA-SHA256
      const { signature: signed_challenge } = createSignature(unsigned_challenge, privKey);

      const extraScopeVerifyBiometricsEvent = { signed_challenge, device_id };
      const extraScopeVerifyBiometricsRes = await invokeNextEndpoint(
        extraScopeVerifyBiometricsEvent,
        authorizeExtraScopeBody.next_endpoint,
        access_token,
      );
      const extraScopeVerifyBiometricsBody =
        (await extraScopeVerifyBiometricsRes.json()) as AuthCodeBody;
      const { auth_code: extra_scope_auth_code } = extraScopeVerifyBiometricsBody;
      expect(extraScopeVerifyBiometricsRes.status).toBe(200);

      const extraScopeTokenEvent = {
        transaction_id: extra_scope_transaction_id,
        auth_code: extra_scope_auth_code,
        code_verifier,
      };
      const extraScopeTokenRes = await invokeNextEndpoint(
        extraScopeTokenEvent,
        extraScopeVerifyBiometricsBody.next_endpoint,
        access_token,
      );
      const extraScopeTokenBody = (await extraScopeTokenRes.json()) as TokenBody;
      const { access_token: extra_scope_access_token } = extraScopeTokenBody;
      expect(extraScopeTokenRes.status).toBe(200);
      expect("refresh_token" in extraScopeTokenBody).toBe(false);

      const decodedExtraScopeAccessToken = await verifyToken({
        token: extra_scope_access_token,
        pubKey,
      });
      expect(decodedExtraScopeAccessToken.scope?.split(",").sort().join(",")).toEqual(
        combined_scopes,
      );
      expect(decodedExtraScopeAccessToken.sub).toEqual(onmouuid);
      console.log(
        `extra-scope access token lifetime: ${((decodedExtraScopeAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );

      const refreshAccessTokenEvent = { refresh_token };
      const refreshAccessTokenRes = await invokeToken(refreshAccessTokenEvent);
      const refreshAccessTokenBody = (await refreshAccessTokenRes.json()) as RefreshTokenBody;
      const { access_token: refreshed_access_token } = refreshAccessTokenBody;
      expect(refreshAccessTokenRes.status).toBe(200);

      const invalidLogoutEvent1 = { onmouuid };
      const invalidLogoutRes1 = await invokeLogout(invalidLogoutEvent1, access_token);
      expect(invalidLogoutRes1.status).toBe(401);

      const invalidLogoutEvent2 = { onmouuid };
      const invalidLogoutRes2 = await invokeLogout(invalidLogoutEvent2, extra_scope_access_token);
      expect(invalidLogoutRes2.status).toBe(401);

      const logoutEvent = { onmouuid };
      const logoutRes = await invokeLogout(logoutEvent, refreshed_access_token);
      expect(logoutRes.status).toBe(200);

      const queryTokensTableRes = await queryTableMethod({
        TableName: AUTH_TOKENS_TABLE,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": onmouuid },
      });
      expect(queryTokensTableRes?.Count).toBe(0);

      const queryRefTokensTableRes = await queryTableMethod({
        TableName: AUTH_REFRESH_TOKENS_TABLE,
        IndexName: "onmouuid-index",
        KeyConditionExpression: "onmouuid = :onmouuid",
        ExpressionAttributeValues: { ":onmouuid": onmouuid },
      });
      expect(queryRefTokensTableRes?.Count).toBe(0);
    },
    E2E_TEST_TIMEOUT,
  );
});
