import { test, expect, beforeAll, beforeEach, afterEach, describe } from "vitest";
import {
  AUTH_REFRESH_TOKENS_TABLE,
  AUTH_SERVICES_SCOPE,
  AUTH_TOKENS_TABLE,
  TEST_OTP_STEP_EXTRA_SCOPE,
} from "@libs/config";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import { TEST_PASSCODE } from "@libs/testConstants";
import {
  E2E_TEST_TIMEOUT,
  getUniqueTestNumber,
  invokeAuthorizeExtraScope,
  invokeNextEndpoint,
  invokeLogout,
  getPublicSigningKey,
} from "../e2eTestUtils";
import {
  createTestTokenRecord,
  deleteTestCreditCustomerAccount,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  deleteTestTransaction,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  createTestAuthHashRecord,
  testModes,
} from "@libs/testUtils";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type SendOTPBody = {
  message: string;
  next_endpoint: string;
};
type VerifyOTPBody = { message: string; next_endpoint: string; auth_code?: string };
type VerifyPasscodeBody = { message: string; next_endpoint: string; auth_code: string };
type TokenBody = { access_token: string; refresh_token: string };
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const code_verifier = "email-change";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${AUTH_SERVICES_SCOPE}`;
const extra_scope = `${TEST_OTP_STEP_EXTRA_SCOPE}`;
const combined_scope = `${scope},${extra_scope}`;
const passcode = TEST_PASSCODE;

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
    phone_number = await getUniqueTestNumber(2200);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: "COMPLETED",
    });
    onmouuid = testCreditCustomerAccount.customerId;
    device_id = testCreditCustomerAccount.device_id;

    [testAccessToken, testRefreshToken] = await Promise.all([
      createTestTokenRecord({
        tableName: AUTH_TOKENS_TABLE,
        scope,
        environment: "staging",
        expiryTimeMinutes: 5,
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
      deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid }),
      deleteTestRefreshTokenRecord({ token_id: testRefreshToken.token_id, onmouuid }),
    ]);
  });

  test(
    "email change flow - happy path",
    async () => {
      const { access_token } = testAccessToken;

      // Verify initial tokens
      const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
      expect(decodedAccessToken.scope).toEqual(scope);
      expect(decodedAccessToken.sub).toEqual(onmouuid);

      // 1. Authorize for test extra scope (simulates extra scope flow without eligibility requirements)
      const authorizeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
      };

      const authorizeRes = await invokeAuthorizeExtraScope(authorizeEvent, access_token);
      expect(authorizeRes.status).toBe(200);

      const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
      const { transaction_id, next_endpoint } = authorizeBody;

      // 2. Send OTP to phone for verification
      const sendOTPEvent = {};
      const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, next_endpoint, access_token);
      expect(sendOTPRes.status).toBe(200);

      const sendOTPBody = (await sendOTPRes.json()) as SendOTPBody;
      expect(sendOTPBody.message).toBe("OTP sent successfully");

      // 3. Verify OTP from phone
      const verifyOTPEvent = { verify_code: 1111 };
      const verifyOTPRes = await invokeNextEndpoint(
        verifyOTPEvent,
        sendOTPBody.next_endpoint,
        access_token,
      );
      expect(verifyOTPRes.status).toBe(200);

      const verifyOTPBody = (await verifyOTPRes.json()) as VerifyOTPBody;

      // 4. Verify passcode after OTP
      const verifyPasscodeEvent = { passcode };
      const verifyPasscodeRes = await invokeNextEndpoint(
        verifyPasscodeEvent,
        verifyOTPBody.next_endpoint,
        access_token,
      );
      expect(verifyPasscodeRes.status).toBe(200);

      const verifyPasscodeBody = (await verifyPasscodeRes.json()) as VerifyPasscodeBody;
      const { auth_code } = verifyPasscodeBody;

      // 5. Get token with updated scopes
      const tokenEvent = {
        transaction_id,
        auth_code,
        code_verifier,
      };

      const tokenRes = await invokeNextEndpoint(
        tokenEvent,
        verifyPasscodeBody.next_endpoint,
        access_token,
      );
      expect(tokenRes.status).toBe(200);

      const tokenBody = (await tokenRes.json()) as TokenBody;
      const { access_token: new_access_token } = tokenBody;

      // 6. Verify new tokens have the combined scope
      const newDecodedAccessToken = await verifyToken({ token: new_access_token, pubKey });
      expect(newDecodedAccessToken.sub).toEqual(onmouuid);

      // Check that the scope exists and contains the expected scopes
      expect(newDecodedAccessToken.scope).toBeDefined();
      if (newDecodedAccessToken.scope) {
        expect(newDecodedAccessToken.scope.split(",").sort().join(",")).toEqual(
          combined_scope.split(",").sort().join(","),
        );
      }

      // 7. Clean up - delete transaction
      await deleteTestTransaction(transaction_id);

      // 8. Logout
      const logoutEvent = { onmouuid };
      const logoutRes = await invokeLogout(logoutEvent, new_access_token);
      expect(logoutRes.status).toBe(200);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "email change flow - invalid OTP",
    async () => {
      const { access_token } = testAccessToken;

      // Verify initial tokens
      const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
      expect(decodedAccessToken.scope).toEqual(scope);
      expect(decodedAccessToken.sub).toEqual(onmouuid);

      // 1. Authorize for test extra scope
      const authorizeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
      };

      const authorizeRes = await invokeAuthorizeExtraScope(authorizeEvent, access_token);
      expect(authorizeRes.status).toBe(200);

      const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
      const { transaction_id, next_endpoint } = authorizeBody;

      // 2. Send OTP to phone for verification
      const sendOTPEvent = {};
      const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, next_endpoint, access_token);
      expect(sendOTPRes.status).toBe(200);

      const sendOTPBody = (await sendOTPRes.json()) as SendOTPBody;

      // 3. Verify OTP from phone with INCORRECT code
      const verifyOTPEvent = { verify_code: 9999 }; // Invalid OTP
      const verifyOTPRes = await invokeNextEndpoint(
        verifyOTPEvent,
        sendOTPBody.next_endpoint,
        access_token,
      );

      // Expect a 422 or 400 status code for invalid OTP
      expect([400, 422].includes(verifyOTPRes.status)).toBe(true);

      // 4. Clean up
      await deleteTestTransaction(transaction_id);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "email change flow - invalid passcode",
    async () => {
      const { access_token } = testAccessToken;

      // Verify initial tokens
      const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
      expect(decodedAccessToken.scope).toEqual(scope);
      expect(decodedAccessToken.sub).toEqual(onmouuid);

      // 1. Authorize for test extra scope
      const authorizeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
      };

      const authorizeRes = await invokeAuthorizeExtraScope(authorizeEvent, access_token);
      expect(authorizeRes.status).toBe(200);

      const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
      const { transaction_id, next_endpoint } = authorizeBody;

      // 2. Send OTP to phone for verification
      const sendOTPEvent = {};
      const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, next_endpoint, access_token);
      expect(sendOTPRes.status).toBe(200);

      const sendOTPBody = (await sendOTPRes.json()) as SendOTPBody;

      // 3. Verify OTP from phone with correct code
      const verifyOTPEvent = { verify_code: 1111 };
      const verifyOTPRes = await invokeNextEndpoint(
        verifyOTPEvent,
        sendOTPBody.next_endpoint,
        access_token,
      );
      expect(verifyOTPRes.status).toBe(200);

      const verifyOTPBody = (await verifyOTPRes.json()) as VerifyOTPBody;

      // 4. Verify passcode with INCORRECT passcode
      const verifyPasscodeEvent = { passcode: "incorrect-passcode" };
      const verifyPasscodeRes = await invokeNextEndpoint(
        verifyPasscodeEvent,
        verifyOTPBody.next_endpoint,
        access_token,
      );

      // In the test environment, an invalid passcode returns a 400 error
      expect(verifyPasscodeRes.status).toBe(400);

      // 5. Clean up
      await deleteTestTransaction(transaction_id);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "email change flow - invalid code_verifier",
    async () => {
      const { access_token } = testAccessToken;

      // Verify initial tokens
      const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
      expect(decodedAccessToken.scope).toEqual(scope);
      expect(decodedAccessToken.sub).toEqual(onmouuid);

      // 1. Authorize for test extra scope
      const authorizeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
      };

      const authorizeRes = await invokeAuthorizeExtraScope(authorizeEvent, access_token);
      expect(authorizeRes.status).toBe(200);

      const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
      const { transaction_id, next_endpoint } = authorizeBody;

      // 2. Send OTP to phone for verification
      const sendOTPEvent = {};
      const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, next_endpoint, access_token);
      expect(sendOTPRes.status).toBe(200);

      const sendOTPBody = (await sendOTPRes.json()) as SendOTPBody;

      // 3. Verify OTP from phone
      const verifyOTPEvent = { verify_code: 1111 };
      const verifyOTPRes = await invokeNextEndpoint(
        verifyOTPEvent,
        sendOTPBody.next_endpoint,
        access_token,
      );
      expect(verifyOTPRes.status).toBe(200);

      const verifyOTPBody = (await verifyOTPRes.json()) as VerifyOTPBody;

      // 4. Verify passcode
      const verifyPasscodeEvent = { passcode };
      const verifyPasscodeRes = await invokeNextEndpoint(
        verifyPasscodeEvent,
        verifyOTPBody.next_endpoint,
        access_token,
      );
      expect(verifyPasscodeRes.status).toBe(200);

      const verifyPasscodeBody = (await verifyPasscodeRes.json()) as VerifyPasscodeBody;
      const { auth_code } = verifyPasscodeBody;

      // 5. Try to get token with incorrect code_verifier
      const tokenEvent = {
        transaction_id,
        auth_code,
        code_verifier: "incorrect-code-verifier",
      };

      const tokenRes = await invokeNextEndpoint(
        tokenEvent,
        verifyPasscodeBody.next_endpoint,
        access_token,
      );

      // Expect a failure when code_verifier doesn't match code_challenge
      expect(tokenRes.status).not.toBe(200);

      // 6. Clean up
      await deleteTestTransaction(transaction_id);
    },
    E2E_TEST_TIMEOUT,
  );
});
