import { test, expect, beforeEach, afterEach, beforeAll } from "vitest";
import {
  AUTH_SERVICES_SCOPE,
  COMPLETED_STATUS,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_SEND_LIMIT_REACHED,
} from "@libs/constants";
import { TEST_PASSCODE } from "@libs/testConstants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeForgottenPasscodeLoggedIn,
  invokeLogout,
  invokeNextEndpoint,
} from "../../e2eTestUtils";
import {
  createTestAuthHashRecord,
  createTestTokenRecord,
  deleteTestAuthHashRecord,
  deleteTestCreditCustomerAccount,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateAttributesOnRecord,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpointBody;
type UnprocessableBody = { error_code: string } & NextEndpointBody;
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;

const code_verifier = "otp-sms-send-limit";
const code_challenge = generateCodeChallenge(code_verifier);
const passcode = TEST_PASSCODE;
const existing_scopes = `${AUTH_SERVICES_SCOPE}`;

let pubKey: string;
let device_id: string;
let phone_number: string;
let testCreditCustomerAccount: TestCreditAccountUserCreds;
let onmouuid: string;
let testAccessToken: CreateTestTokenRes;
let testRefreshToken: CreateTestTokenRes;

beforeAll(async () => {
  pubKey = await getPublicSigningKey();
});

beforeEach(async () => {
  phone_number = await getUniqueTestNumber(900);
  testCreditCustomerAccount = await setUpTestCreditCustomerAccount({
    mobile_phone: phone_number,
    onboarded_status: COMPLETED_STATUS,
  });
  onmouuid = testCreditCustomerAccount.customerId;
  device_id = testCreditCustomerAccount.device_id;
  [testAccessToken, testRefreshToken] = await Promise.all([
    createTestTokenRecord({
      tableName: auth_tokens_table,
      scope: existing_scopes,
      environment: "staging",
      expiryTimeMinutes: 15,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      tableName: auth_refresh_tokens_table,
      scope: existing_scopes,
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
  "otp send limit reached - logged in && each otp expired -> restart forgotten-passcode auth flow",
  async () => {
    const { access_token } = testAccessToken;
    const { access_token: refresh_token } = testRefreshToken;

    const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
      verifyToken({ token: access_token, pubKey }),
      verifyToken({ token: refresh_token, pubKey }),
    ]);
    expect(decodedAccessToken.scope).toEqual(existing_scopes);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    expect(decodedRefreshToken.scope).toEqual(existing_scopes);
    expect(decodedRefreshToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.log(
      `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const authorizeForgotPassEvent = { onmouuid, device_id, code_challenge };
    const authorizeForgotPassRes = await invokeAuthorizeForgottenPasscodeLoggedIn(
      authorizeForgotPassEvent,
      access_token,
    );
    const authorizeForgotPassBody = (await authorizeForgotPassRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeForgotPassBody;
    expect(authorizeForgotPassRes.status).toBe(200);

    // first otp send
    const forgotPassSendOTPEvent = {};
    const forgotPassSendOTPRes = await invokeNextEndpoint(
      forgotPassSendOTPEvent,
      authorizeForgotPassBody.next_endpoint,
    );
    const forgotPassSendOTPBody = (await forgotPassSendOTPRes.json()) as NextEndpointBody;
    expect(forgotPassSendOTPRes.status).toBe(200);

    // expire first otp on transaction
    await updateAttributesOnRecord({
      tableName: auth_transactions_table,
      keyName: "transaction_id",
      keyValue: transaction_id,
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const firstVerifyOTPEvent = { verify_code: 1111 };
    const firstVerifyOTPRes = await invokeNextEndpoint(
      firstVerifyOTPEvent,
      forgotPassSendOTPBody.next_endpoint,
    );
    const firstVerifyOTPBody = (await firstVerifyOTPRes.json()) as UnprocessableBody;
    expect(firstVerifyOTPRes.status).toBe(422);
    expect(firstVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_RESEND);

    // second otp send
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
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() - 5 },
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
      attributes: { otp_sms_expiry_time: getCurrentTimestampInSeconds() - 5 },
    });

    const finalVerifyOTPEvent = { verify_code: 1111 };
    const finalVerifyOTPRes = await invokeNextEndpoint(
      finalVerifyOTPEvent,
      secondResendOTPBody.next_endpoint,
    );
    const finalVerifyOTPBody = (await finalVerifyOTPRes.json()) as UnprocessableBody;
    expect(finalVerifyOTPRes.status).toBe(422);
    expect(finalVerifyOTPBody.error_code).toEqual(OTP_EXPIRED_SEND_LIMIT_REACHED);
    expect(finalVerifyOTPBody.next_endpoint).toEqual("authorize/forgotten-passcode/logged-in");
  },
  E2E_TEST_TIMEOUT,
);

test(
  "otp send limit reached - logged in && manually resent -> restart extra-scope auth flow",
  async () => {
    const { access_token } = testAccessToken;
    const { access_token: refresh_token } = testRefreshToken;

    const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
      verifyToken({ token: access_token, pubKey }),
      verifyToken({ token: refresh_token, pubKey }),
    ]);
    expect(decodedAccessToken.scope).toEqual(existing_scopes);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    expect(decodedRefreshToken.scope).toEqual(existing_scopes);
    expect(decodedRefreshToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.log(
      `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const authorizeForgotPassEvent = { onmouuid, device_id, code_challenge };
    const authorizeForgotPassRes = await invokeAuthorizeForgottenPasscodeLoggedIn(
      authorizeForgotPassEvent,
      access_token,
    );
    const authorizeForgotPassBody = (await authorizeForgotPassRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeForgotPassBody;
    expect(authorizeForgotPassRes.status).toBe(200);

    const resendURL = `${transaction_id}/forgotten-passcode/otp/resend`;

    // first otp send
    const forgotPassSendOTPEvent = {};
    const forgotPassSendOTPRes = await invokeNextEndpoint(
      forgotPassSendOTPEvent,
      authorizeForgotPassBody.next_endpoint,
    );
    expect(forgotPassSendOTPRes.status).toBe(200);

    // second otp send (manually requested)
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
    expect(invalidResendOTPBody.next_endpoint).toEqual("authorize/forgotten-passcode/logged-in");

    const logoutEvent = { onmouuid };
    const logoutRes = await invokeLogout(logoutEvent, access_token);
    expect(logoutRes.status).toBe(200);

    const queryTokensTableRes = await queryTableMethod({
      TableName: auth_tokens_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    expect(queryTokensTableRes?.Count).toBe(0);

    const queryRefTokensTableRes = await queryTableMethod({
      TableName: auth_refresh_tokens_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    expect(queryRefTokensTableRes?.Count).toBe(0);
  },
  E2E_TEST_TIMEOUT,
);
