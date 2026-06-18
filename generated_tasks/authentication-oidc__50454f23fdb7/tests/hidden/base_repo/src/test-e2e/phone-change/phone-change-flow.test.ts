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
  template_id?: string;
  redirect_url?: string;
  email_masked?: string;
};
type VerifyOTPBody = { next_endpoint: string };
type VerifyPasscodeBody = { message: string; next_endpoint: string; auth_code: string };
type TokenBody = { access_token: string; refresh_token: string };
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const code_verifier = "phone-change";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${AUTH_SERVICES_SCOPE}`;
const extra_scope = `${TEST_OTP_STEP_EXTRA_SCOPE}`;

let pubKey: string;
let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;
let testNewPhoneNumber: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    pubKey = await getPublicSigningKey();
  });

  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(500);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: "COMPLETED",
    });
    onmouuid = testCreditCustomerAccount.customerId;
    device_id = testCreditCustomerAccount.device_id;

    // Generate a unique test phone number that is different from the current phone number
    testNewPhoneNumber = await getUniqueTestNumber(2400);

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
      createTestAuthHashRecord({ onmouuid, passcode: TEST_PASSCODE }),
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
    "phone change flow - OTP verification",
    async () => {
      const { access_token } = testAccessToken;

      // Verify initial tokens
      const decodedAccessToken = await verifyToken({ token: access_token, pubKey });
      expect(decodedAccessToken.scope).toEqual(scope);
      expect(decodedAccessToken.sub).toEqual(onmouuid);

      // 1. Authorize for test extra scope - this will help us test without real phone eligibility requirements
      const authorizeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
        new_phone_number: testNewPhoneNumber,
      };

      const authorizeRes = await invokeAuthorizeExtraScope(authorizeEvent, access_token);
      expect(authorizeRes.status).toBe(200);

      const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
      const { transaction_id, next_endpoint } = authorizeBody;

      // 2. Initiate phone change - this normally sends OTP to the new phone number
      const initiateEvent = {};
      const initiateRes = await invokeNextEndpoint(initiateEvent, next_endpoint, access_token);
      expect(initiateRes.status).toBe(200);

      const initiateBody = (await initiateRes.json()) as SendOTPBody;

      // Verify the response
      expect(initiateBody.message).toBe("OTP sent successfully");
      expect(initiateBody.next_endpoint).toBeDefined();
      expect(initiateBody.next_endpoint).toContain(`${transaction_id}/extra-scope/otp/verify`);

      // 3. Verify OTP sent to the new phone
      const verifyOTPEvent = { verify_code: 1111 };
      const verifyOTPRes = await invokeNextEndpoint(
        verifyOTPEvent,
        initiateBody.next_endpoint,
        access_token,
      );
      expect(verifyOTPRes.status).toBe(200);

      const verifyOTPBody = (await verifyOTPRes.json()) as VerifyOTPBody;

      // Verify we have a next_endpoint and it's the correct one
      expect(verifyOTPBody.next_endpoint).toBeDefined();
      expect(verifyOTPBody.next_endpoint).toContain(
        `${transaction_id}/extra-scope/passcode/verify`,
      );

      // 4. Verify passcode after OTP
      const verifyPasscodeEvent = { passcode: TEST_PASSCODE };
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
        const combined_scope = `${scope},${extra_scope}`;
        expect(newDecodedAccessToken.scope.split(",").sort().join(",")).toEqual(
          combined_scope.split(",").sort().join(","),
        );
      }

      // Clean up - delete transaction
      await deleteTestTransaction(transaction_id);
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "phone change flow - invalid OTP",
    async () => {
      const { access_token } = testAccessToken;

      // 1. Authorize for test extra scope
      const authorizeEvent = {
        onmouuid,
        scope: extra_scope,
        code_challenge,
        device_id,
        new_phone_number: testNewPhoneNumber,
      };

      const authorizeRes = await invokeAuthorizeExtraScope(authorizeEvent, access_token);
      expect(authorizeRes.status).toBe(200);

      const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
      const { transaction_id, next_endpoint } = authorizeBody;

      // 2. Initiate phone change
      const initiateEvent = {};
      const initiateRes = await invokeNextEndpoint(initiateEvent, next_endpoint, access_token);
      expect(initiateRes.status).toBe(200);

      const initiateBody = (await initiateRes.json()) as SendOTPBody;

      // 3. Verify OTP with INVALID code
      const verifyOTPEvent = { verify_code: 9999 }; // Invalid OTP
      const verifyOTPRes = await invokeNextEndpoint(
        verifyOTPEvent,
        initiateBody.next_endpoint,
        access_token,
      );

      // Expect error status code
      expect([400, 422].includes(verifyOTPRes.status)).toBe(true);

      // Clean up
      await deleteTestTransaction(transaction_id);
    },
    E2E_TEST_TIMEOUT,
  );
});
