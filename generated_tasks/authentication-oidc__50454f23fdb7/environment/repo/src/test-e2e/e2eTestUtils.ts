import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { SigningKeySecrets } from "@shared-types/secrets";
import { createSign, randomInt } from "crypto";
import { inject } from "vitest";
import { ENV, ONMO_AUTH_URL, USER_TABLE } from "@libs/config";

export const onmo_auth_url = inject("apiURL") ?? ONMO_AUTH_URL;
export const api_test_secret = process.env.API_TEST_SECRET as string;

// -- constants
export const E2E_TEST_TIMEOUT = 60_000;
const AUTH_API_VERSION = process.env.E2E_API_VERSION || "next";

export const getDefaultHeaders = (token?: string, extras: object = {}) => {
  const isHal = process.env.WORKFLOW_CODE_PATH === "HAL";
  return {
    "Content-Type": "application/json",
    "x-api-test-secret": api_test_secret,
    ...(isHal ? { "x-force-hal": "true" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extras,
  };
};

// --email
export const invokeEmailChangeEmailResend = async (transactionId: string, token?: string) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/email-change/email/resend`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
export const invokeEmailChangeInitiate = async (transactionId: string, token: string) => {
  const email_change_initiate_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/email-change/initiate`;
  return await fetch(email_change_initiate_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
export const invokeEmailChangeOtpResend = async (transactionId: string, token?: string) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/email-change/otp/resend`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
export const invokeEmailChangeRedirect = async (
  transactionId: string,
  verifyCode: string,
  userAgent: string,
  token?: string,
) => {
  const email_change_redirect_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/email-change/redirect?verify_code=${verifyCode}`;

  return await fetch(email_change_redirect_url, {
    method: "GET",
    headers: getDefaultHeaders(token, { "User-Agent": userAgent }),
    redirect: "manual",
  });
};
export const invokeEmailChangeValidate = async (
  transactionId: string,
  verifyCode: number,
  token: string,
) => {
  const email_change_validate_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/email-change/validate`;
  return await fetch(email_change_validate_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({ verify_code: verifyCode }),
  });
};

// --phone change
export const invokePhoneChangeEmailRedirect = async (
  transactionId: string,
  userAgent: string,
  verifyCode?: string,
) => {
  const phone_change_email_redirect_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/email/redirect${verifyCode ? `?verify_code=${verifyCode}` : ""}`;

  const response = await fetch(phone_change_email_redirect_url, {
    method: "GET",
    headers: getDefaultHeaders(undefined, { "User-Agent": userAgent }),
    redirect: "manual",
  });

  return response;
};
export const invokePhoneChangeInitiate = async (transactionId: string, token: string) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/initiate`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
export const invokePhoneChangeEmailSend = async (transactionId: string, token: string) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/email/send`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
export const invokePhoneChangeEmailVerify = async (
  transactionId: string,
  token: string,
  verifyCode: number | string = 123456,
) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/email/verify`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({ verify_code: verifyCode }),
  });
};
export const invokePhoneChangeValidateOTP = async (
  transactionId: string,
  token: string,
  verifyCode: number | string = 123456,
) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/otp/verify`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({ verify_code: verifyCode }),
  });
};
export const invokePhoneChangeEmailResend = async (transactionId: string, token: string) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/email/resend`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
export const invokePhoneChangeOtpResend = async (transactionId: string, token: string) => {
  const url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/phone-change/otp/resend`;
  return await fetch(url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({}),
  });
};
// -- general
export const invokeToken = async (eventBody: any) => {
  const token_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/token`;
  return await fetch(token_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeLogout = async (eventBody: any, token: string) => {
  const logout_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/logout`;
  return await fetch(logout_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeEligibility = async (eventBody: any, token: string) => {
  const eligibility_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/eligibility`;
  return await fetch(eligibility_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeNextEndpoint = async (eventBody: any, nextEndpoint: string, token?: string) => {
  const next_endpoint_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${nextEndpoint}`;
  return await fetch(next_endpoint_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};

// -- otp-passcode
export const invokeAuthorizeOTPPasscode = async (eventBody: any) => {
  const authorize_otp_passcode_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/otp-passcode`;
  return await fetch(authorize_otp_passcode_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeOTPPasscodeSendOTP = async (eventBody: any, transactionId?: string) => {
  const otp_passcode_send_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp-passcode/otp/send`;
  return await fetch(otp_passcode_send_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeOTPPasscodeResendOTP = async (eventBody: any, transactionId: string) => {
  const otp_passcode_resend_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp-passcode/otp/resend`;
  return await fetch(otp_passcode_resend_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeOTPPasscodeVerifyOTP = async (eventBody: any, transactionId?: string) => {
  const otp_passcode_verify_otp = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp-passcode/otp/verify`;
  return await fetch(otp_passcode_verify_otp, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeOTPPasscodeVerifyPasscode = async (eventBody: any, transactionId?: string) => {
  const otp_passcode_verify_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp-passcode/passcode/verify`;
  return await fetch(otp_passcode_verify_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};

// --otp
export const invokeAuthorizeOTP = async (eventBody: any) => {
  const authorize_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/otp`;
  return await fetch(authorize_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeSendOTP = async (bodyEvent: any, transactionId: string) => {
  const send_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp/send`;
  return await fetch(send_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(bodyEvent),
  });
};
export const invokeVerifyOTP = async (bodyEvent: any, transactionId?: string) => {
  const verify_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp/verify`;
  return await fetch(verify_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(bodyEvent),
  });
};
// -- biometrics
export const invokeAuthorizeBiometricsRegister = async (eventBody: any, token?: string) => {
  const authorize_biometrics_register_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/biometrics/register`;
  return await fetch(authorize_biometrics_register_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeBiometricsRegisterVerify = async (
  eventBody: any,
  transactionId: string,
  token?: string,
) => {
  const biometrics_register_verify_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/biometrics/register`;
  return await fetch(biometrics_register_verify_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeAuthorizeBiometrics = async (eventBody: any) => {
  const authorize_biometrics_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/biometrics`;
  return await fetch(authorize_biometrics_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeBiometricsVerify = async (
  transactionId: string,
  eventBody: any,
  token?: string,
) => {
  const biometrics_verify_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/biometrics/verify`;
  return await fetch(biometrics_verify_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
// -- biometrics utils
export const createSignature = (payload: string, privateKey: string) => {
  const signer = createSign("RSA-SHA256");
  signer.update(payload);
  const signature = signer.sign(privateKey, "base64");
  return { success: true, signature };
};

export const formatPublicKey = (pemKey: string) => {
  return pemKey
    .replace("-----BEGIN PUBLIC KEY-----\n", "")
    .replace("\n-----END PUBLIC KEY-----", "")
    .replace(/\n/g, "");
};

// -- extra-scope
export const invokeAuthorizeExtraScope = async (eventBody: any, token?: string) => {
  const authorize_extra_scope_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/extra-scope`;
  return await fetch(authorize_extra_scope_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify({ biometrics: false, ...eventBody }),
  });
};
export const invokeExtraScopeSendOTP = async (
  transactionId: string,
  token?: string,
  eventBody?: any,
) => {
  const extra_scope_send_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/otp/send`;
  return await fetch(extra_scope_send_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeExtraScopeResendOTP = async (
  transactionId: string,
  token?: string,
  eventBody?: any,
) => {
  const extra_scope_resend_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/otp/resend`;
  return await fetch(extra_scope_resend_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeExtraScopeVerifyOTP = async (
  transactionId: string,
  eventBody: any,
  token?: string,
) => {
  const extra_scope_verify_otp = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/otp/verify`;
  return await fetch(extra_scope_verify_otp, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeExtraScopeVerifyPasscode = async (
  transactionId: string,
  eventBody: any,
  token?: string,
) => {
  const extra_scope_verify_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/passcode/verify`;
  return await fetch(extra_scope_verify_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};

// -- forgotten-passcode
export const invokeAuthorizeForgottenPasscodeLoggedOut = async (eventBody: any) => {
  const authorize_forgotten_passcode_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/forgotten-passcode/logged-out`;
  return await fetch(authorize_forgotten_passcode_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeAuthorizeForgottenPasscodeLoggedIn = async (eventBody: any, token?: string) => {
  const authorize_forgotten_passcode_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/authorize/forgotten-passcode/logged-in`;
  return await fetch(authorize_forgotten_passcode_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};

// -- clear rate limits
export const invokeClearRateLimits = async (onmouuid: string, token: string) => {
  // external service used for testing so always hits the same url
  const clear_limits_url = `https://api.staging.onmo.app/user-rate-limiting/next/clear-limits/${onmouuid}?id=${token}`;
  return await fetch(clear_limits_url, {
    method: "GET",
    headers: getDefaultHeaders(token),
  });
};

// -- other
export const invokeChangePasscode = async (eventBody: any, token?: string) => {
  const change_passcode_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/change-passcode`;
  return await fetch(change_passcode_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeUserInfo = async (onmouuid?: string, token?: string) => {
  const user_info_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/user-info?onmouuid=${onmouuid}`;
  return await fetch(user_info_url, {
    method: "GET",
    headers: getDefaultHeaders(token),
  });
};

// -- utils
export const getUniqueTestNumber = async (step: number = 0) => {
  const base_number = "+4477766";

  for (let i = 0; i <= 10; i++) {
    const suffix = randomInt(10000 + step, 99999);
    const phone_number = `${base_number}${suffix}`;
    const queryUserTableRes = await queryTableMethod({
      TableName: USER_TABLE,
      IndexName: "phonenumber-index",
      KeyConditionExpression: "phonenumber = :phonenumber",
      ExpressionAttributeValues: { ":phonenumber": phone_number },
    });

    if (queryUserTableRes.Count === 0) {
      return phone_number;
    }
    console.log(`generating unique TestNumber: attempt ${i}`);
  }
  throw new Error("All phone numbers in the range are taken");
};
export const getPublicSigningKey = async () => {
  const { SecretString } = await getSecret(`onmo-auth-signing-keys-${ENV}`);
  if (!SecretString) {
    throw new Error("Token signing keys secrets string is undefined");
  }
  const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
  if (!pub_signing_key) {
    throw new Error("Missing necessary signing public key");
  }
  return pub_signing_key;
};
