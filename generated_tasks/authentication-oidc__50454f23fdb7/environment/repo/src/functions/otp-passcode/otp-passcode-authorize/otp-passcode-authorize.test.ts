import { beforeAll, afterAll, beforeEach, afterEach, test, expect, describe } from "vitest";
import {
  TestCreditAccountUserCreds,
  setUpTestCreditCustomerAccount,
  deleteTestCreditCustomerAccount,
  deleteTestTransaction,
  removeAttributeFromUserRecord,
  deleteCreditCardAccount,
  updateTestCreditCustomerAccountState,
  createTestTransaction,
  updateAttributesOnRecord,
  testModes,
} from "@libs/testUtils";
import {
  CUSTOMER_PROFILE_SCOPE,
  SUPPORT_SERVICES_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  FIRST_TIME_LOGIN_FLOW,
  LOGIN_SCENARIO_RELOGIN_RECOGNIZED_DEVICE,
  RELOGIN_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  AUTH_TRANSACTIONS_TABLE,
} from "@libs/config";
import {
  AuthorizeErrorRespBody,
  AuthorizeSuccessRespBody,
  TEST_ACTIVE_CREDIT_CUSTOMER,
  TEST_ACTIVE_IN_ARREARS_CREDIT_CUSTOMER,
  TEST_CODE_CHALLENGE,
} from "@libs/testConstants";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeAuthorizeOTPPasscode } from "src/test-e2e/e2eTestUtils";

const combinedScopes = `${CUSTOMER_PROFILE_SCOPE},${SUPPORT_SERVICES_SCOPE},${CREDIT_CARD_ACCOUNT_SCOPE}`;
const nonExistentDeviceId = "non-existent-device-id";

let testCreditAccountUserCreds: TestCreditAccountUserCreds;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
  });

  afterAll(async () => {
    await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  });

  test("happy path - device_id not recognised -> transaction created valid for first time login flow", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: combinedScopes,
      device_id: nonExistentDeviceId,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).not.toHaveProperty("login_scenario");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/otp/send`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord.device_id).toEqual(nonExistentDeviceId);
    expect(transactionRecord.create_refresh_token).toEqual(true);
    expect(transactionRecord.scope).toEqual(combinedScopes);
    expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
    expect(transactionRecord.next_endpoint).toEqual(body.next_endpoint);
    expect(transactionRecord.login_flow).toEqual(FIRST_TIME_LOGIN_FLOW);
    expect(transactionRecord.auth_flow).toEqual(OTP_PASSCODE_AUTH_FLOW);
    expect(transactionRecord.otp_sms_send_count).toBe(0);
    expect(transactionRecord.otp_sms_attempt_count).toBe(0);

    await deleteTestTransaction(body.transaction_id);
  });

  test("happy path - device_id is recognised -> transaction created valid for relogin flow", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: combinedScopes,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.login_scenario).toEqual(LOGIN_SCENARIO_RELOGIN_RECOGNIZED_DEVICE);
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord.onmouuid).toEqual(testCreditAccountUserCreds.customerId);
    expect(transactionRecord.create_refresh_token).toEqual(true);
    expect(transactionRecord.scope).toEqual(combinedScopes);
    expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
    expect(transactionRecord.next_endpoint).toEqual(body.next_endpoint);
    expect(transactionRecord.login_flow).toEqual(RELOGIN_FLOW);
    expect(transactionRecord.auth_flow).toEqual(OTP_PASSCODE_AUTH_FLOW);
    expect(transactionRecord).not.toHaveProperty("otp_sms_send_count");
    expect(transactionRecord).not.toHaveProperty("otp_sms_attempt_count");

    await deleteTestTransaction(body.transaction_id);
  });

  test("happy path - device_id is recognised for APPROVED credit account state -> transaction created valid for relogin flow", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: combinedScopes,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord.onmouuid).toEqual(testCreditAccountUserCreds.customerId);
    expect(transactionRecord.create_refresh_token).toEqual(true);
    expect(transactionRecord.scope).toEqual(combinedScopes);
    expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
    expect(transactionRecord.next_endpoint).toEqual(body.next_endpoint);
    expect(transactionRecord.login_flow).toEqual(RELOGIN_FLOW);
    expect(transactionRecord.auth_flow).toEqual(OTP_PASSCODE_AUTH_FLOW);
    expect(transactionRecord).not.toHaveProperty("otp_sms_send_count");
    expect(transactionRecord).not.toHaveProperty("otp_sms_attempt_count");

    await deleteTestTransaction(body.transaction_id);
  });

  test("happy path - device_id is recognised for ACTIVE credit account state -> transaction created valid for relogin flow", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: combinedScopes,
      device_id: TEST_ACTIVE_CREDIT_CUSTOMER.deviceId,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord.onmouuid).toEqual(TEST_ACTIVE_CREDIT_CUSTOMER.customerId);
    expect(transactionRecord.create_refresh_token).toEqual(true);
    expect(transactionRecord.scope).toEqual(combinedScopes);
    expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
    expect(transactionRecord.next_endpoint).toEqual(body.next_endpoint);
    expect(transactionRecord.login_flow).toEqual(RELOGIN_FLOW);
    expect(transactionRecord.auth_flow).toEqual(OTP_PASSCODE_AUTH_FLOW);
    expect(transactionRecord).not.toHaveProperty("otp_sms_send_count");
    expect(transactionRecord).not.toHaveProperty("otp_sms_attempt_count");

    await deleteTestTransaction(body.transaction_id);
  });

  // For Hal a test acccount that is in ACTIVE_IN_ARREARS state is required
  test.runIf(codePath === "MAMBU")(
    "happy path - device_id is recognised for ACTIVE_IN_ARREARS credit account state -> transaction created valid for relogin flow",
    async () => {
      const event = {
        code_challenge: TEST_CODE_CHALLENGE,
        scope: combinedScopes,
        device_id: TEST_ACTIVE_IN_ARREARS_CREDIT_CUSTOMER.deviceId,
      };

      const response = await invokeAuthorizeOTPPasscode(event);
      const body = (await response.json()) as AuthorizeSuccessRespBody;

      const queryTransactionsTableRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
      });

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("transaction_id");
      expect(body).toHaveProperty("next_endpoint");
      expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
      expect(queryTransactionsTableRes.Count).toBe(1);
      const transactionRecord = queryTransactionsTableRes.Items![0];
      expect(transactionRecord.onmouuid).toEqual(TEST_ACTIVE_IN_ARREARS_CREDIT_CUSTOMER.customerId);
      expect(transactionRecord.create_refresh_token).toEqual(true);
      expect(transactionRecord.scope).toEqual(combinedScopes);
      expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
      expect(transactionRecord.next_endpoint).toEqual(body.next_endpoint);
      expect(transactionRecord.login_flow).toEqual(RELOGIN_FLOW);
      expect(transactionRecord.auth_flow).toEqual(OTP_PASSCODE_AUTH_FLOW);
      expect(transactionRecord).not.toHaveProperty("otp_sms_send_count");
      expect(transactionRecord).not.toHaveProperty("otp_sms_attempt_count");

      await deleteTestTransaction(body.transaction_id);
    },
  );

  describe("account and user record mutations", () => {
    let localCreds: TestCreditAccountUserCreds;
    let localCreditAccountId: string;

    beforeEach(async () => {
      localCreds = await setUpTestCreditCustomerAccount(codePath);
      localCreditAccountId =
        codePath === "MAMBU" ? localCreds.mambuCreditCardAccountID! : localCreds.creditAccountId!;
    });

    afterEach(async () => {
      await deleteTestCreditCustomerAccount(localCreds);
    });

    test("happy path - device_id is recognised for CLOSED credit account state -> transaction created valid for relogin flow", async () => {
      await updateTestCreditCustomerAccountState({
        creditAccountId: localCreditAccountId,
        action: "WITHDRAW",
      });

      const event = {
        code_challenge: TEST_CODE_CHALLENGE,
        scope: combinedScopes,
        device_id: localCreds.device_id,
      };

      const response = await invokeAuthorizeOTPPasscode(event);
      const body = (await response.json()) as AuthorizeSuccessRespBody;

      const queryTransactionsTableRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": body.transaction_id },
      });

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("transaction_id");
      expect(body).toHaveProperty("next_endpoint");
      expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
      expect(queryTransactionsTableRes.Count).toBe(1);
      const transactionRecord = queryTransactionsTableRes.Items![0];
      expect(transactionRecord.onmouuid).toEqual(localCreds.customerId);
      expect(transactionRecord.create_refresh_token).toEqual(true);
      expect(transactionRecord.scope).toEqual(combinedScopes);
      expect(transactionRecord.code_challenge).toEqual(TEST_CODE_CHALLENGE);
      expect(transactionRecord.next_endpoint).toEqual(body.next_endpoint);
      expect(transactionRecord.login_flow).toEqual(RELOGIN_FLOW);
      expect(transactionRecord.auth_flow).toEqual(OTP_PASSCODE_AUTH_FLOW);
      expect(transactionRecord).not.toHaveProperty("otp_sms_send_count");
      expect(transactionRecord).not.toHaveProperty("otp_sms_attempt_count");

      await deleteTestTransaction(body.transaction_id);
    });

    test("device_id is recognised -> no credit card account id in user table record", async () => {
      await removeAttributeFromUserRecord({
        onmouuid: localCreds.customerId,
        attributeName: "mambuCreditCardAccountID",
      });
      const event = {
        code_challenge: TEST_CODE_CHALLENGE,
        scope: combinedScopes,
        device_id: localCreds.device_id,
      };

      const response = await invokeAuthorizeOTPPasscode(event);
      const body = (await response.json()) as AuthorizeErrorRespBody;

      expect(response.status).toBe(500);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Something went wrong");
    });

    test("device_id is recognised -> no credit card account for that user", async () => {
      await deleteCreditCardAccount(localCreditAccountId);
      const event = {
        code_challenge: TEST_CODE_CHALLENGE,
        scope: combinedScopes,
        device_id: localCreds.device_id,
      };

      const response = await invokeAuthorizeOTPPasscode(event);
      const body = (await response.json()) as AuthorizeErrorRespBody;

      expect(response.status).toBe(500);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Something went wrong");
    });

    test("device_id is recognised -> PENDING_APPROVAL credit account state", async () => {
      await updateTestCreditCustomerAccountState({
        creditAccountId: localCreditAccountId,
        action: "UNDO_APPROVE",
      });
      const event = {
        code_challenge: TEST_CODE_CHALLENGE,
        scope: combinedScopes,
        device_id: localCreds.device_id,
      };

      const response = await invokeAuthorizeOTPPasscode(event);
      const body = (await response.json()) as AuthorizeErrorRespBody;

      expect(response.status).toBe(500);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Something went wrong");
    });

    test("device_id is recognised -> PARTIAL_APPLICATION credit account state", async () => {
      await updateTestCreditCustomerAccountState({
        creditAccountId: localCreditAccountId,
        action: "UNDO_APPROVE",
      });
      await updateTestCreditCustomerAccountState({
        creditAccountId: localCreditAccountId,
        action: "SET_INCOMPLETE",
      });
      const event = {
        code_challenge: TEST_CODE_CHALLENGE,
        scope: combinedScopes,
        device_id: localCreds.device_id,
      };

      const response = await invokeAuthorizeOTPPasscode(event);
      const body = (await response.json()) as AuthorizeErrorRespBody;

      expect(response.status).toBe(500);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Something went wrong");
    });
  });

  test("happy path - transaction already exists for device_id -> existing transaction deleted", async () => {
    const existingTransactionId = await createTestTransaction(
      testCreditAccountUserCreds,
      false, // includeOnmouuid
    );
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: existingTransactionId,
      attributes: { device_id: testCreditAccountUserCreds.device_id },
    });

    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: combinedScopes,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "dev-index",
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": testCreditAccountUserCreds.device_id },
      ProjectionExpression: "transaction_id",
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord.transaction_id).toEqual(body.transaction_id);

    await deleteTestTransaction(body.transaction_id);
    await deleteTestTransaction(existingTransactionId);
  });

  test("happy path - transaction already exists for onmouuid with different device_id & same scopes -> existing transaction deleted", async () => {
    const existingTransactionId = await createTestTransaction({
      onmouuid: testCreditAccountUserCreds.customerId,
      scope: combinedScopes,
    });

    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      scope: combinedScopes,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeSuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": testCreditAccountUserCreds.customerId },
      ProjectionExpression: "transaction_id",
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("transaction_id");
    expect(body).toHaveProperty("next_endpoint");
    expect(body.next_endpoint).toEqual(`${body.transaction_id}/otp-passcode/passcode/verify`);
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transactionRecord = queryTransactionsTableRes.Items![0];
    expect(transactionRecord.transaction_id).toEqual(body.transaction_id);

    await deleteTestTransaction(body.transaction_id);
    await deleteTestTransaction(existingTransactionId);
  });

  test("request missing code challenge", async () => {
    const event = {
      scope: combinedScopes,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Bad Request");
  });

  test("request missing scope", async () => {
    const event = {
      code_challenge: TEST_CODE_CHALLENGE,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
  });

  test("request missing device id", async () => {
    const event = {
      scope: combinedScopes,
      code_challenge: TEST_CODE_CHALLENGE,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
  });

  test("unsupported scope", async () => {
    const event = {
      scope: "unsupported-scope",
      code_challenge: TEST_CODE_CHALLENGE,
      device_id: testCreditAccountUserCreds.device_id,
    };

    const response = await invokeAuthorizeOTPPasscode(event);
    const body = (await response.json()) as AuthorizeErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Something went wrong");
  });
});
