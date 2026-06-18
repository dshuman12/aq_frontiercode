import { test, expect, beforeEach, afterEach, beforeAll, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
} from "@libs/config";
import { TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeForgottenPasscodeLoggedIn,
  invokeLogout,
  invokeNextEndpoint,
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
type UnprocessableBody = { error_code: string } & NextEndpointBody;
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const code_verifier = "otp-email-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const passcode = TEST_PASSCODE;
const incorrect_code = 2222;
const existing_scopes = `${AUTH_SERVICES_SCOPE}`;

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
    phone_number = await getUniqueTestNumber(600);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
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
    "otp attempt limit reached - logged in -> restart extra-scope auth flow",
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

      // first otp verify attempt
      const firstverifyEmailOTPEvent = { verify_code: incorrect_code };
      const firstverifyEmailOTPRes = await invokeNextEndpoint(
        firstverifyEmailOTPEvent,
        forgotPassSendEmailBody.next_endpoint,
      );
      const firstverifyEmailOTPBody = (await firstverifyEmailOTPRes.json()) as UnprocessableBody;
      expect(firstverifyEmailOTPRes.status).toBe(422);
      expect(firstverifyEmailOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

      // second otp verify attempt
      const secondverifyEmailOTPEvent = { verify_code: incorrect_code };
      const secondverifyEmailOTPRes = await invokeNextEndpoint(
        secondverifyEmailOTPEvent,
        firstverifyEmailOTPBody.next_endpoint,
      );
      const secondverifyEmailOTPBody = (await secondverifyEmailOTPRes.json()) as UnprocessableBody;
      expect(secondverifyEmailOTPRes.status).toBe(422);
      expect(secondverifyEmailOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

      // final otp verify attempt
      const finalverifyEmailOTPEvent = { verify_code: incorrect_code };
      const finalverifyEmailOTPRes = await invokeNextEndpoint(
        finalverifyEmailOTPEvent,
        secondverifyEmailOTPBody.next_endpoint,
      );
      const finalverifyEmailOTPBody = (await finalverifyEmailOTPRes.json()) as UnprocessableBody;
      expect(finalverifyEmailOTPRes.status).toBe(422);
      expect(finalverifyEmailOTPBody.error_code).toEqual(OTP_INVALID_ATTEMPT_LIMIT_REACHED);
      expect(finalverifyEmailOTPBody.next_endpoint).toEqual(
        "authorize/forgotten-passcode/logged-in",
      );

      const logoutEvent = { onmouuid };
      const logoutRes = await invokeLogout(logoutEvent, access_token);
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
