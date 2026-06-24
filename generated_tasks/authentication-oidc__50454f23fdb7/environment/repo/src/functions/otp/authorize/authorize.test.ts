import { beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  TestCreditAccountUserCreds,
  createRecordInAprIncreasesTable,
  deleteRecordInAprIncreasesTable,
  deleteTestCreditCustomerAccount,
  deleteTestTransaction,
  deleteUserRecordInMobileTable,
  setUpTestCreditCustomerAccount,
  testModes,
} from "@libs/testUtils";
import { APR_SCOPE, OTP_AUTH_FLOW, AUTH_TRANSACTIONS_TABLE } from "@libs/config";
import {
  AuthorizeErrorRespBody,
  AuthorizeSuccessRespBody,
  TEST_CODE_CHALLENGE,
} from "@libs/testConstants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeAuthorizeOTP } from "src/test-e2e/e2eTestUtils";

let testUserCreds: TestCreditAccountUserCreds;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeEach(async () => {
    testUserCreds = await setUpTestCreditCustomerAccount(codePath);
    await createRecordInAprIncreasesTable(testUserCreds.customerId);
  });

  afterEach(async () => {
    await deleteTestCreditCustomerAccount(testUserCreds);
    await deleteRecordInAprIncreasesTable(testUserCreds.customerId);
  });

  test("happy path - transaction created", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: APR_SCOPE,
      onmouuid: testUserCreds.customerId,
    };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
    });
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp/send`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes?.Items![0];
    expect(transactionRecord.onmouuid).toEqual(testUserCreds.customerId);
    expect(transactionRecord.scope).toEqual(APR_SCOPE);
    expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
    expect(transactionRecord.auth_flow).toEqual(OTP_AUTH_FLOW);

    await deleteTestTransaction(body.transaction_id);
  });

  test("user not eligible for apr scope", async () => {
    await deleteRecordInAprIncreasesTable(testUserCreds.customerId as string);
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: APR_SCOPE,
      onmouuid: testUserCreds.customerId,
    };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("missing onmouuid in request", async () => {
    const event = { code_challenge: TEST_CODE_CHALLENGE, scope: APR_SCOPE };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
  });

  test("missing code_challenge in request", async () => {
    const event = { scope: APR_SCOPE, onmouuid: testUserCreds.customerId };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Bad Request");
  });

  test("missing scope in request", async () => {
    const event = { code_challenge: TEST_CODE_CHALLENGE, onmouuid: testUserCreds.customerId };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
  });

  test("unsupported scope in request", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: "invalid_scope",
      onmouuid: testUserCreds.customerId,
    };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });

  test("user record not found in mobile-${environment} table", async () => {
    await deleteUserRecordInMobileTable(testUserCreds.customerId as string);
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: APR_SCOPE,
      onmouuid: testUserCreds.customerId,
    };

    const response = await invokeAuthorizeOTP(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });
});
