import { test, expect, beforeAll, beforeEach, afterEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/config";
import { TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeOTPPasscode,
  invokeLogout,
  invokeNextEndpoint,
} from "../e2eTestUtils";
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
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpoint = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpoint;
type AuthCodeBody = { auth_code: string } & NextEndpoint;
type TokenBody = { access_token: string; refresh_token: string };

const code_verifier = "relogin";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE},${AUTH_SERVICES_SCOPE}`;

let pubKey: string;
let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    pubKey = await getPublicSigningKey();
  });

  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(2000);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
    });
    onmouuid = testCreditCustomerAccount.customerId;
    device_id = testCreditCustomerAccount.device_id;
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestCreditCustomerAccount(testCreditCustomerAccount),
      deleteLegacyAuthRecord(onmouuid),
      deleteLegacyRSARecord(onmouuid),
      deleteTestAuthHashRecord(onmouuid),
    ]);
  });

  async function runReloginFlow(initialSetup: () => Promise<void>) {
    await initialSetup();

    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeBody;
    expect(authorizeRes.status).toBe(200);

    const verifyPasscodeEvent = { passcode: TEST_PASSCODE };
    const verifyPasscodeRes = await invokeNextEndpoint(
      verifyPasscodeEvent,
      authorizeBody.next_endpoint,
    );
    const verifyPasscodeBody = (await verifyPasscodeRes.json()) as AuthCodeBody;
    const { auth_code } = verifyPasscodeBody;
    expect(verifyPasscodeRes.status).toBe(200);

    const tokenEvent = { transaction_id, auth_code, code_verifier };
    const tokenRes = await invokeNextEndpoint(tokenEvent, verifyPasscodeBody.next_endpoint);
    const tokenBody = (await tokenRes.json()) as TokenBody;
    const { access_token, refresh_token } = tokenBody;
    expect(tokenRes.status).toBe(200);

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
  }

  test(
    "happy path - relogin - encrypted passcode -> access & refresh tokens",
    async () => {
      await runReloginFlow(async () => {
        await createTestLegacyAuthRecords({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "happy path - relogin - hashed passcode -> access & refresh tokens",
    async () => {
      await runReloginFlow(async () => {
        await createTestAuthHashRecord({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );
});
