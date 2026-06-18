import { test, expect, beforeAll, beforeEach, afterEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  PASSCODE_CHANGE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/config";
import { TEST_EMAIL, TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeForgottenPasscodeLoggedOut,
  invokeAuthorizeOTPPasscode,
  invokeChangePasscode,
  invokeLogout,
  invokeNextEndpoint,
} from "../../e2eTestUtils";
import {
  createTestAuthHashRecord,
  createTestLegacyAuthRecords,
  deleteLegacyAuthRecord,
  deleteLegacyRSARecord,
  deleteTestAuthHashRecord,
  deleteTestCreditCustomerAccount,
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
type RefreshTokenBody = { refresh_token: string } & TokenBody;

const code_verifier = "change-passcode";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE},${AUTH_SERVICES_SCOPE}`;
const passcode = TEST_PASSCODE;
const new_passcode = "654321";

let pubKey: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    pubKey = await getPublicSigningKey();
  });

  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(3100);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
      email_address: TEST_EMAIL,
    });
    onmouuid = testCreditCustomerAccount.customerId;
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestCreditCustomerAccount(testCreditCustomerAccount),
      deleteLegacyAuthRecord(onmouuid),
      deleteLegacyRSARecord(onmouuid),
      deleteTestAuthHashRecord(onmouuid),
    ]);
  });

  async function runForgottenPasscodeFlow(initialSetup: () => Promise<void>) {
    await initialSetup();

    const diff_dev_id = "different_device_id";

    const authorizeForgotPassEvent = { phone_number, device_id: diff_dev_id, code_challenge };
    const authorizeForgotPassRes =
      await invokeAuthorizeForgottenPasscodeLoggedOut(authorizeForgotPassEvent);
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
    const tokenRes = await invokeNextEndpoint(tokenEvent, forgotPassVerifyEmailBody.next_endpoint);
    const tokenBody = (await tokenRes.json()) as TokenBody;
    const { access_token } = tokenBody;
    expect(tokenRes.status).toBe(200);
    expect("refresh_token" in tokenBody).toBe(false);

    const decodedToken = await verifyToken({ token: access_token, pubKey });
    expect(decodedToken.scope).toEqual(PASSCODE_CHANGE_SCOPE);

    const changePasscodeEvent = { onmouuid, passcode: new_passcode };
    const changePasscodeRes = await invokeChangePasscode(changePasscodeEvent, access_token);
    expect(changePasscodeRes.status).toBe(200);

    // test new_passcode with otp-passcode relogin flow

    const authorizeEvent = { code_challenge, scope, device_id: diff_dev_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    const { transaction_id: relogin_transaction_id } = authorizeBody;
    expect(authorizeRes.status).toBe(200);

    const verifyPasscodeEvent = { passcode: new_passcode };
    const verifyPasscodeRes = await invokeNextEndpoint(
      verifyPasscodeEvent,
      authorizeBody.next_endpoint,
    );
    const verifyPasscodeBody = (await verifyPasscodeRes.json()) as AuthCodeBody;
    const { auth_code: relogin_auth_code } = verifyPasscodeBody;
    expect(verifyPasscodeRes.status).toBe(200);

    const reloginTokenEvent = {
      transaction_id: relogin_transaction_id,
      auth_code: relogin_auth_code,
      code_verifier,
    };
    const reloginTokenRes = await invokeNextEndpoint(
      reloginTokenEvent,
      verifyPasscodeBody.next_endpoint,
    );
    const reloginTokenBody = (await reloginTokenRes.json()) as RefreshTokenBody;
    const { access_token: new_access_token, refresh_token } = reloginTokenBody;
    expect(tokenRes.status).toBe(200);

    const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
      verifyToken({ token: new_access_token, pubKey }),
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

    const logoutEvent = { onmouuid };
    const logoutRes = await invokeLogout(logoutEvent, new_access_token);
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
  }

  test(
    "happy path - logged out - encrypted passcode -> access token with change-passcode scope",
    async () => {
      await runForgottenPasscodeFlow(async () => {
        await createTestLegacyAuthRecords({ onmouuid, passcode });
      });
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "happy path - logged out - hashed passcode -> access token with change-passcode scope",
    async () => {
      await runForgottenPasscodeFlow(async () => {
        await createTestAuthHashRecord({ onmouuid, passcode });
      });
    },
    E2E_TEST_TIMEOUT,
  );
});
