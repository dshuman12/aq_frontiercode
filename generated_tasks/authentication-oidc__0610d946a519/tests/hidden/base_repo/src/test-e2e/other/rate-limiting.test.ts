import { test, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { AUTH_SERVICES_SCOPE, COMPLETED_STATUS, PASSCODE_CHANGE_SCOPE } from "@libs/constants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeExtraScope,
  invokeClearRateLimits,
} from "../e2eTestUtils";
import {
  createTestRateLimitRecord,
  createTestSuperRateLimitRecord,
  createTestTokenRecord,
  deleteTestCreditCustomerAccount,
  deleteTestRateLimitRecord,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

type RateLimitedBody = { expiry_time: number };
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

const code_verifier = "rate-limiting";
const code_challenge = generateCodeChallenge(code_verifier);

const scope = `${AUTH_SERVICES_SCOPE}`;

let pubKey: string;
let device_id: string;
let phone_number: string;
let extra_scope: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;
let testRateLimitRecordId: string;

beforeAll(async () => {
  pubKey = await getPublicSigningKey();
});

beforeEach(async () => {
  phone_number = await getUniqueTestNumber(0);
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
  ]);
});

afterEach(async () => {
  await Promise.all([
    deleteTestCreditCustomerAccount(testCreditCustomerAccount),
    deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid }),
    deleteTestRefreshTokenRecord({ token_id: testRefreshToken.token_id, onmouuid }),
    deleteTestRateLimitRecord(testRateLimitRecordId, onmouuid),
  ]);
});

test(
  "Rate limited",
  async () => {
    extra_scope = PASSCODE_CHANGE_SCOPE;

    testRateLimitRecordId = await createTestRateLimitRecord({
      onmouuid,
      domain: "auth_general",
      action: "eligibility",
      rate_limit_expiry_minutes: 5,
      record_expiry_minutes: 10,
    });

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
    const { expiry_time } = (await authorizeExtraScopeRes.json()) as RateLimitedBody;
    expect(authorizeExtraScopeRes.status).toBe(429);
    expect(expiry_time).toBeGreaterThan(getCurrentTimestampInSeconds());

    const rate_limit_remaining_duration = (expiry_time - getCurrentTimestampInSeconds()) / 60;
    console.log(`remaining rate limit duration: ${rate_limit_remaining_duration} minutes`);
  },
  E2E_TEST_TIMEOUT,
);

test(
  "Super rate limited",
  async () => {
    extra_scope = PASSCODE_CHANGE_SCOPE;

    testRateLimitRecordId = await createTestSuperRateLimitRecord({
      onmouuid,
      domain: "auth_general",
      action: "eligibility",
    });

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
    const { expiry_time } = (await authorizeExtraScopeRes.json()) as RateLimitedBody;
    expect(authorizeExtraScopeRes.status).toBe(429);
    expect(expiry_time).toBe("no_expiry");

    const rateLimitRes = await queryTableMethod({
      TableName: `rate-limiting-staging`,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    const superRecord = rateLimitRes?.Items?.find((record) => record.super_rate_limited);

    // remove rate limit
    await invokeClearRateLimits(onmouuid, superRecord?.id);

    const secondAuthorizeExtraScopeRes = await invokeAuthorizeExtraScope(
      authorizeExtraScopeEvent,
      access_token,
    );
    expect(secondAuthorizeExtraScopeRes.status).toBe(200);
  },
  E2E_TEST_TIMEOUT,
);
