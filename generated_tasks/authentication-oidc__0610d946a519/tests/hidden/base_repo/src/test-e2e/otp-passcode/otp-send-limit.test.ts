import { test, expect, beforeEach, afterEach } from "vitest";
import {
  COMPLETED_STATUS,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_SEND_LIMIT_REACHED,
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
  updateAttributesOnRecord,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";

type NextEndpoint = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpoint;
type NextEndpointBody = { message: string } & NextEndpoint;
type UnprocessableBody = { error_code: string } & NextEndpoint;

const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

const code_verifier = "otp-send-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;

let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;

beforeEach(async () => {
  device_id = generateUniqueIdentifier();
  phone_number = await getUniqueTestNumber(1800);
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
  "otp send limit reached - each otp expired -> restart auth flow",
  async () => {
    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeBody;
    expect(authorizeRes.status).toBe(200);

    // first otp send
    const sendOTPEvent = { phone_number };
    const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, authorizeBody.next_endpoint);
    const sendOTPBody = (await sendOTPRes.json()) as NextEndpointBody;
    expect(sendOTPRes.status).toBe(200);

    // expire first otp on transaction
    await updateAttributesOnRecord({
      tableName: auth_transactions_table,
      keyName: "transaction_id",
      keyValue: transaction_id,
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const firstVerifyOTPEvent = { phone_number, verify_code: 1111 };
    const firstVerifyOTPRes = await invokeNextEndpoint(
      firstVerifyOTPEvent,
      sendOTPBody.next_endpoint,
    );
    const firstVerifyOTPBody = (await firstVerifyOTPRes.json()) as UnprocessableBody;
    expect(firstVerifyOTPRes.status).toBe(422);
    expect(firstVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_RESEND);

    // second otp send
    const firstResendOTPEvent = { phone_number };
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
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const secondVerifyOTPEvent = { phone_number, verify_code: 1111 };
    const secondVerifyOTPRes = await invokeNextEndpoint(
      secondVerifyOTPEvent,
      firstResendOTPBody.next_endpoint,
    );
    const secondVerifyOTPBody = (await secondVerifyOTPRes.json()) as UnprocessableBody;
    expect(secondVerifyOTPRes.status).toBe(422);
    expect(secondVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_RESEND);

    // final otp send
    const finalResendOTPEvent = { phone_number };
    const finalResendOTPRes = await invokeNextEndpoint(
      finalResendOTPEvent,
      secondVerifyOTPBody.next_endpoint,
    );
    const finalResendOTPBody = (await finalResendOTPRes.json()) as NextEndpointBody;
    expect(finalResendOTPRes.status).toBe(200);

    // expire final otp on transaction
    await updateAttributesOnRecord({
      tableName: auth_transactions_table,
      keyName: "transaction_id",
      keyValue: transaction_id,
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const finalVerifyOTPEvent = { phone_number, verify_code: 1111 };
    const finalVerifyOTPRes = await invokeNextEndpoint(
      finalVerifyOTPEvent,
      finalResendOTPBody.next_endpoint,
    );
    const finalVerifyOTPBody = (await finalVerifyOTPRes.json()) as UnprocessableBody;
    expect(finalVerifyOTPRes.status).toBe(422);
    expect(finalVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_SEND_LIMIT_REACHED);
    expect(finalVerifyOTPBody.next_endpoint).toEqual("authorize/otp-passcode");
  },
  E2E_TEST_TIMEOUT,
);

test(
  "otp send limit reached - manually resent -> restart auth flow",
  async () => {
    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeBody;
    expect(authorizeRes.status).toBe(200);

    const resendURL = `${transaction_id}/otp-passcode/otp/resend`;

    // first otp send
    const sendOTPEvent = { phone_number };
    const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, authorizeBody.next_endpoint);
    expect(sendOTPRes.status).toBe(200);

    // second otp send (manually requested)
    const firstResendOTPEvent = { phone_number };
    const firstResendOTPRes = await invokeNextEndpoint(firstResendOTPEvent, resendURL);
    expect(firstResendOTPRes.status).toBe(200);

    // final otp send (manually requested)
    const finalResendOTPEvent = { phone_number };
    const finalResendOTPRes = await invokeNextEndpoint(finalResendOTPEvent, resendURL);
    expect(finalResendOTPRes.status).toBe(200);

    // invalid otp send (manually requested)
    const invalidResendOTPEvent = { phone_number };
    const invalidResendOTPRes = await invokeNextEndpoint(invalidResendOTPEvent, resendURL);
    const invalidResendOTPBody = (await invalidResendOTPRes.json()) as UnprocessableBody;
    expect(invalidResendOTPRes.status).toBe(422);
    expect(invalidResendOTPBody.error_code).toEqual(OTP_SEND_LIMIT_REACHED);
    expect(invalidResendOTPBody.next_endpoint).toEqual("authorize/otp-passcode");
  },
  E2E_TEST_TIMEOUT,
);
