import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { SigningKeySecrets } from "@shared-types/secrets";
import { createSign } from "crypto";

const env = process.env.ENVIRONMENT as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const api_test_secret = process.env.API_TEST_SECRET as string;
const user_table = process.env.USER_TABLE as string;

// -- constants
export const E2E_TEST_TIMEOUT = 60_000;
const AUTH_API_VERSION = `next`;
const RATE_LIMITNG_API_VERSION = `next`;

export const getDefaultHeaders = (token?: string, extras: object = {}) => {
  const forcedCodePath = process.env.TEST_CODE_PATH;
  return {
    "Content-Type": "application/json",
    "x-api-test-secret": api_test_secret,
    ...(forcedCodePath ? { "forced-code-path": forcedCodePath } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extras,
  };
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
export const invokeOTPPasscodeSendOTP = async (eventBody: any, transactionId: string) => {
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
export const invokeOTPPasscodeVerifyOTP = async (eventBody: any, transactionId: string) => {
  const otp_passcode_verify_otp = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp-passcode/otp/verify`;
  return await fetch(otp_passcode_verify_otp, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
  });
};
export const invokeOTPPasscodeVerifyPasscode = async (eventBody: any, transactionId: string) => {
  const otp_passcode_verify_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/otp-passcode/passcode/verify`;
  return await fetch(otp_passcode_verify_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(),
    body: JSON.stringify(eventBody),
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
export const invokeBiometricsVerify = async (eventBody: any, transactionId: string) => {
  const biometrics_verify_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/biometrics/verify`;
  return await fetch(biometrics_verify_url, {
    method: "POST",
    headers: getDefaultHeaders(),
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
    body: JSON.stringify(eventBody),
  });
};
export const invokeExtraScopeSendOTP = async (
  eventBody: any,
  transactionId: string,
  token?: string,
) => {
  const extra_scope_send_otp_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/otp/send`;
  return await fetch(extra_scope_send_otp_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeExtraScopeResendOTP = async (
  eventBody: any,
  transactionId: string,
  token?: string,
) => {
  const extra_scope_resend_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/${transactionId}/extra-scope/otp/resend`;
  return await fetch(extra_scope_resend_url, {
    method: "POST",
    headers: getDefaultHeaders(token),
    body: JSON.stringify(eventBody),
  });
};
export const invokeExtraScopeVerifyOTP = async (
  eventBody: any,
  transactionId: string,
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
  eventBody: any,
  transactionId: string,
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
export const invokeClearRateLimits = async (onmouuid: string, tokenId: string) => {
  const clear_limits_url = `https://api.staging.onmo.app/user-rate-limiting/${RATE_LIMITNG_API_VERSION}/clear-limits/${onmouuid}?id=${tokenId}`;
  return await fetch(clear_limits_url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-test-secret": api_test_secret,
    },
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
export const invokeUserInfo = async (onmouuid: string, token?: string) => {
  const user_info_url = `https://${onmo_auth_url}/oidc/${AUTH_API_VERSION}/user-info?onmouuid=${onmouuid}`;
  return await fetch(user_info_url, {
    method: "GET",
    headers: getDefaultHeaders(token),
  });
};

// -- utils
export const getUniqueTestNumber = async (start = 0) => {
  const base_number = "+44777666";
  for (let i = start; i <= 9999; i++) {
    const suffix = i.toString().padStart(4, "0");
    const phone_number = `${base_number}${suffix}`;
    const queryUserTableRes = await queryTableMethod({
      TableName: user_table,
      IndexName: "phonenumber-index",
      KeyConditionExpression: "phonenumber = :phonenumber",
      ExpressionAttributeValues: { ":phonenumber": phone_number },
    });
    if (queryUserTableRes.Count === 0) {
      return phone_number;
    }
  }
  throw new Error("All phone numbers in the range are taken");
};
export const getPublicSigningKey = async () => {
  const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
  if (!SecretString) {
    throw new Error("Token signing keys secrets string is undefined");
  }
  const { pub_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
  if (!pub_signing_key) {
    throw new Error("Missing necessary signing public key");
  }
  return pub_signing_key;
};
