import { test, expect, beforeEach, afterEach } from "vitest";
import {
  COMPLETED_STATUS,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/constants";
import { TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getUniqueTestNumber,
  invokeAuthorizeOTPPasscode,
  invokeNextEndpoint,
} from "../e2eTestUtils";
import {
  createTestLegacyAuthRecords,
  deleteLegacyAuthRecord,
  deleteLegacyRSARecord,
  deleteTestAuthHashRecord,
  deleteTestCreditCustomerAccount,
  generateUniqueIdentifier,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
} from "@libs/testUtils";

type NextEndpoint = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpoint;
type NextEndpointBody = { message: string } & NextEndpoint;
type UnprocessableBody = { error_code: string } & NextEndpoint;

const code_verifier = "otp-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;
const incorrect_code = 2222;

let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

beforeEach(async () => {
  device_id = generateUniqueIdentifier();
  phone_number = await getUniqueTestNumber(1700);
  testCreditCustomerAccount = await setUpTestCreditCustomerAccount({
    mobile_phone: phone_number,
    onboarded_status: COMPLETED_STATUS,
  });
  onmouuid = testCreditCustomerAccount.customerId;
  await createTestLegacyAuthRecords({ onmouuid, passcode: TEST_PASSCODE });
});

afterEach(async () => {
  await Promise.all([
    deleteTestCreditCustomerAccount(testCreditCustomerAccount),
    deleteLegacyAuthRecord(onmouuid),
    deleteLegacyRSARecord(onmouuid),
    deleteTestAuthHashRecord(onmouuid),
  ]);
});

test(
  "otp attempt limit reached -> restart auth flow",
  async () => {
    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    expect(authorizeRes.status).toBe(200);

    const sendOTPEvent = { phone_number };
    const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, authorizeBody.next_endpoint);
    const sendOTPBody = (await sendOTPRes.json()) as NextEndpointBody;
    expect(sendOTPRes.status).toBe(200);

    // first otp verify attempt
    const firstVerifyOTPEvent = { phone_number, verify_code: incorrect_code };
    const firstVerifyOTPRes = await invokeNextEndpoint(
      firstVerifyOTPEvent,
      sendOTPBody.next_endpoint,
    );
    const firstVerifyOTPBody = (await firstVerifyOTPRes.json()) as UnprocessableBody;
    expect(firstVerifyOTPRes.status).toBe(422);
    expect(firstVerifyOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

    // second otp verify attempt
    const secondVerifyOTPEvent = { phone_number, verify_code: incorrect_code };
    const secondVerifyOTPRes = await invokeNextEndpoint(
      secondVerifyOTPEvent,
      firstVerifyOTPBody.next_endpoint,
    );
    const secondVerifyOTPBody = (await secondVerifyOTPRes.json()) as UnprocessableBody;
    expect(secondVerifyOTPRes.status).toBe(422);
    expect(secondVerifyOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

    // final otp verify attempt
    const finalVerifyOTPEvent = { phone_number, verify_code: incorrect_code };
    const finalVerifyOTPRes = await invokeNextEndpoint(
      finalVerifyOTPEvent,
      secondVerifyOTPBody.next_endpoint,
    );
    const finalVerifyOTPBody = (await finalVerifyOTPRes.json()) as UnprocessableBody;
    expect(finalVerifyOTPRes.status).toBe(422);
    expect(finalVerifyOTPBody.error_code).toEqual(OTP_INVALID_ATTEMPT_LIMIT_REACHED);
    expect(finalVerifyOTPBody.next_endpoint).toEqual("authorize/otp-passcode");
  },
  E2E_TEST_TIMEOUT,
);
