import { test, expect, beforeAll, afterAll, afterEach, describe } from "vitest";
import {
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  CREDIT_CARD_ACCOUNT_ID_SCOPE,
  CREDIT_CARD_ID_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
} from "@libs/config";
import { TEST_ACTIVE_CREDIT_CUSTOMER } from "@libs/testConstants";
import { verifyToken } from "@libs/crypto";
import { E2E_TEST_TIMEOUT, getPublicSigningKey, invokeUserInfo } from "../e2eTestUtils";
import {
  createTestTokenRecord,
  deleteTestCreditCustomerAccount,
  deleteTestTokenRecord,
  ensureTestActiveCreditCustomerRecord,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  testModes,
  updateCustomerCardStatus,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

describe.each(testModes)("$codePath", ({ codePath }) => {
  let pubKey: string;
  let onmouuid: string;
  let accountId: string;
  let cardId: string;
  let testCreditCustomerAccount: TestCreditAccountUserCreds | undefined;
  let testAccessToken: CreateTestTokenRes;

  beforeAll(async () => {
    pubKey = await getPublicSigningKey();
    if (codePath === "HAL") {
      testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath);
      onmouuid = testCreditCustomerAccount.customerId;
      accountId = testCreditCustomerAccount.mambuCreditCardAccountID!;
      cardId = testCreditCustomerAccount.cardId!;
      await updateCustomerCardStatus(cardId, "ACTIVE");
    } else {
      await ensureTestActiveCreditCustomerRecord();
      onmouuid = TEST_ACTIVE_CREDIT_CUSTOMER.customerId;
      accountId = TEST_ACTIVE_CREDIT_CUSTOMER.coreBankingCreditAccountId;
      cardId = TEST_ACTIVE_CREDIT_CUSTOMER.cardId;
    }
  });

  afterAll(async () => {
    if (codePath === "HAL" && testCreditCustomerAccount) {
      await deleteTestCreditCustomerAccount(testCreditCustomerAccount);
    }
  });

  afterEach(async () => {
    await deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid });
  });

  test(
    `web -> ${LOAN_ACCOUNT_ID_SCOPE} scope (to be deprecated)`,
    async () => {
      const scope = LOAN_ACCOUNT_ID_SCOPE;

      testAccessToken = await createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
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
      expect(userInfoBody).toEqual({ loanAccountId: accountId });
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `web -> ${CREDIT_CARD_ACCOUNT_ID_SCOPE} scope (to replace ${LOAN_ACCOUNT_ID_SCOPE} scope)`,
    async () => {
      const scope = CREDIT_CARD_ACCOUNT_ID_SCOPE;

      testAccessToken = await createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
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
        tableName: AUTH_TOKENS_TABLE,
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
        tableName: AUTH_TOKENS_TABLE,
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
      testAccessToken = await createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
        scope: AUTH_SERVICES_SCOPE,
        environment: "staging",
        expiryTimeMinutes: 15,
        onmouuid,
        domain: "app",
      });
      const { access_token } = testAccessToken;
      const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
      expect(decodedAccessToken.scope).toEqual(AUTH_SERVICES_SCOPE);
      expect(decodedAccessToken.sub).toEqual(onmouuid);
      console.log(
        `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
      );

      const userInfoRes = await invokeUserInfo(onmouuid, access_token);
      expect(userInfoRes.status).toBe(401);
    },
    E2E_TEST_TIMEOUT,
  );
});
