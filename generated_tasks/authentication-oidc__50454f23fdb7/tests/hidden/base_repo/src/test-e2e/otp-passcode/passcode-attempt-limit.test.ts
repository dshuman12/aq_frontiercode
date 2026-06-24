import { test, expect, beforeEach, afterEach, describe } from "vitest";
import {
  COMPLETED_STATUS,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/config";
import { TEST_PASSCODE } from "@libs/testConstants";

import { generateCodeChallenge } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getUniqueTestNumber,
  invokeAuthorizeOTPPasscode,
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

type NextEndpoint = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpoint;
type NextEndpointBody = { message: string } & NextEndpoint;
type UnprocessableBody = { error_code: string } & NextEndpoint;

const code_verifier = "passcode-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;
const incorrect_passcode = "654321";

let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(1900);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: phone_number,
      onboarded_status: COMPLETED_STATUS,
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

  async function runFirstTimeLoginLimitTest(initialSetup: () => Promise<void>) {
    device_id = generateUniqueIdentifier();
    await initialSetup();

    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    expect(authorizeRes.status).toBe(200);

    const sendOTPEvent = { phone_number };
    const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, authorizeBody.next_endpoint);
    const sendOTPBody = (await sendOTPRes.json()) as NextEndpointBody;
    expect(sendOTPRes.status).toBe(200);

    const verifyOTPEvent = { phone_number, verify_code: 1111 };
    const verifyOTPRes = await invokeNextEndpoint(verifyOTPEvent, sendOTPBody.next_endpoint);
    const verifyOTPBody = (await verifyOTPRes.json()) as NextEndpointBody;
    expect(verifyOTPRes.status).toBe(200);

    // first passcode verify attempt
    const firstVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const firstVerifyPasscodeRes = await invokeNextEndpoint(
      firstVerifyPasscodeEvent,
      verifyOTPBody.next_endpoint,
    );
    const firstVerifyPasscodeBody = (await firstVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(firstVerifyPasscodeRes.status).toBe(422);
    expect(firstVerifyPasscodeBody.error_code).toEqual(PASSCODE_INVALID_REATTEMPT);

    // second passcode verify attempt
    const secondVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const secondVerifyPasscodeRes = await invokeNextEndpoint(
      secondVerifyPasscodeEvent,
      firstVerifyPasscodeBody.next_endpoint,
    );
    const secondVerifyPasscodeBody = (await secondVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(secondVerifyPasscodeRes.status).toBe(422);
    expect(secondVerifyPasscodeBody.error_code).toEqual(PASSCODE_INVALID_REATTEMPT);

    // final passcode verify attempt
    const finalVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const finalVerifyPasscodeRes = await invokeNextEndpoint(
      finalVerifyPasscodeEvent,
      secondVerifyPasscodeBody.next_endpoint,
    );
    const finalVerifyPasscodeBody = (await finalVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(finalVerifyPasscodeRes.status).toBe(422);
    expect(finalVerifyPasscodeBody.error_code).toEqual(PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED);
    expect(finalVerifyPasscodeBody.next_endpoint).toEqual("authorize/otp-passcode");
  }

  async function runReloginLimitTest(initialSetup: () => Promise<void>) {
    device_id = testCreditCustomerAccount.device_id;
    await initialSetup();

    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    expect(authorizeRes.status).toBe(200);

    // first passcode verify attempt
    const firstVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const firstVerifyPasscodeRes = await invokeNextEndpoint(
      firstVerifyPasscodeEvent,
      authorizeBody.next_endpoint,
    );
    const firstVerifyPasscodeBody = (await firstVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(firstVerifyPasscodeRes.status).toBe(422);

    // second passcode verify attempt
    const secondVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const secondVerifyPasscodeRes = await invokeNextEndpoint(
      secondVerifyPasscodeEvent,
      firstVerifyPasscodeBody.next_endpoint,
    );
    const secondVerifyPasscodeBody = (await secondVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(secondVerifyPasscodeRes.status).toBe(422);

    // final passcode verify attempt
    const finalVerifyPasscodeEvent = { passcode: incorrect_passcode };
    const finalVerifyPasscodeRes = await invokeNextEndpoint(
      finalVerifyPasscodeEvent,
      secondVerifyPasscodeBody.next_endpoint,
    );
    const finalVerifyPasscodeBody = (await finalVerifyPasscodeRes.json()) as UnprocessableBody;
    expect(finalVerifyPasscodeRes.status).toBe(422);
    expect(finalVerifyPasscodeBody.next_endpoint).toEqual("authorize/otp-passcode");
  }

  test(
    "passcode attempt limit reached - first time login - encrypted passcode -> restart auth flow",
    async () => {
      await runFirstTimeLoginLimitTest(async () => {
        await createTestLegacyAuthRecords({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "passcode attempt limit reached - relogin - encrypted passcode -> restart auth flow",
    async () => {
      await runReloginLimitTest(async () => {
        await createTestLegacyAuthRecords({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "passcode attempt limit reached - first time login - hashed passcode -> restart auth flow",
    async () => {
      await runFirstTimeLoginLimitTest(async () => {
        await createTestAuthHashRecord({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );

  test(
    "passcode attempt limit reached - relogin - hashed passcode -> restart auth flow",
    async () => {
      await runReloginLimitTest(async () => {
        await createTestAuthHashRecord({ onmouuid, passcode: TEST_PASSCODE });
      });
    },
    E2E_TEST_TIMEOUT,
  );
});
