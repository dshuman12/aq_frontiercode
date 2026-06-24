import { beforeAll, afterAll, test, expect, describe } from "vitest";
import {
  TestCreditAccountUserCreds,
  createTestTokenRecord,
  createUserRecordInMobileTable,
  deleteTestTokenRecord,
  deleteUserRecordInMobileTable,
  setUpTestCreditCustomerAccount,
  testModes,
} from "@libs/testUtils";
import { CUSTOMER_CARE_SCOPE, LOAN_ACCOUNT_ID_SCOPE, AUTH_TOKENS_TABLE } from "@libs/config";
import { invokeUserInfo } from "src/test-e2e/e2eTestUtils";

type SuccessRespBody = { loanAccountId: string };
type ErrorRespBody = { message: string };

let testUserCreds: TestCreditAccountUserCreds;
let testTokenId: string;
let testAccessToken: string;

describe.each(testModes)("$codePath", ({ codePath }) => {
  beforeAll(async () => {
    testUserCreds = await setUpTestCreditCustomerAccount(codePath);
    const tokenRecord = await createTestTokenRecord({
      scope: `${CUSTOMER_CARE_SCOPE},${LOAN_ACCOUNT_ID_SCOPE}`,
      environment: "staging",
      expiryTimeMinutes: 10,
      tableName: AUTH_TOKENS_TABLE,
      onmouuid: testUserCreds.customerId,
      domain: "web",
    });
    testTokenId = tokenRecord.token_id;
    testAccessToken = tokenRecord.access_token;
  });

  afterAll(async () => {
    await Promise.all([
      deleteTestTokenRecord({
        onmouuid: testUserCreds.customerId,
        token_id: testTokenId,
      }),
    ]);
  });

  test("happy path - user info acquired", async () => {
    console.log("testusercres", testUserCreds);
    const response = await invokeUserInfo(testUserCreds.customerId, testAccessToken);
    const body = (await response.json()) as SuccessRespBody;

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("loanAccountId");
    expect(body.loanAccountId).toBeTruthy();
  });

  test("onmouuid missing from request body", async () => {
    const response = await invokeUserInfo(undefined, testAccessToken);
    const body = (await response.json()) as ErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");
  });

  test("authorization header missing", async () => {
    const response = await invokeUserInfo(testUserCreds.customerId);
    const body = (await response.json()) as ErrorRespBody;

    expect(response.status).toBe(401);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Unauthorized");
  });

  test("invalid access token in authorization header", async () => {
    const response = await invokeUserInfo(testUserCreds.customerId, "fake-access-token");
    const body = (await response.json()) as ErrorRespBody;

    expect(response.status).toBe(401);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Unauthorized");
  });

  test("no user exists", async () => {
    await deleteUserRecordInMobileTable(testUserCreds.customerId);
    const response = await invokeUserInfo(testUserCreds.customerId, testAccessToken);
    const body = (await response.json()) as ErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");

    await createUserRecordInMobileTable({
      onmouuid: testUserCreds.customerId,
      mambuCreditCardAccountID: testUserCreds.mambuCreditCardAccountID,
    });
  });

  test("missing loan account id on user record", async () => {
    await deleteUserRecordInMobileTable(testUserCreds.customerId);
    await createUserRecordInMobileTable({ onmouuid: testUserCreds.customerId });
    const response = await invokeUserInfo(testUserCreds.customerId, testAccessToken);
    const body = (await response.json()) as ErrorRespBody;

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Something went wrong");

    await createUserRecordInMobileTable({
      onmouuid: testUserCreds.customerId,
      mambuCreditCardAccountID: testUserCreds.mambuCreditCardAccountID,
    });
  });
});
