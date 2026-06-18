import { test, expect } from "vitest";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AuthorizerEvent } from "@functions/general/authorizer/authorizer";
import { createTestTokenRecord, deleteTestTokenRecord } from "@libs/testUtils";
import { APR_SCOPE, CUSTOMER_CARE_SCOPE, LOAN_ACCOUNT_ID_SCOPE } from "@libs/constants";

const env = process.env.ENVIRONMENT as string;
const region = process.env.REGION as string;
const aws_account_id = process.env.AWS_ACCOUNT_ID as string;
const apr_gateway_id = process.env.APR_GATEWAY_ID as string;
const customer_care_gateway_id = process.env.CUSTOMER_CARE_GATEWAY_ID as string;
const api_broker_gateway_id = process.env.API_BROKER_GATEWAY_ID as string;
const authentication_gateway_id = process.env.AUTHENTICATION_GATEWAY_ID as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;

const arn_prefix = `arn:aws:execute-api:${region}:${aws_account_id}`;

const methodArnAuthentication = `${arn_prefix}:${authentication_gateway_id}/*/GET/user-info`;
const methodArnAPR = `${arn_prefix}:${apr_gateway_id}/${env}/GET/*`;
const methodArnCustomerCare = `${arn_prefix}:${customer_care_gateway_id}/*/GET/accounts/*/arrears`;
const methodArnApiBroker = `${arn_prefix}:${api_broker_gateway_id}/staging/GET/repayment/card/customer-care`;

const lambdaClient = new LambdaClient({ region });

const invokeAuthorizer = async (event: AuthorizerEvent) => {
  const command = new InvokeCommand({
    FunctionName: `${env}-authentication-authorizer`,
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });
  await deleteTestTokenRecord({
    token_id: testTokenCreds.token_id,
    onmouuid: testTokenCreds.onmouuid,
  });

  const event: AuthorizerEvent = {
    type: "TOKEN",
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: methodArnAPR,
  };

  const response = await invokeAuthorizer(event);

  expect(response.message).toBe("Unauthorized");
});

test("scope not valid for this methodArn", async () => {
  const testTokenCreds = await createTestTokenRecord({
    scope: APR_SCOPE,
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });

  const event: AuthorizerEvent = {
    type: "TOKEN",
    authorizationToken: `Bearer ${testTokenCreds.access_token}`,
    methodArn: `arn:aws:execute-api:${region}:${aws_account_id}:random-apig-url/staging/GET/*`,
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
    environment: env,
    expiryTimeMinutes: 60,
    tableName: auth_tokens_table,
    domain: "web",
  });

  const event: AuthorizerEvent = {
    type: "TOKEN",
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
    environment: env,
    expiryTimeMinutes: -5,
    tableName: auth_tokens_table,
    domain: "web",
  });
  const event: AuthorizerEvent = {
    type: "TOKEN",
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
