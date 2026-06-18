import { test, expect, beforeEach, afterEach } from "vitest";
import {
  COMPLETED_STATUS,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_SEND_LIMIT_REACHED,
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
  updateAttributesOnRecord,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type UnprocessableBody = { error_code: string } & NextEndpointBody;

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

const code_verifier = "otp-email-send-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const passcode = TEST_PASSCODE;

let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

beforeEach(async () => {
  phone_number = await getUniqueTestNumber(1200);
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
  "email otp send limit reached - logged out && each otp expired -> restart forgotten-passcode auth flow",
  async () => {
    const authorizeForgotPassEvent = { phone_number, device_id, code_challenge };
    const authorizeForgotPassRes =
      await invokeAuthorizeForgottenPasscodeLoggedOut(authorizeForgotPassEvent);
    const authorizeForgotPassBody = (await authorizeForgotPassRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeForgotPassBody;
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

    // first email otp send
    const forgotPassSendEmailEvent = {};
    const forgotPassSendEmailRes = await invokeNextEndpoint(
      forgotPassSendEmailEvent,
      forgotPassVerifyOTPBody.next_endpoint,
    );
    const forgotPassSendEmailBody = (await forgotPassSendEmailRes.json()) as NextEndpointBody;
    expect(forgotPassSendEmailRes.status).toBe(200);

    // expire first email otp on transaction
    await updateAttributesOnRecord({
      tableName: auth_transactions_table,
      keyName: "transaction_id",
      keyValue: transaction_id,
      attributes: { otp_email_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const firstVerifyOTPEvent = { verify_code: 1111 };
    const firstVerifyOTPRes = await invokeNextEndpoint(
      firstVerifyOTPEvent,
      forgotPassSendEmailBody.next_endpoint,
    );
    const firstVerifyOTPBody = (await firstVerifyOTPRes.json()) as UnprocessableBody;
    expect(firstVerifyOTPRes.status).toBe(422);
    expect(firstVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_RESEND);

    // second email otp send
    const firstResendOTPEvent = {};
    const firstResendOTPRes = await invokeNextEndpoint(
      firstResendOTPEvent,
      firstVerifyOTPBody.next_endpoint,
    );
    const firstResendOTPBody = (await firstResendOTPRes.json()) as NextEndpointBody;
    expect(firstResendOTPRes.status).toBe(200);

    // expire second otp on transaction
    await updateAttributesOnRecord({
      tableName: auth_transactions_table,
      keyName: "transaction_id",
      keyValue: transaction_id,
      attributes: { otp_email_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const secondVerifyOTPEvent = { verify_code: 1111 };
    const secondVerifyOTPRes = await invokeNextEndpoint(
      secondVerifyOTPEvent,
      firstResendOTPBody.next_endpoint,
    );
    const secondVerifyOTPBody = (await secondVerifyOTPRes.json()) as UnprocessableBody;
    expect(secondVerifyOTPRes.status).toBe(422);
    expect(secondVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_RESEND);

    // final otp send
    const secondResendOTPEvent = {};
    const secondResendOTPRes = await invokeNextEndpoint(
      secondResendOTPEvent,
      secondVerifyOTPBody.next_endpoint,
    );
    const secondResendOTPBody = (await secondResendOTPRes.json()) as NextEndpointBody;
    expect(secondResendOTPRes.status).toBe(200);

    // expire final otp on transaction
    await updateAttributesOnRecord({
      tableName: auth_transactions_table,
      keyName: "transaction_id",
      keyValue: transaction_id,
      attributes: { otp_email_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const finalVerifyOTPEvent = { verify_code: 1111 };
    const finalVerifyOTPRes = await invokeNextEndpoint(
      finalVerifyOTPEvent,
      secondResendOTPBody.next_endpoint,
    );
    const finalVerifyOTPBody = (await finalVerifyOTPRes.json()) as UnprocessableBody;
    expect(finalVerifyOTPRes.status).toBe(422);
    expect(finalVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_SEND_LIMIT_REACHED);
    expect(finalVerifyOTPBody.next_endpoint).toEqual("authorize/forgotten-passcode/logged-out");
  },
  E2E_TEST_TIMEOUT,
);

test(
  "email otp send limit reached - logged out && manually resent -> restart forgotten-passcode auth flow",
  async () => {
    const authorizeForgotPassEvent = { phone_number, device_id, code_challenge };
    const authorizeForgotPassRes =
      await invokeAuthorizeForgottenPasscodeLoggedOut(authorizeForgotPassEvent);
    const authorizeForgotPassBody = (await authorizeForgotPassRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeForgotPassBody;
    expect(authorizeForgotPassRes.status).toBe(200);

    const resendURL = `${transaction_id}/forgotten-passcode/email/resend`;

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

    // first email otp send
    const forgotPassSendEmailEvent = {};
    const forgotPassSendEmailRes = await invokeNextEndpoint(
      forgotPassSendEmailEvent,
      forgotPassVerifyOTPBody.next_endpoint,
    );
    expect(forgotPassSendEmailRes.status).toBe(200);

    // second email otp send (manually requested)
    const firstResendOTPEvent = {};
    const firstResendOTPRes = await invokeNextEndpoint(firstResendOTPEvent, resendURL);
    expect(firstResendOTPRes.status).toBe(200);

    // final otp send (manually requested)
    const secondResendOTPEvent = {};
    const secondResendOTPRes = await invokeNextEndpoint(secondResendOTPEvent, resendURL);
    expect(secondResendOTPRes.status).toBe(200);

    // invalid otp send (manually requested)
    const invalidResendOTPEvent = {};
    const invalidResendOTPRes = await invokeNextEndpoint(invalidResendOTPEvent, resendURL);
    const invalidResendOTPBody = (await invalidResendOTPRes.json()) as UnprocessableBody;
    expect(invalidResendOTPRes.status).toBe(422);
    expect(invalidResendOTPBody.error_code).toEqual(OTP_SEND_LIMIT_REACHED);
    expect(invalidResendOTPBody.next_endpoint).toEqual("authorize/forgotten-passcode/logged-out");
  },
  E2E_TEST_TIMEOUT,
);
