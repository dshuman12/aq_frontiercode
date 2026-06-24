import { test, expect, beforeAll, beforeEach, afterEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  TEST_OTP_STEP_EXTRA_SCOPE,
} from "@libs/config";
import { TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeExtraScope,
  invokeLogout,
  invokeNextEndpoint,
} from "../e2eTestUtils";
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
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type UnprocessableBody = { error_code: string } & NextEndpointBody;
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const code_verifier = "otp-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${AUTH_SERVICES_SCOPE}`;
const extra_scope = `${TEST_OTP_STEP_EXTRA_SCOPE}`;
const passcode = TEST_PASSCODE;
const incorrect_code = 2222;

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
    phone_number = await getUniqueTestNumber(1000);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
    });
    onmouuid = testCreditCustomerAccount.customerId;
    device_id = testCreditCustomerAccount.device_id;
    [testAccessToken, testRefreshToken] = await Promise.all([
      createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
        scope,
        environment: "staging",
        expiryTimeMinutes: 15,
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
    "otp attempt limit reached -> restart extra-scope auth flow",
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
      };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
      expect(authorizeExtraScopeRes.status).toBe(200);

      const extraScopeSendOTPEvent = {};
      const extraScopeSendOTPRes = await invokeNextEndpoint(
        extraScopeSendOTPEvent,
        authorizeExtraScopeBody.next_endpoint,
        access_token,
      );
      const extraScopeSendOTPBody = (await extraScopeSendOTPRes.json()) as NextEndpointBody;
      expect(extraScopeSendOTPRes.status).toBe(200);

      // first otp verify attempt
      const firstVerifyOTPEvent = { verify_code: incorrect_code };
      const firstVerifyOTPRes = await invokeNextEndpoint(
        firstVerifyOTPEvent,
        extraScopeSendOTPBody.next_endpoint,
        access_token,
      );
      const firstVerifyOTPBody = (await firstVerifyOTPRes.json()) as UnprocessableBody;
      expect(firstVerifyOTPRes.status).toBe(422);
      expect(firstVerifyOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

      // second otp verify attempt
      const secondVerifyOTPEvent = { verify_code: incorrect_code };
      const secondVerifyOTPRes = await invokeNextEndpoint(
        secondVerifyOTPEvent,
        firstVerifyOTPBody.next_endpoint,
        access_token,
      );
      const secondVerifyOTPBody = (await secondVerifyOTPRes.json()) as UnprocessableBody;
      expect(secondVerifyOTPRes.status).toBe(422);
      expect(secondVerifyOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

      // final otp verify attempt
      const finalVerifyOTPEvent = { verify_code: incorrect_code };
      const finalVerifyOTPRes = await invokeNextEndpoint(
        finalVerifyOTPEvent,
        secondVerifyOTPBody.next_endpoint,
        access_token,
      );
      const finalVerifyOTPBody = (await finalVerifyOTPRes.json()) as UnprocessableBody;
      expect(finalVerifyOTPRes.status).toBe(422);
      expect(finalVerifyOTPBody.error_code).toEqual(OTP_INVALID_ATTEMPT_LIMIT_REACHED);
      expect(finalVerifyOTPBody.next_endpoint).toEqual("authorize/extra-scope");

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
