import { beforeEach, afterEach, afterAll, test, expect, beforeAll, describe } from "vitest";
import {
  createTestTransaction,
  deleteTestTransaction,
  deleteTestCreditCustomerAccount,
  deleteUserRecordInMobileTable,
  expireTestTransaction,
  setOtpVerifiedTestTransaction,
  setUpTestCreditCustomerAccount,
  TestCreditAccountUserCreds,
  updateAttributesOnRecord,
  removeAttributeFromUserRecord,
  removeAttributeFromTransaction,
  testModes,
} from "@libs/testUtils";
import {
  APR_SCOPE,
  OTP_AUTH_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  AUTH_TRANSACTIONS_TABLE,
  USER_TABLE,
} from "@libs/config";
import { TEST_CODE_CHALLENGE, TEST_NUMBER } from "@libs/testConstants";

import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { invokeSendOTP } from "src/test-e2e/e2eTestUtils";

type SuccessRespBody = { message: string; next_endpoint: string; last_four_digits: string };
type ErrorRespBody = { message: string };

const happyPathAttrs = { auth_flow: OTP_AUTH_FLOW };

let testCreditAccountUserCreds: TestCreditAccountUserCreds;
let testTransactionId: string;
let testOnmouuid: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testCreditAccountUserCreds = await setUpTestCreditCustomerAccount(codePath);
    testOnmouuid = testCreditAccountUserCreds.customerId;
  });

  beforeEach(async () => {
    testTransactionId = await createTestTransaction({
      onmouuid: testOnmouuid,
      scope: APR_SCOPE,
      code_challenge: TEST_CODE_CHALLENGE,
    });
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { ...happyPathAttrs },
    });
  });

  afterEach(async () => {
    await deleteTestTransaction(testTransactionId);
  });

  afterAll(async () => {
    await deleteTestCreditCustomerAccount(testCreditAccountUserCreds);
  });

  test("happy path - OTP sent", async () => {
    const event = { onmouuid: testOnmouuid };

    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as SuccessRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("message");
    expect(body).toHaveProperty("next_endpoint");
    expect(body).toHaveProperty("last_four_digits");
    expect(body.next_endpoint).toEqual(`${testTransactionId}/otp/verify`);
    expect(body.message).toEqual("OTP sent successfully");
    expect(body.last_four_digits).toEqual(TEST_NUMBER?.slice(-4));
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).toHaveProperty("verify_code");
    expect(transaction).toHaveProperty("otp_sms_verified");
    expect(transaction.verify_code).toEqual(1111);
    expect(transaction.otp_sms_verified).toBe(false);
    expect(transaction.auth_flow).toEqual(OTP_AUTH_FLOW);
  });

  test("onmouuid is missing from the request body", async () => {
    const response = await invokeSendOTP({}, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).not.toHaveProperty("verify_code");
    expect(transaction).not.toHaveProperty("otp_sms_verified");
  });

  describe("user record mutations", () => {
    let localCreds: TestCreditAccountUserCreds;
    let localOnmouuid: string;
    let localTransactionId: string;

    beforeEach(async () => {
      localCreds = await setUpTestCreditCustomerAccount(codePath);
      localOnmouuid = localCreds.customerId;
      localTransactionId = await createTestTransaction({
        onmouuid: localOnmouuid,
        scope: APR_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      });
      await updateAttributesOnRecord({
        tableName: AUTH_TRANSACTIONS_TABLE,
        keyName: "transaction_id",
        keyValue: localTransactionId,
        attributes: { ...happyPathAttrs },
      });
    });

    afterEach(async () => {
      await deleteTestCreditCustomerAccount(localCreds);
      await deleteTestTransaction(localTransactionId);
    });

    test("no user record found in the mobile-staging table", async () => {
      await deleteUserRecordInMobileTable(localOnmouuid);

      const event = { onmouuid: localOnmouuid };
      const response = await invokeSendOTP(event, localTransactionId);
      const body = (await response.json()) as ErrorRespBody;

      const queryTransactionsTableRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": localTransactionId },
      });

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Bad Request");
      expect(queryTransactionsTableRes.Count).toBe(1);
      const transaction = queryTransactionsTableRes.Items![0];
      expect(transaction).not.toHaveProperty("verify_code");
      expect(transaction).not.toHaveProperty("otp_sms_verified");
    });

    test("missing phonenumber in user record", async () => {
      await removeAttributeFromUserRecord({
        onmouuid: localOnmouuid,
        attributeName: "phonenumber",
      });

      const event = { onmouuid: localOnmouuid };
      const response = await invokeSendOTP(event, localTransactionId);
      const body = (await response.json()) as ErrorRespBody;

      const queryTransactionsTableRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": localTransactionId },
      });

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Bad Request");
      expect(queryTransactionsTableRes.Count).toBe(1);
      const transaction = queryTransactionsTableRes.Items![0];
      expect(transaction).not.toHaveProperty("verify_code");
      expect(transaction).not.toHaveProperty("otp_sms_verified");
    });
  });

  test("no transaction exists", async () => {
    await deleteTestTransaction(testTransactionId);
    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(0);
  });

  test("transaction has expired", async () => {
    await expireTestTransaction(testTransactionId);
    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");

    // handle case of table ttl deleting record before tests
    if (queryTransactionsTableRes.Count) {
      const transaction = queryTransactionsTableRes.Items![0];
      expect(transaction).not.toHaveProperty("verify_code");
      expect(transaction).not.toHaveProperty("otp_sms_verified");
    }
  });

  test("transaction has already had OTP verified", async () => {
    await setOtpVerifiedTestTransaction(testTransactionId);
    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).toHaveProperty("verify_code");
    expect(transaction).toHaveProperty("otp_sms_verified");
    expect(transaction.verify_code).toEqual(1111);
    expect(transaction.otp_sms_verified).toBe(true);
  });

  test("missing onmouuid in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "onmouuid",
    });

    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).not.toHaveProperty("verify_code");
    expect(transaction).not.toHaveProperty("otp_sms_verified");
  });

  test("provided onmouuid does not match in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { onmouuid: "fake-onmouuid" },
    });

    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).not.toHaveProperty("verify_code");
    expect(transaction).not.toHaveProperty("otp_sms_verified");
  });

  test("missing auth_flow in transaction", async () => {
    await removeAttributeFromTransaction({
      transaction_id: testTransactionId,
      attributeName: "auth_flow",
    });

    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).not.toHaveProperty("verify_code");
    expect(transaction).not.toHaveProperty("otp_sms_verified");
  });

  test("incorrect auth_flow in transaction", async () => {
    await updateAttributesOnRecord({
      tableName: AUTH_TRANSACTIONS_TABLE,
      keyName: "transaction_id",
      keyValue: testTransactionId,
      attributes: { auth_flow: OTP_PASSCODE_AUTH_FLOW },
    });

    const event = { onmouuid: testOnmouuid };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": testTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).not.toHaveProperty("verify_code");
    expect(transaction).not.toHaveProperty("otp_sms_verified");
  });

  // Skip for HAL as HAL requires a phone number at customer creation and throws error for invalid number
  test.runIf(codePath === "MAMBU")("no phone number on core banking customer details", async () => {
    const noMobileTestCCAccount = await setUpTestCreditCustomerAccount(codePath, {
      mobile_phone: "",
    });
    const noMobileTestTransactionId = await createTestTransaction({
      onmouuid: noMobileTestCCAccount.customerId,
      scope: APR_SCOPE,
      code_challenge: TEST_CODE_CHALLENGE,
    });
    const event = { onmouuid: noMobileTestCCAccount.customerId };
    const response = await invokeSendOTP(event, testTransactionId);
    const body = (await response.json()) as ErrorRespBody;

    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": noMobileTestTransactionId },
    });

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("message");
    expect(body.message).toEqual("Bad Request");
    expect(queryTransactionsTableRes.Count).toBe(1);
    const transaction = queryTransactionsTableRes.Items![0];
    expect(transaction).not.toHaveProperty("verify_code");
    expect(transaction).not.toHaveProperty("otp_sms_verified");

    await deleteTestCreditCustomerAccount(noMobileTestCCAccount);
    await deleteTestTransaction(noMobileTestTransactionId);
  });

  describe("user record phone number mismatch", () => {
    let localCreds: TestCreditAccountUserCreds;
    let localOnmouuid: string;
    let localTransactionId: string;

    beforeEach(async () => {
      localCreds = await setUpTestCreditCustomerAccount(codePath);
      localOnmouuid = localCreds.customerId;
      localTransactionId = await createTestTransaction({
        onmouuid: localOnmouuid,
        scope: APR_SCOPE,
        code_challenge: TEST_CODE_CHALLENGE,
      });
      await updateAttributesOnRecord({
        tableName: AUTH_TRANSACTIONS_TABLE,
        keyName: "transaction_id",
        keyValue: localTransactionId,
        attributes: { ...happyPathAttrs },
      });
    });

    afterEach(async () => {
      await deleteTestCreditCustomerAccount(localCreds);
      await deleteTestTransaction(localTransactionId);
    });

    test("phonenumber in user table does not match in mambu customer", async () => {
      await updateAttributesOnRecord({
        tableName: USER_TABLE,
        keyName: "onmouuid",
        keyValue: localOnmouuid,
        attributes: { phonenumber: "fake-phonenumber" },
      });

      const event = { onmouuid: localOnmouuid };
      const response = await invokeSendOTP(event, localTransactionId);
      const body = (await response.json()) as ErrorRespBody;

      const queryTransactionsTableRes = await queryTableMethod({
        TableName: AUTH_TRANSACTIONS_TABLE,
        KeyConditionExpression: "transaction_id = :transaction_id",
        ExpressionAttributeValues: { ":transaction_id": localTransactionId },
      });

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("message");
      expect(body.message).toEqual("Bad Request");
      expect(queryTransactionsTableRes.Count).toBe(1);
      const transaction = queryTransactionsTableRes.Items![0];
      expect(transaction).not.toHaveProperty("verify_code");
      expect(transaction).not.toHaveProperty("otp_sms_verified");
    });
  });
});
