import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  ADDRESS_CHANGE_SCOPE,
  AUTH_SERVICES_SCOPE,
  COMPLETED_STATUS,
  CREDIT_CARD_DETAILS_SCOPE,
  CREDIT_CARD_FREEZE_SCOPE,
  CREDIT_CARD_UNFREEZE_SCOPE,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  MOBILE_NUMBER_CHANGE_SCOPE,
  NAME_CHANGE_SCOPE,
} from "@libs/constants";
import { TEST_ACTIVE_CREDIT_CUSTOMER, TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeExtraScope,
  invokeEligibility,
} from "../e2eTestUtils";
import {
  createTestAuthHashRecord,
  createTestTokenRecord,
  deleteTestAuthHashRecord,
  deleteTestCreditCustomerAccount,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  deleteTestTransaction,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateCustomerCardStatus,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { corePaymentsAdapter } from "@onmoapp/onmo-adapters";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type EligibilityBody = { eligible_extra_scopes: string };
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

const code_verifier = "eligibility";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${AUTH_SERVICES_SCOPE}`;
const passcode = TEST_PASSCODE;

let pubKey: string;
let device_id: string;
let phone_number: string;
let extra_scope: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;
let testTransactionId: string;

let corePaymentsClient: Awaited<ReturnType<typeof corePaymentsAdapter>>;
let cardId: string;

beforeAll(async () => {
  pubKey = await getPublicSigningKey();
});

describe("not eligible", async () => {
  beforeEach(async () => {
    phone_number = await getUniqueTestNumber();
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
    `CREDIT_CARD_DETAILS_SCOPE`,
    async () => {
      extra_scope = CREDIT_CARD_DETAILS_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(
        CREDIT_CARD_DETAILS_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(500);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `CREDIT_CARD_FREEZE_SCOPE`,
    async () => {
      extra_scope = CREDIT_CARD_FREEZE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(
        CREDIT_CARD_FREEZE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(500);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `CREDIT_CARD_UNFREEZE_SCOPE`,
    async () => {
      extra_scope = CREDIT_CARD_UNFREEZE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(
        CREDIT_CARD_UNFREEZE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(500);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `NAME_CHANGE_SCOPE`,
    async () => {
      extra_scope = NAME_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(NAME_CHANGE_SCOPE);

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(500);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `EMAIL_ADDRESS_CHANGE_SCOPE`,
    async () => {
      extra_scope = EMAIL_ADDRESS_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(
        EMAIL_ADDRESS_CHANGE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(400);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `MOBILE_NUMBER_CHANGE_SCOPE`,
    async () => {
      extra_scope = MOBILE_NUMBER_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(
        MOBILE_NUMBER_CHANGE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(400);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `ADDRESS_CHANGE_SCOPE`,
    async () => {
      extra_scope = ADDRESS_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).not.toContain(ADDRESS_CHANGE_SCOPE);

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(200);
    },
    E2E_TEST_TIMEOUT,
  );
});

describe("is eligible", async () => {
  beforeAll(async () => {
    onmouuid = TEST_ACTIVE_CREDIT_CUSTOMER.customerId;
    device_id = TEST_ACTIVE_CREDIT_CUSTOMER.deviceId;
    cardId = TEST_ACTIVE_CREDIT_CUSTOMER.cardId;
  });

  beforeEach(async () => {
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
    await deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid });
    await deleteTestRefreshTokenRecord({ token_id: testRefreshToken.token_id, onmouuid });
    if (testTransactionId) await deleteTestTransaction(testTransactionId);
    await updateCustomerCardStatus(cardId, "ACTIVE");
  });

  test(
    `CREDIT_CARD_DETAILS_SCOPE`,
    async () => {
      extra_scope = CREDIT_CARD_DETAILS_SCOPE;
      await updateCustomerCardStatus(cardId, "ACTIVE");

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).toContain(CREDIT_CARD_DETAILS_SCOPE);

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
      testTransactionId = authorizeExtraScopeBody.transaction_id;
      expect(authorizeExtraScopeRes.status).toBe(200);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `CREDIT_CARD_FREEZE_SCOPE`,
    async () => {
      extra_scope = CREDIT_CARD_FREEZE_SCOPE;
      await corePaymentsClient?.setCardStatus(cardId, "ACTIVE");

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).toContain(CREDIT_CARD_FREEZE_SCOPE);

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
      testTransactionId = authorizeExtraScopeBody.transaction_id;
      expect(authorizeExtraScopeRes.status).toBe(200);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `CREDIT_CARD_UNFREEZE_SCOPE`,
    async () => {
      extra_scope = CREDIT_CARD_UNFREEZE_SCOPE;
      await updateCustomerCardStatus(cardId, "FREEZE");

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).toContain(
        CREDIT_CARD_UNFREEZE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
      testTransactionId = authorizeExtraScopeBody.transaction_id;
      expect(authorizeExtraScopeRes.status).toBe(200);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `ADDRESS_CHANGE_SCOPE`,
    async () => {
      extra_scope = ADDRESS_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).toContain(ADDRESS_CHANGE_SCOPE);

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      const authorizeExtraScopeBody = (await authorizeExtraScopeRes.json()) as AuthorizeBody;
      testTransactionId = authorizeExtraScopeBody.transaction_id;
      expect(authorizeExtraScopeRes.status).toBe(200);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `EMAIL_ADDRESS_CHANGE_SCOPE`,
    async () => {
      extra_scope = EMAIL_ADDRESS_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).toContain(
        EMAIL_ADDRESS_CHANGE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(400);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    `MOBILE_NUMBER_CHANGE_SCOPE`,
    async () => {
      extra_scope = MOBILE_NUMBER_CHANGE_SCOPE;

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

      const eligibilityEvent = { onmouuid };
      const eligibilityRes = await invokeEligibility(eligibilityEvent, access_token);
      const eligibilityBody = (await eligibilityRes.json()) as EligibilityBody;
      expect(eligibilityRes.status).toBe(200);
      expect(eligibilityBody.eligible_extra_scopes.split(",")).toContain(
        MOBILE_NUMBER_CHANGE_SCOPE,
      );

      const authorizeExtraScopeEvent = { onmouuid, scope: extra_scope, code_challenge, device_id };
      const authorizeExtraScopeRes = await invokeAuthorizeExtraScope(
        authorizeExtraScopeEvent,
        access_token,
      );
      expect(authorizeExtraScopeRes.status).toBe(400);
    },
    E2E_TEST_TIMEOUT,
  );
});
