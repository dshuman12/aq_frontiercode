import { test, expect, beforeAll, beforeEach } from "vitest";
import {
  AUTH_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  FIRST_TIME_LOGIN_SCOPE,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/constants";
import { generateCodeChallenge, verifyToken } from "@libs/crypto";
import {
  E2E_TEST_TIMEOUT,
  getPublicSigningKey,
  invokeAuthorizeOTPPasscode,
  invokeLogout,
  invokeNextEndpoint,
} from "../e2eTestUtils";
import { generateUniqueIdentifier } from "@libs/testUtils";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { getCurrentTimestampInSeconds } from "@libs/utils";
import { getParameter } from "@onmoapp/onmo-ssm";
import { APP_TESTER_NUMBER, APP_TESTER_ONMOUUID, AppTesterLoginConfig } from "@libs/testConstants";

const user_table = process.env.USER_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;
const app_tester_login_config = process.env.APP_TESTER_LOGIN_CONFIG as string;

type NextEndpoint = { next_endpoint: string };
type AuthorizeBody = { transaction_id: string } & NextEndpoint;
type NextEndpointBody = { message: string } & NextEndpoint;
type AuthCodeBody = { auth_code: string } & NextEndpoint;
type TokenBody = { access_token: string; refresh_token: string };

const code_verifier = "first-time-login";
const code_challenge = generateCodeChallenge(code_verifier);
const scope = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE},${AUTH_SERVICES_SCOPE}`;

const phone_number = APP_TESTER_NUMBER;
const onmouuid = APP_TESTER_ONMOUUID;

let pubKey: string;
let device_id: string;
let sms_otp: number;
let passcode: string;
let enabled: boolean;

beforeAll(async () => {
  pubKey = await getPublicSigningKey();

  const { Parameter: appTesterParam } = await getParameter({
    Name: app_tester_login_config,
  });
  if (!appTesterParam?.Value) {
    throw new Error(`Failed to fetch app tester login config parameter from ssm`);
  }
  const config = JSON.parse(appTesterParam.Value) as AppTesterLoginConfig;
  if (!config.sms_otp || !config.passcode) {
    throw new Error("Missing required SSM parameters");
  }
  sms_otp = config.sms_otp;
  passcode = config.passcode;
  enabled = config?.enabled;
});

beforeEach(async () => {
  device_id = generateUniqueIdentifier();
});

test(
  "app tester login flow - SSM params -> access & refresh tokens",
  async () => {
    if (!enabled) {
      console.log("APP TESTING DISABLED");
      return;
    }

    const authorizeEvent = { code_challenge, scope, device_id };
    const authorizeRes = await invokeAuthorizeOTPPasscode(authorizeEvent);
    const authorizeBody = (await authorizeRes.json()) as AuthorizeBody;
    const { transaction_id } = authorizeBody;
    expect(authorizeRes.status).toBe(200);

    const sendOTPEvent = { phone_number };
    const sendOTPRes = await invokeNextEndpoint(sendOTPEvent, authorizeBody.next_endpoint);
    const sendOTPBody = (await sendOTPRes.json()) as NextEndpointBody;
    expect(sendOTPRes.status).toBe(200);

    const verifyOTPEvent = { phone_number, verify_code: sms_otp };
    const verifyOTPRes = await invokeNextEndpoint(verifyOTPEvent, sendOTPBody.next_endpoint);
    const verifyOTPBody = (await verifyOTPRes.json()) as NextEndpointBody;
    expect(verifyOTPRes.status).toBe(200);

    const verifyPasscodeEvent = { passcode };
    const verifyPasscodeRes = await invokeNextEndpoint(
      verifyPasscodeEvent,
      verifyOTPBody.next_endpoint,
    );
    const verifyPasscodeBody = (await verifyPasscodeRes.json()) as AuthCodeBody;
    const { auth_code } = verifyPasscodeBody;
    expect(verifyPasscodeRes.status).toBe(200);

    const tokenEvent = { transaction_id, auth_code, code_verifier };
    const tokenRes = await invokeNextEndpoint(tokenEvent, verifyPasscodeBody.next_endpoint);
    const tokenBody = (await tokenRes.json()) as TokenBody;
    const { access_token, refresh_token } = tokenBody;
    expect(tokenRes.status).toBe(200);

    const [decodedAccessToken, decodedRefreshToken] = await Promise.all([
      verifyToken({ token: access_token, pubKey }),
      verifyToken({ token: refresh_token, pubKey }),
    ]);

    expect(decodedAccessToken.scope?.split(",").sort().join(",")).toEqual(
      [...scope.split(","), FIRST_TIME_LOGIN_SCOPE].sort().join(","),
    );
    expect(decodedAccessToken.sub).toEqual(onmouuid);
    expect(decodedRefreshToken.scope).toEqual(scope);
    expect(decodedRefreshToken.sub).toEqual(onmouuid);
    console.log(
      `access token lifetime: ${((decodedAccessToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );
    console.log(
      `refresh token lifetime: ${((decodedRefreshToken.exp as number) - getCurrentTimestampInSeconds()) / 60} minutes`,
    );

    const queryUserTableRes = await queryTableMethod({
      TableName: user_table,
      IndexName: "dev-index",
      KeyConditionExpression: "dev = :device_id",
      ExpressionAttributeValues: { ":device_id": device_id },
    });
    expect(queryUserTableRes?.Count).toBe(0); // we don't want to update device id for app tester

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
