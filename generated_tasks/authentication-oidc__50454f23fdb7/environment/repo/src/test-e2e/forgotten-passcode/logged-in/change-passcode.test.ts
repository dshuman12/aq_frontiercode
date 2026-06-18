import { test, expect, beforeAll, beforeEach, afterEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  CREDIT_CARD_ACTIVATION_SCOPE,
  PASSCODE_CHANGE_SCOPE,
} from "@libs/config";
import { TEST_EMAIL, TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeExtraScope,
  invokeAuthorizeForgottenPasscodeLoggedIn,
  invokeChangePasscode,
  invokeLogout,
  invokeNextEndpoint,
  invokeToken,
} from "../../e2eTestUtils";
import {
  createTestAuthHashRecord,
  createTestTokenRecord,
  deleteTestAuthHashRecord,
  deleteTestCreditCustomerAccount,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  testModes,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type AuthCodeBody = { auth_code: string } & NextEndpointBody;
type TokenBody = { access_token: string };
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const code_verifier = "change-passcode";
const code_challenge = generateCodeChallenge(code_verifier);
const passcode = TEST_PASSCODE;
const new_passcode = "654321";
const extra_scope = `${CREDIT_CARD_ACTIVATION_SCOPE}`;
const existing_scopes = `${AUTH_SERVICES_SCOPE}`;
const combined_scopes_pass = [...existing_scopes.split(","), ...PASSCODE_CHANGE_SCOPE.split(",")]
  .sort()
  .join();
const combined_scopes_extra = [...existing_scopes.split(","), ...extra_scope.split(",")]
  .sort()
  .join();

let pubKey: string;
let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    pubKey = await getPublicSigningKey();
  });

  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(2300);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
      email_address: TEST_EMAIL,
    });
    onmouuid = testCreditCustomerAccount.customerId;
    device_id = testCreditCustomerAccount.device_id;
    [testAccessToken, testRefreshToken] = await Promise.all([
      createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
        scope: existing_scopes,
        environment: "staging",
        expiryTimeMinutes: 15,
        onmouuid,
        domain: "app",
      }),
      createTestTokenRecord({
        tableName: AUTH_REFRESH_TOKENS_TABLE,
        scope: existing_scopes,
        environment: "staging",
        expiryTimeMinutes: 30,
        onmouuid,
        domain: "app",
      }),
      createTestAuthHashRecord({ onmouuid, passcode }),
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestCreditCustomerAccount(testCreditCustomerAccount),
      deleteTestAuthHashRecord(onmouuid),
      deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid }),
      deleteTestRefreshTokenRecord({ token_id: testRefreshToken.token_id, onmouuid }),
    ]);
  });

  test(
    "happy path - logged in -> access token with existing & change-passcode scopes",
    async () => {
      const { access_token } = testAccessToken;
      const { access_token: refresh_token } = testRefreshToken;

      const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
        verifyToken({ token: access_token, pubKey }),
        verifyToken({ token: refresh_token, pubKey }),
      ]);
      expect(decodedAccessToken.scope).toEqual(existing_scopes);
      expect(decodedAccessToken.sub).toEqual(onmouuid);
      expect(decodedRefreshToken.scope).toEqual(existing_scopes);
      expect(decodedRefreshToken.sub).toEqual(onmouuid);
      console.log(
        `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );
      console.log(
        `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );

      const authorizeForgotPassEvent = { onmouuid, device_id, code_challenge };
      const authorizeForgotPassRes = await invokeAuthorizeForgottenPasscodeLoggedIn(
        authorizeForgotPassEvent,
        access_token,
      );
      const authorizeForgotPassBody = (await authorizeForgotPassRes.json()) as AuthorizeBody;
      const { transaction_id } = authorizeForgotPassBody;
      expect(authorizeForgotPassRes.status).toBe(200);

      const forgotPassSendOTPEvent = {};
      const forgotPassSendOTPRes = await invokeNextEndpoint(
        forgotPassSendOTPEvent,
        authorizeForgotPassBody.next_endpoint,
      );
      const forgotPassSendOTPBody = (await forgotPassSendOTPRes.json()) as NextEndpointBody;
      expect(forgotPassSendOTPRes.status).toBe(200);

      const forgotPassVerifyOTPEvent = { verify_code: 1111 };
      const forgotPassVerifyOTPRes = await invokeNextEndpoint(
        forgotPassVerifyOTPEvent,
        forgotPassSendOTPBody.next_endpoint,
      );
      const forgotPassVerifyOTPBody = (await forgotPassVerifyOTPRes.json()) as NextEndpointBody;
      expect(forgotPassVerifyOTPRes.status).toBe(200);

      const forgotPassSendEmailEvent = {};
      const forgotPassSendEmailRes = await invokeNextEndpoint(
        forgotPassSendEmailEvent,
        forgotPassVerifyOTPBody.next_endpoint,
      );
      const forgotPassSendEmailBody = (await forgotPassSendEmailRes.json()) as NextEndpointBody;
      expect(forgotPassSendEmailRes.status).toBe(200);

      const forgotPassVerifyEmailEvent = { verify_code: 1111 };
      const forgotPassVerifyEmailRes = await invokeNextEndpoint(
        forgotPassVerifyEmailEvent,
        forgotPassSendEmailBody.next_endpoint,
      );
      const forgotPassVerifyEmailBody = (await forgotPassVerifyEmailRes.json()) as AuthCodeBody;
      const { auth_code } = forgotPassVerifyEmailBody;
      expect(forgotPassVerifyEmailRes.status).toBe(200);

      const tokenEvent = { transaction_id, auth_code, code_verifier };
      const tokenRes = await invokeNextEndpoint(
        tokenEvent,
        forgotPassVerifyEmailBody.next_endpoint,
      );
      const tokenBody = (await tokenRes.json()) as TokenBody;
      const { access_token: change_passcode_access_token } = tokenBody;
      expect(tokenRes.status).toBe(200);
      expect("refresh_token" in tokenBody).toBe(false);

      const decodedToken = await verifyToken({ token: change_passcode_access_token, pubKey });
      expect(decodedToken.scope?.split(",").sort().join(",")).toEqual(combined_scopes_pass);

      const changePasscodeEvent = { onmouuid, passcode: new_passcode };
      const changePasscodeRes = await invokeChangePasscode(
        changePasscodeEvent,
        change_passcode_access_token,
      );
      expect(changePasscodeRes.status).toBe(200);

      const refreshTokenEvent = { refresh_token };
      const refreshTokenRes = await invokeToken(refreshTokenEvent);
      const refreshTokenBody = (await refreshTokenRes.json()) as TokenBody;
      const { access_token: refreshed_access_token } = refreshTokenBody;
      expect(refreshTokenRes.status).toBe(200);
      expect("refresh_token" in tokenBody).toBe(false);

      // test new_passcode with extra-scope flow

      const authorizeExtraScopeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
      };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        refreshed_access_token,
      );

      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
      const { transaction_id: extra_scope_transaction_id } = authorizeExtraScopeBody;
      expect(authorizeExtraScopeRes.status).toBe(200);

      const extraScopeVerifyPasscodeEvent = { passcode: new_passcode };
      const extraScopeVerifyPasscodeRes = await invokeNextEndpoint(
        extraScopeVerifyPasscodeEvent,
        authorizeExtraScopeBody.next_endpoint,
        refreshed_access_token,
      );
      const extraScopeVerifyPasscodeBody =
        (await extraScopeVerifyPasscodeRes.json()) as AuthCodeBody;
      const { auth_code: extra_scope_auth_code } = extraScopeVerifyPasscodeBody;
      expect(extraScopeVerifyPasscodeRes.status).toBe(200);

      const extraScopeTokenEvent = {
        transaction_id: extra_scope_transaction_id,
        auth_code: extra_scope_auth_code,
        code_verifier,
      };
      const extraScopeTokenRes = await invokeNextEndpoint(
        extraScopeTokenEvent,
        extraScopeVerifyPasscodeBody.next_endpoint,
        refreshed_access_token,
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
        combined_scopes_extra,
      );
      expect(decodedExtraScopeAccessToken.sub).toEqual(onmouuid);
      console.log(
        `extra-scope access token lifetime: ${((decodedExtraScopeAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );

      const logoutEvent = { onmouuid };
      const logoutRes = await invokeLogout(logoutEvent, extra_scope_access_token);
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
