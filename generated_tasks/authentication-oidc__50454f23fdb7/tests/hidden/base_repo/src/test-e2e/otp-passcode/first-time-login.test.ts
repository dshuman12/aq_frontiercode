import { test, expect, afterEach, beforeAll, beforeEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  COMPLETED_STATUS,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  FIRST_TIME_LOGIN_SCOPE,
  LEGACY_AUTH_BACKUP_TABLE,
  LEGACY_RSA_BACKUP_TABLE,
  SUPPORT_SERVICES_SCOPE,
  USER_TABLE,
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
  generateUniqueIdentifier,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  testModes,
} from "@libs/testUtils";
import { deleteItemMethod, getItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpoint = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpoint;
type NextEndpointBody = { message: string } & NextEndpoint;
type AuthCodeBody = { auth_code: string } & NextEndpoint;
type TokenBody = { access_token: string; refresh_token: string };

const code_verifier = "first-time-login";
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
    device_id = generateUniqueIdentifier();
    phone_number = await getUniqueTestNumber(1500);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
    });
    onmouuid = testCreditCustomerAccount.customerId;
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestCreditCustomerAccount(testCreditCustomerAccount),
      deleteTestAuthHashRecord(onmouuid),
      deleteLegacyAuthRecord(onmouuid),
      deleteLegacyRSARecord(onmouuid),
      deleteItemMethod({ TableName: LEGACY_AUTH_BACKUP_TABLE, Key: { onmouuid } }),
      deleteItemMethod({ TableName: LEGACY_RSA_BACKUP_TABLE, Key: { onmouuid } }),
    ]);
  });

  async function runFirstTimeLoginFlow(initialSetup: () => Promise<void>) {
    await initialSetup();

    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeBody;
    expect(authorizeRes.status).toBe(200);

    const sendOTPEvent = { phone_number };
    const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, authorizeBody.next_endpoint);
    const sendOTPBody = (await sendOTPRes.json()) as NextEndpointBody;
    expect(sendOTPRes.status).toBe(200);

    const verifyOTPEvent = { phone_number, verify_code: 1111 };
    const verifyOTPRes = await invokeNextEndpoint(verifyOTPEvent, sendOTPBody.next_endpoint);
    const verifyOTPBody = (await verifyOTPRes.json()) as NextEndpointBody;
    expect(verifyOTPRes.status).toBe(200);

    const verifyPasscodeEvent = { passcode: TEST_PASSCODE };
    const verifyPasscodeRes = await invokeNextEndpoint(
      verifyPasscodeEvent,
      verifyOTPBody.next_endpoint,
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
    expect(decodedAccessToken.scope?.split(",").sort().join(",")).toEqual(
      [...scope.split(","), FIRST_TIME_LOGIN_SCOPE].sort().join(","),
    );
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    expect(decodedRefreshToken.scope).toEqual(scope);
    expect(decodedRefreshToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.log(
      `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const queryUserTableRes = await queryTableMethod({
      TableName: USER_TABLE,
      IndexName: "dev-index",
      KeyConditionExpression: "dev = :device_id",
      ExpressionAttributeValues: { ":device_id": device_id },
    });
    expect(queryUserTableRes?.Count).toBe(1);
    const userRecord = queryUserTableRes.Items![0] as { onmouuid: string };
    expect(userRecord.onmouuid).toEqual(onmouuid);

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
    "happy path - first time login - encrypted passcode -> access & refresh tokens",
    async () => {
      await runFirstTimeLoginFlow(async () => {
        await createTestLegacyAuthRecords({ onmouuid, passcode: TEST_PASSCODE });
      });
      const [authResponse, rsaResponse] = await Promise.all([
        getItemMethod({ TableName: LEGACY_AUTH_BACKUP_TABLE, Key: { onmouuid } }),
        getItemMethod({ TableName: LEGACY_RSA_BACKUP_TABLE, Key: { onmouuid } }),
      ]);
      expect(authResponse?.Item).toBeDefined();
      expect(rsaResponse?.Item).toBeDefined();
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "happy path - first time login - hashed passcode -> access & refresh tokens",
    async () => {
      await runFirstTimeLoginFlow(async () => {
        await createTestAuthHashRecord({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );
});
