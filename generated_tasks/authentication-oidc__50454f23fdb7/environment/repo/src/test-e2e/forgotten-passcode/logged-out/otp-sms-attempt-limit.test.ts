import { test, expect, beforeEach, afterEach, describe } from "vitest";
import {
  COMPLETED_STATUS,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
} from "@libs/config";
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
  testModes,
} from "@libs/testUtils";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type UnprocessableBody = { error_code: string } & NextEndpointBody;

const code_verifier = "otp-sms-attempt-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const passcode = TEST_PASSCODE;
const incorrect_code = 2222;

let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeEach(async () => {
    phone_number = await getUniqueTestNumber(1300);
    testCreditCustomerAccount = await setUpTestCreditCustomerAccount(codePath, {
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

      // first otp verify attempt
      const firstVerifyOTPEvent = { verify_code: incorrect_code };
      const firstVerifyOTPRes = await invokeNextEndpoint(
        firstVerifyOTPEvent,
        forgotPassSendOTPBody.next_endpoint,
      );
      const firstVerifyOTPBody = (await firstVerifyOTPRes.json()) as UnprocessableBody;
      expect(firstVerifyOTPRes.status).toBe(422);
      expect(firstVerifyOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

      // second otp verify attempt
      const secondVerifyOTPEvent = { verify_code: incorrect_code };
      const secondVerifyOTPRes = await invokeNextEndpoint(
        secondVerifyOTPEvent,
        firstVerifyOTPBody.next_endpoint,
      );
      const secondVerifyOTPBody = (await secondVerifyOTPRes.json()) as UnprocessableBody;
      expect(secondVerifyOTPRes.status).toBe(422);
      expect(secondVerifyOTPBody.error_code).toEqual(OTP_INVALID_REATTEMPT);

      // final otp verify attempt
      const finalVerifyOTPEvent = { verify_code: incorrect_code };
      const finalVerifyOTPRes = await invokeNextEndpoint(
        finalVerifyOTPEvent,
        secondVerifyOTPBody.next_endpoint,
      );
      const finalVerifyOTPBody = (await finalVerifyOTPRes.json()) as UnprocessableBody;
      expect(finalVerifyOTPRes.status).toBe(422);
      expect(finalVerifyOTPBody.error_code).toEqual(OTP_INVALID_ATTEMPT_LIMIT_REACHED);
      expect(finalVerifyOTPBody.next_endpoint).toEqual("authorize/forgotten-passcode/logged-out");
    },
    E2E_TEST_TIMEOUT,
  );
});
