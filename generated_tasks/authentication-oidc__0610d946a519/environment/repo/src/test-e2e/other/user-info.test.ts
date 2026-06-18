import { test, expect, beforeAll, afterEach } from "vitest";
import {
  AUTH_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_ID_SCOPE,
  CREDIT_CARD_ID_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
} from "@libs/constants";
import { TEST_ACTIVE_CREDIT_CUSTOMER } from "@libs/testConstants";
import { verifyToken } from "@libs/crypto";
import { E2E_TEST_TIMEOUT, getPublicSigningKey, invokeUserInfo } from "../e2eTestUtils";
import { createTestTokenRecord, deleteTestTokenRecord } from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;

let pubKey: string;
let onmouuid: string;
let accountId: string;
let cardId: string;

let testAccessToken: CreateTestTokenRes;

beforeAll(async () => {
  pubKey = await getPublicSigningKey();
  onmouuid = TEST_ACTIVE_CREDIT_CUSTOMER.customerId;
  accountId = TEST_ACTIVE_CREDIT_CUSTOMER.coreBankingCreditAccountId;
  cardId = TEST_ACTIVE_CREDIT_CUSTOMER.cardId;
});

afterEach(async () => {
  await deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid });
});

test(
  `web -> ${LOAN_ACCOUNT_ID_SCOPE} scope (to be deprecated)`,
  async () => {
    const scope = LOAN_ACCOUNT_ID_SCOPE;

    testAccessToken = await createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "web",
    });
    const { access_token } = testAccessToken;
    const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
    expect(decodedAccessToken.scope).toEqual(scope);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const userInfoRes = await invokeUserInfo(onmouuid, access_token);

    console.dir(userInfoRes, { depth: 10 });

    const userInfoBody = (await userInfoRes.json()) as { loanAccountId: string };
    console.dir(userInfoBody, { depth: 10 });
    expect(userInfoRes.status).toBe(200);
    expect(userInfoBody).toEqual({ loanAccountId: accountId });
  },
  E2E_TEST_TIMEOUT,
);

test(
  `web -> ${CREDIT_CARD_ACCOUNT_ID_SCOPE} scope (to replace ${LOAN_ACCOUNT_ID_SCOPE} scope)`,
  async () => {
    const scope = CREDIT_CARD_ACCOUNT_ID_SCOPE;

    testAccessToken = await createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "web",
    });
    const { access_token } = testAccessToken;
    const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
    expect(decodedAccessToken.scope).toEqual(scope);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const userInfoRes = await invokeUserInfo(onmouuid, access_token);
    const userInfoBody = (await userInfoRes.json()) as { loanAccountId: string };
    expect(userInfoRes.status).toBe(200);
    expect(userInfoBody).toEqual({ credit_card_account_id: accountId });
  },
  E2E_TEST_TIMEOUT,
);

test(
  `app -> ${CREDIT_CARD_ACCOUNT_ID_SCOPE} scope`,
  async () => {
    const scope = CREDIT_CARD_ACCOUNT_ID_SCOPE;

    testAccessToken = await createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "app",
    });
    const { access_token } = testAccessToken;
    const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
    expect(decodedAccessToken.scope).toEqual(scope);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const userInfoRes = await invokeUserInfo(onmouuid, access_token);
    const userInfoBody = (await userInfoRes.json()) as { loanAccountId: string };
    expect(userInfoRes.status).toBe(200);
    expect(userInfoBody).toEqual({ credit_card_account_id: accountId });
  },
  E2E_TEST_TIMEOUT,
);

test(
  `app -> ${CREDIT_CARD_ID_SCOPE} scope`,
  async () => {
    const scope = CREDIT_CARD_ID_SCOPE;

    testAccessToken = await createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "app",
    });
    const { access_token } = testAccessToken;
    const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
    expect(decodedAccessToken.scope).toEqual(scope);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const userInfoRes = await invokeUserInfo(onmouuid, access_token);
    const userInfoBody = (await userInfoRes.json()) as { loanAccountId: string };
    expect(userInfoRes.status).toBe(200);
    expect(userInfoBody).toEqual({ credit_card_id: cardId });
  },
  E2E_TEST_TIMEOUT,
);

test(
  `no valid scopes`,
  async () => {
    const scope = AUTH_SERVICES_SCOPE;

    testAccessToken = await createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "app",
    });
    const { access_token } = testAccessToken;
    const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
    expect(decodedAccessToken.scope).toEqual(scope);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const userInfoRes = await invokeUserInfo(onmouuid, access_token);
    expect(userInfoRes.status).toBe(401);
  },
  E2E_TEST_TIMEOUT,
);
