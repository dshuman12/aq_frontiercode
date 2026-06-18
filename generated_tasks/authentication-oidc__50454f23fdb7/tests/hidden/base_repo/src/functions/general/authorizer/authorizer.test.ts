import { test, expect } from "vitest";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AuthorizerEvent } from "@functions/general/authorizer/authorizer";
import { createTestTokenRecord, deleteTestTokenRecord } from "@libs/testUtils";
import {
  APR_SCOPE,
  CUSTOMER_CARE_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
  REGION,
  ENV,
  AWS_ACCOUNT_ID,
  APR_GATEWAY_ID,
  CUSTOMER_CARE_GATEWAY_ID,
  API_BROKER_GATEWAY_ID,
  AUTHENTICATION_GATEWAY_ID,
  AUTH_TOKENS_TABLE,
} from "@libs/config";

const arn_prefix = `arn:aws:execute-api:${REGION}:${AWS_ACCOUNT_ID}`;

const methodArnAuthentication = `${arn_prefix}:${AUTHENTICATION_GATEWAY_ID}/*/GET/user-info`;
const methodArnAPR = `${arn_prefix}:${APR_GATEWAY_ID}/${ENV}/GET/*`;
const methodArnCustomerCare = `${arn_prefix}:${CUSTOMER_CARE_GATEWAY_ID}/*/GET/accounts/*/arrears`;
const methodArnApiBroker = `${arn_prefix}:${API_BROKER_GATEWAY_ID}/staging/GET/repayment/card/customer-care`;

const lambdaClient = new LambdaClient({ region: REGION });

const invokeAuthorizer = async (event: AuthorizerEvent) => {
  const command = new InvokeCommand({
    FunctionName: `${ENV}-authentication-authorizer`,
    Qualifier: "next",
    Payload: new TextEncoder().encode(JSON.stringify(event)),
  });

  try {
    const response = await lambdaClient.send(command);
    if (response.FunctionError) {
      const errorPayload = JSON.parse(new TextDecoder().decode(response.Payload));
      throw new Error(`${errorPayload.errorMessage}`);
    }
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    return payload;
  } catch (error) {
    return error;
  }
};

test("happy path - token is valid (loan-account-id scope on authentication-oidc API staging)", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: LOAN_ACCOUNT_ID_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAuthentication,
  };

  const policy = await invokeAuthorizer(event);

  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(policy.principalId).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Version).toBe("2012-10-17");
  expect(policy.context.onmouuid).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Statement).toHaveLength(1);
  const firstStatement = policy.policyDocument.Statement[0] as any;
  expect(firstStatement.Action).toBe("execute-api:Invoke");
  expect(firstStatement.Effect).toBe("Allow");
  expect(firstStatement.Resource).toBe(event.methodArn);
});

test("happy path - token is valid (apr scope on apr API staging)", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAPR,
  };

  const policy = await invokeAuthorizer(event);

  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(policy.principalId).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Version).toBe("2012-10-17");
  expect(policy.context.onmouuid).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Statement).toHaveLength(1);
  const firstStatement = policy.policyDocument.Statement[0] as any;
  expect(firstStatement.Action).toBe("execute-api:Invoke");
  expect(firstStatement.Effect).toBe("Allow");
  expect(firstStatement.Resource).toBe(event.methodArn);
});

test("happy path - Authorization header token is valid (customer-care scope on customer-care API staging)", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: CUSTOMER_CARE_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnCustomerCare,
  };

  const policy = await invokeAuthorizer(event);

  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(policy.principalId).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Version).toBe("2012-10-17");
  expect(policy.context.onmouuid).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Statement).toHaveLength(1);
  const firstStatement = policy.policyDocument.Statement[0] as any;
  expect(firstStatement.Action).toBe("execute-api:Invoke");
  expect(firstStatement.Effect).toBe("Allow");
  expect(firstStatement.Resource).toBe(event.methodArn);
});

test("happy path - query string token is valid (customer-care scope on customer-care API staging)", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: CUSTOMER_CARE_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    queryStringParameters: { token: `Bearer ${testTokenCreds.access_token}` },
    methodArn: methodArnCustomerCare,
  };

  const policy = await invokeAuthorizer(event);

  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(policy.principalId).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Version).toBe("2012-10-17");
  expect(policy.context.onmouuid).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Statement).toHaveLength(1);
  const firstStatement = policy.policyDocument.Statement[0] as any;
  expect(firstStatement.Action).toBe("execute-api:Invoke");
  expect(firstStatement.Effect).toBe("Allow");
  expect(firstStatement.Resource).toBe(event.methodArn);
});

test("happy path - token is valid (customer-care scope on apiBroker API staging)", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: CUSTOMER_CARE_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnApiBroker,
  };

  const policy = await invokeAuthorizer(event);

  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(policy.principalId).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Version).toBe("2012-10-17");
  expect(policy.context.onmouuid).toBe(testTokenCreds.onmouuid);
  expect(policy.policyDocument.Statement).toHaveLength(1);
  const firstStatement = policy.policyDocument.Statement[0] as any;
  expect(firstStatement.Action).toBe("execute-api:Invoke");
  expect(firstStatement.Effect).toBe("Allow");
  expect(firstStatement.Resource).toBe(event.methodArn);
});

test("authorization token is missing in request", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer `,
    methodArn: methodArnAPR,
  };

  const response = await invokeAuthorizer(event);
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(response.message).toBe("Unauthorized");
});

test("environment mismatch", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: "prod",
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAPR,
  };

  const response = await invokeAuthorizer(event);
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(response.message).toBe("Unauthorized");
});

test("token not found in the auth-token-${environment} table", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAPR,
  };

  const response = await invokeAuthorizer(event);

  expect(response.message).toBe("Unauthorized");
});

test("scope not valid for this methodArn", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });

  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: `arn:aws:execute-api:${REGION}:${AWS_ACCOUNT_ID}:random-apig-url/staging/GET/*`,
  };

  const response = await invokeAuthorizer(event);
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(response.message).toBe("Unauthorized");
});

test("unsupported scope", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: "invalid-scope",
    environment: ENV,
    expiryTimeMinutes: 60,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });

  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAPR,
  };

  const response = await invokeAuthorizer(event);
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(response.message).toBe("Unauthorized");
});

test("token has expired", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: ENV,
    expiryTimeMinutes: -5,
    tableName: AUTH_TOKENS_TABLE,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAPR,
  };

  const response = await invokeAuthorizer(event);
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  expect(response.message).toBe("Unauthorized");
});
