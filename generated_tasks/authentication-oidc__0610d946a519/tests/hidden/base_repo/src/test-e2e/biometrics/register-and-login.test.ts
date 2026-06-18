import { test, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { AUTH_SERVICES_SCOPE, BIOMETRICS_CHANGE_SCOPE, COMPLETED_STATUS } from "@libs/constants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  createSignature,
  E2E_TEST_TIMEOUT,
  formatPublicKey,
  getPublicSigningKey,
  getUniqueTestNumber,
  invokeAuthorizeBiometrics,
  invokeAuthorizeBiometricsRegister,
  invokeLogout,
  invokeNextEndpoint,
} from "../e2eTestUtils";
import {
  createTestTokenRecord,
  deleteTestCreditCustomerAccount,
  deleteTestAuthKeyRecord,
  deleteTestRefreshTokenRecord,
  deleteTestTokenRecord,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
} from "@libs/testUtils";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { generateKeyPairSync } from "crypto";

type NextEndpointBody = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string; unsigned_challenge: string } & NextEndpointBody;
type AuthCodeBody = { auth_code: string } & NextEndpointBody;
type TokenBody = { access_token: string; refresh_token: string };
type CreateTestTokenRes = Awaited<ReturnType<typeof createTestTokenRecord>>;

const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;

const code_verifier = "register";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${BIOMETRICS_CHANGE_SCOPE},${AUTH_SERVICES_SCOPE}`;
const login_scope = `${AUTH_SERVICES_SCOPE}`;

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
  phone_number = await getUniqueTestNumber(400);
  testCreditCustomerAccount = await setUpTestCreditCustomerAccount({
    mobile_phone: phone_number,
    onboarded_status: COMPLETED_STATUS,
  });
  onmouuid = testCreditCustomerAccount.customerId;
  device_id = testCreditCustomerAccount.device_id;
  [testAccessToken, testRefreshToken] = await Promise.all([
    createTestTokenRecord({
      tableName: auth_tokens_table,
      scope,
      environment: "staging",
      expiryTimeMinutes: 2,
      onmouuid,
      domain: "app",
    }),
    createTestTokenRecord({
      tableName: auth_refresh_tokens_table,
      scope: login_scope,
      environment: "staging",
      expiryTimeMinutes: 30,
      onmouuid,
      domain: "app",
    }),
  ]);
});

afterEach(async () => {
  await Promise.all([
    deleteTestCreditCustomerAccount(testCreditCustomerAccount),
    deleteTestAuthKeyRecord(onmouuid),
    deleteTestTokenRecord({ token_id: testAccessToken.token_id, onmouuid }),
    deleteTestRefreshTokenRecord({ token_id: testRefreshToken.token_id, onmouuid }),
  ]);
});

test(
  "happy path",
  async () => {
    const { access_token } = testAccessToken;
    const { access_token: refresh_token } = testRefreshToken;
    const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
      verifyToken({ token: access_token, pubKey }),
      verifyToken({ token: refresh_token, pubKey }),
    ]);
    expect(decodedAccessToken.scope).toEqual(scope);
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    expect(decodedRefreshToken.scope).toEqual(login_scope);
    expect(decodedRefreshToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.log(
      `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.debug(device_id);
    const authorizeBioRegEvent = { onmouuid, device_id, code_challenge };
    const authorizeBioRegRes = await invokeAuthorizeBiometricsRegister(
      authorizeBioRegEvent,
      access_token,
    );
    const authorizeBioRegBody = (await authorizeBioRegRes.json()) as AuthorizeBody;
    const { unsigned_challenge: reg_challenge } = authorizeBioRegBody;
    expect(authorizeBioRegRes.status).toBe(200);

    // Generate RSA key pair
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Sign the challenge using RSA-SHA256 to match react-native-biometrics
    const { signature: reg_signed_challenge } = createSignature(reg_challenge, privateKey);

    // put public key in react-native-biometrics format
    const fe_public_key = formatPublicKey(publicKey);

    const bioRegVerifyEvent = {
      fe_public_key,
      signed_challenge: reg_signed_challenge,
      code_verifier,
    };
    const bioRegVerifyRes = await invokeNextEndpoint(
      bioRegVerifyEvent,
      authorizeBioRegBody.next_endpoint,
      access_token,
    );
    expect(bioRegVerifyRes.status).toBe(200);

    const logoutEvent = { onmouuid };
    const logoutRes = await invokeLogout(logoutEvent, access_token);
    expect(logoutRes.status).toBe(200);

    const authorizeBioEvent = { device_id, code_challenge, scope: login_scope };
    const authorizeBioRes = await invokeAuthorizeBiometrics(authorizeBioEvent);
    const authorizeBioBody = (await authorizeBioRes.json()) as AuthorizeBody;
    const { unsigned_challenge: login_challenge, transaction_id } = authorizeBioBody;
    expect(authorizeBioRes.status).toBe(200);

    // Sign the login challenge using RSA-SHA256
    const { signature: login_signed_challenge } = createSignature(login_challenge, privateKey);

    const biometricsVerifyEvent = { signed_challenge: login_signed_challenge, device_id };
    const biometricsVerifyRes = await invokeNextEndpoint(
      biometricsVerifyEvent,
      authorizeBioBody.next_endpoint,
    );
    const biometricsVerifyBody = (await biometricsVerifyRes.json()) as AuthCodeBody;
    const { auth_code } = biometricsVerifyBody;
    expect(biometricsVerifyRes.status).toBe(200);

    const tokenEvent = { transaction_id, auth_code, code_verifier };
    const tokenRes = await invokeNextEndpoint(tokenEvent, biometricsVerifyBody.next_endpoint);
    const tokenBody = (await tokenRes.json()) as TokenBody;
    const { access_token: new_acc_token, refresh_token: new_ref_token } = tokenBody;
    expect(tokenRes.status).toBe(200);

    const [newDecodedAccessToken, newDecodedRefreshToken] = await Promise.all([
      verifyToken({ token: new_acc_token, pubKey }),
      verifyToken({ token: new_ref_token, pubKey }),
    ]);
    expect(newDecodedAccessToken.scope).toEqual(login_scope);
    expect(newDecodedAccessToken.sub).toEqual(onmouuid);
    expect(newDecodedRefreshToken.scope).toEqual(login_scope);
    expect(newDecodedRefreshToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((newDecodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.log(
      `refresh token lifetime: ${((newDecodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const secondLogoutRes = await invokeLogout(logoutEvent, new_acc_token);
    expect(secondLogoutRes.status).toBe(200);
  },
  E2E_TEST_TIMEOUT,
);
