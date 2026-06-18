import { test, expect, beforeEach, afterEach } from "vitest";
import {
  COMPLETED_STATUS,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
} from "@libs/constants";
import { TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getUniqueTestNumber,
  invokeAuthorizeForgottenPasscodeLoggedOut,
  invokeNextEndpoint,
} from "../../e2eTestUtils";
import {
  createTestAuthHashRecord,
  deleteTestAuthHashRecord,
  deleteTestCreditCustomerAccount,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
} from "@libs/testUtils";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type UnprocessableBody = { error_code: string } & NextEndpointBody;

const code_verifier = "otp-email-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const passcode = TEST_PASSCODE;
const incorrect_code = 2222;

let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

beforeEach(async () => {
  phone_number = await getUniqueTestNumber(1100);
  testCreditCustomerAccount = await setUpTestCreditCustomerAccount({
    mobile_phone: phone_number,
    onboarded_status: COMPLETED_STATUS,
  });
  onmouuid = testCreditCustomerAccount.customerId;
  device_id = testCreditCustomerAccount.device_id;
  await createTestAuthHashRecord({ onmouuid, passcode });
});

afterEach(async () => {
  await Promise.all([
    deleteTestCreditCustomerAccount(testCreditCustomerAccount),
    deleteTestAuthHashRecord(onmouuid),
  ]);
});

test(
  "otp attempt limit reached - logged out -> restart extra-scope auth flow",
  async () => {
    const authorizeForgotPassEvent = { phone_number, device_id, code_challenge };
    const authorizeForgotPassRes =
      await invokeAuthorizeForgottenPasscodeLoggedOut(authorizeForgotPassEvent);
    const authorizeForgotPassBody = (await authorizeForgotPassRes.json()) as AuthorizeBody;
    expect(authorizeForgotPassRes.status).toBe(200);

    const forgotPassSendOTPEvent = {};
    const forgotPassSendOTPRes = await invokeNextEndpoint(
      forgotPassSendOTPEvent,
      authorizeForgotPassBody.next_endpoint,
    );
    const forgotPassSendOTPBody = (await forgotPassSendOTPRes.json()) as NextEndpointBody;
    expect(forgotPassSendOTPRes.status).toBe(200);

    const forgotPassVerifyOTPEvent = { verify_code: 1111 };
    const forgotPassVerifyOTPRes = await invokeNextEndpoint(
      forgotPassVerifyOTPEvent,
      forgotPassSendOTPBody.next_endpoint,
    );
    const forgotPassVerifyOTPBody = (await forgotPassVerifyOTPRes.json()) as NextEndpointBody;
    expect(forgotPassVerifyOTPRes.status).toBe(200);

    const forgotPassSendEmailEvent = {};
    const forgotPassSendEmailRes = await invokeNextEndpoint(
      forgotPassSendEmailEvent,
      forgotPassVerifyOTPBody.next_endpoint,
    );
    const forgotPassSendEmailBody = (await forgotPassSendEmailRes.json()) as NextEndpointBody;
    expect(forgotPassSendEmailRes.status).toBe(200);

    // first otp verify attempt
    const firstverifyEmailOTPEvent = { verify_code: incorrect_code };
    const firstverifyEmailOTPRes = await invokeNextEndpoint(
      firstverifyEmailOTPEvent,
      forgotPassSendEmailBody.next_endpoint,
    );
    const firstverifyEmailOTPBody = (await firstverifyEmailOTPRes.json()) as UnprocessableBody;
    expect(firstverifyEmailOTPRes.status).toBe(422);
    expect(firstverifyEmailOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

    // second otp verify attempt
    const secondverifyEmailOTPEvent = { verify_code: incorrect_code };
    const secondverifyEmailOTPRes = await invokeNextEndpoint(
      secondverifyEmailOTPEvent,
      firstverifyEmailOTPBody.next_endpoint,
    );
    const secondverifyEmailOTPBody = (await secondverifyEmailOTPRes.json()) as UnprocessableBody;
    expect(secondverifyEmailOTPRes.status).toBe(422);
    expect(secondverifyEmailOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

    // final otp verify attempt
    const finalverifyEmailOTPEvent = { verify_code: incorrect_code };
    const finalverifyEmailOTPRes = await invokeNextEndpoint(
      finalverifyEmailOTPEvent,
      secondverifyEmailOTPBody.next_endpoint,
    );
    const finalverifyEmailOTPBody = (await finalverifyEmailOTPRes.json()) as UnprocessableBody;
    expect(finalverifyEmailOTPRes.status).toBe(422);
    expect(finalverifyEmailOTPBody.error_code).toEqual(OTP_INVALID_ATTEMPT_LIMIT_REACHED);
    expect(finalverifyEmailOTPBody.next_endpoint).toEqual(
      "authorize/forgotten-passcode/logged-out",
    );
  },
  E2E_TEST_TIMEOUT,
);
