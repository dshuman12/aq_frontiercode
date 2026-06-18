import { test, expect, beforeAll, beforeEach, afterEach } from "vitest";
import {
  AUTH_SERVICES_SCOPE,
  COMPLETED_STATUS,
  CREDIT_CARD_ACTIVATION_SCOPE,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
} from "@libs/constants";
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
} from "@libs/testUtils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type UnprocessableBody = { error_code: string } & NextEndpointBody;
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

const code_verifier = "passcode-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${AUTH_SERVICES_SCOPE}`;
const extra_scope = `${CREDIT_CARD_ACTIVATION_SCOPE}`;
const incorrect_passcode = "456789";

let pubKey: string;
let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;

beforeAll(async () => {
  pubKey = await getPublicSigningKey();
});

beforeEach(async () => {
  phone_number = await getUniqueTestNumber(300);
  testCreditCustomerAccount = await setUpTestCreditCustomerAccount({
    mobile_phone: phone_number,
    onboarded_status: COMPLETED_STATUS,
  });
  onmouuid = testCreditCustomerAccount.customerId;
  device_id = testCreditCustomerAccount.device_id;
  [testAccessToken, testRefreshToken] = await Promise.all([
    createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      tableName: auth_refresh_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 30,
      onmouuid,
      domain: "app",
    }),
    createTestAuthHashRecord({ onmouuid, passcode: TEST_PASSCODE }),
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
  "happy path - extra_scope_flow=passcode -> access token",
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

    const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
    const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
      authorizeExtraScopeEvent,
      access_token,
    );
    const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
    expect(authorizeExtraScopeRes.status).toBe(200);

    // first extra-scope passcode verify attempt
    const firstExtraScopeVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const firstExtraScopeVerifyPasscodeRes = await invokeNextEndpoint(
      firstExtraScopeVerifyPasscodeEvent,
      authorizeExtraScopeBody.next_endpoint,
      access_token,
    );
    const firstExtraScopeVerifyPasscodeBody =
      (await firstExtraScopeVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(firstExtraScopeVerifyPasscodeRes.status).toBe(422);
    expect(firstExtraScopeVerifyPasscodeBody.error_code).toEqual(PASSCODE_INVALID_REATTEMPT);

    // second extra-scope passcode verify attempt
    const secondExtraScopeVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const secondExtraScopeVerifyPasscodeRes = await invokeNextEndpoint(
      secondExtraScopeVerifyPasscodeEvent,
      firstExtraScopeVerifyPasscodeBody.next_endpoint,
      access_token,
    );
    const secondExtraScopeVerifyPasscodeBody =
      (await secondExtraScopeVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(secondExtraScopeVerifyPasscodeRes.status).toBe(422);
    expect(secondExtraScopeVerifyPasscodeBody.error_code).toEqual(PASSCODE_INVALID_REATTEMPT);

    // final extra-scope passcode verify attempt
    const finalExtraScopeVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const finalExtraScopeVerifyPasscodeRes = await invokeNextEndpoint(
      finalExtraScopeVerifyPasscodeEvent,
      secondExtraScopeVerifyPasscodeBody.next_endpoint,
      access_token,
    );
    const finalExtraScopeVerifyPasscodeBody =
      (await finalExtraScopeVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(finalExtraScopeVerifyPasscodeRes.status).toBe(422);
    expect(finalExtraScopeVerifyPasscodeBody.error_code).toEqual(
      PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
    );
    expect(finalExtraScopeVerifyPasscodeBody.next_endpoint).toEqual("authorize/extra-scope");

    const logoutEvent = { onmouuid };
    const logoutRes = await invokeLogout(logoutEvent, access_token);
    expect(logoutRes.status).toBe(200);

    const queryTokensTableRes = await queryTableMethod({
      TableName: auth_tokens_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    expect(queryTokensTableRes?.Count).toBe(0);

    const queryRefTokensTableRes = await queryTableMethod({
      TableName: auth_refresh_tokens_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    expect(queryRefTokensTableRes?.Count).toBe(0);
  },
  E2E_TEST_TIMEOUT,
);
