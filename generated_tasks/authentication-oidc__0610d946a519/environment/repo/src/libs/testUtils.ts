import { getSecret } from "@onmoapp/onmo-secrets-manager";
import {
  putItemMethod,
  deleteItemMethod,
  updateItemMethod,
  queryTableMethod,
} from "@onmoapp/onmo-dynamodb";
import {
  CreateCustomerInput,
  CreateCustomerOutcome,
  CreateCreditAccountInput,
  CreateCreditAccountOutcome,
  CreateTechnicalAccountInput,
  CreateTechnicalAccountOutcome,
  SetCreditAccountStatusOutcome,
  SetCreditAccountStatusInput,
} from "@onmoapp/onmo-types";
import { coreBankingAdapter } from "@onmoapp/onmo-adapters";
import { MambuSecrets, SigningKeySecrets } from "@shared-types/secrets";
import {
  FIFTEEN_MINUTES,
  CORE_BANKING_ADAPTER_CLIENT_NAME,
  COMPLETED_STATUS,
  SIXTY_SECONDS,
  CUSTOMER_TO_CARD_MAPPING_TABLE,
} from "@libs/constants";
import {
  CREDIT_ACCOUNT_PRODUCT_KEY,
  TECHNICAL_ACCOUNT_PRODUCT_KEY,
  TEST_LOAN_ACCOUNT_ID,
  TEST_NUMBER,
  TEST_RUN_ID,
} from "./testConstants";
import { getCurrentTimestampInSeconds } from "./utils";
import { generateJti } from "./crypto";
import { generatePasscodeHash } from "./passcode";
import { encryptRSA, generateKeyPair, shaEncrypt } from "./crypto";
import { generateKeyPairSync, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { formatPublicKey } from "src/test-e2e/e2eTestUtils";

import { config } from "dotenv";

config();

export type UserCreds = {
  onmouuid?: string;
  mambuID?: string;
  mambuCreditCardAccountID?: string;
  crmID?: string;
  mambuDeleted?: boolean;
  transaction_id?: string;
  phonenumber?: string;
  scope?: string;
  code_challenge?: string;
  auth_code?: string;
  code_verifier?: string;
  token_id?: string;
  access_token?: string;
  device_id?: string;
  dev?: string;
  technicalAccountId?: string;
  onboarded_status?: string;
  mambuTechnicalAccountID?: string;
};

export type TestCreditAccountUserCreds = {
  customerId: string;
  mambuCreditCardAccountID: string;
  technicalAccountId: string;
  coreBankingCustomerId: string;
  device_id: string;
};

const env = process.env.ENVIRONMENT as string;
const user_table = process.env.USER_TABLE as string;
const apr_increases_table = process.env.APR_INCREASES_TABLE as string;
const auth_tokens_table = process.env.AUTH_TOKENS_TABLE as string;
const auth_refresh_tokens_table = process.env.AUTH_REFRESH_TOKENS_TABLE as string;
const auth_codes_table = process.env.AUTH_CODES_TABLE as string;
const auth_transactions_table = process.env.AUTH_TRANSACTIONS_TABLE as string;
const auth_hashes_table = process.env.AUTH_HASHES_TABLE as string;
const auth_keys_table = process.env.AUTH_KEYS_TABLE as string;
const legacy_auth_table = process.env.LEGACY_AUTH_TABLE as string;
const legacy_rsa_table = process.env.LEGACY_RSA_TABLE as string;
const rate_limiting_table = process.env.RATE_LIMITING_TABLE as string;
const onmo_auth_url = process.env.ONMO_AUTH_URL as string;
const onmo_api_url = process.env.ONMO_API_URL as string;

export const generateUniqueIdentifier = () => {
  const timestamp = Date.now();
  const randomness = randomBytes(8).toString("hex");
  return `test-${randomness}-${timestamp}`;
};

export const setUpTestUser = async () => {
  const { SecretString: mambuSecretsString } = await getSecret(`mambu_${env}`);
  if (!mambuSecretsString) {
    throw new Error("Mambu secrets string is undefined");
  }
  const { mambu_base_url, api_key }: MambuSecrets = JSON.parse(mambuSecretsString);
  if (!mambu_base_url || !api_key) {
    throw new Error("Missing necessary Mambu secrets");
  }

  const onmouuid = generateUniqueIdentifier();
  const phone_number = TEST_NUMBER;
  const crmID = generateUniqueIdentifier();
  const mambuID = await createMambuUser({
    onmouuid,
    phone_number,
    crmID,
    mambuSecrets: { mambu_base_url, api_key },
  });
  const userCreds = { onmouuid, mambuID, crmID, mambuCreditCardAccountID: TEST_LOAN_ACCOUNT_ID };

  await createUserRecordInMobileTable(userCreds);
  return userCreds;
};

type SetUpTestCCAccountInput = { mobile_phone?: string; onboarded_status?: string };
export const setUpTestCreditCustomerAccount = async (
  config: SetUpTestCCAccountInput = {
    mobile_phone: TEST_NUMBER,
    onboarded_status: COMPLETED_STATUS,
  },
) => {
  const { mobile_phone, onboarded_status } = config;

  const coreBankingClient = await coreBankingAdapter(CORE_BANKING_ADAPTER_CLIENT_NAME);
  if (!coreBankingClient) {
    throw new Error("Error initialising core banking adapter");
  }
  const crmID = generateUniqueIdentifier();

  const createCustomerInput: CreateCustomerInput = {
    applicationDetail: {
      onmoUuid: generateUniqueIdentifier(),
      crmId: crmID,
    },
    personalData: {
      firstName: "test",
      lastName: "test",
      dateOfBirth: "1990-01-01",
      emailAddresses: ["test@test.com"],
      mobileNumbers: mobile_phone ? [mobile_phone] : [],
    },
  };
  let createCustomerOutcome: CreateCustomerOutcome;

  createCustomerOutcome = await coreBankingClient?.createCustomer(createCustomerInput);
  if (!createCustomerOutcome.data || createCustomerOutcome.error) {
    throw new Error("Error creating customer");
  }
  const { coreBankingCustomerId, coreBankingCustomerEncodedKey } = createCustomerOutcome.data;
  const createCreditAccountInput: CreateCreditAccountInput = {
    coreBankingCustomerEncodedKey,
    productKey: CREDIT_ACCOUNT_PRODUCT_KEY,
    loanAmount: 100,
    interestRate: 1,
    paymentDay: 30,
    creditRiskGroup: "987",
  };

  const createCreditAccountOutcome: CreateCreditAccountOutcome =
    await coreBankingClient.createCreditAccount(createCreditAccountInput);
  if (!createCreditAccountOutcome.data || createCreditAccountOutcome.error) {
    throw new Error("Error creating credit account");
  }

  const setCreditAccountStatusInput: SetCreditAccountStatusInput = {
    action: "APPROVE",
    notes: "Test credit account state change via API tests",
  };
  const setCreditAccountStatusOutcome: SetCreditAccountStatusOutcome =
    await coreBankingClient.setCreditAccountStatus(
      createCreditAccountOutcome.data.accountId,
      setCreditAccountStatusInput,
    );
  if (!setCreditAccountStatusOutcome.data || setCreditAccountStatusOutcome.error) {
    throw new Error("Error approving credit account");
  }

  const createTechnicalAccountInput: CreateTechnicalAccountInput = {
    coreBankingCustomerEncodedKey,
    productKey: TECHNICAL_ACCOUNT_PRODUCT_KEY,
  };
  const createTechnicalAccountOutcome: CreateTechnicalAccountOutcome =
    await coreBankingClient.createTechnicalAccount(createTechnicalAccountInput);
  if (!createTechnicalAccountOutcome.data || createTechnicalAccountOutcome.error) {
    throw new Error("Error creating technical account");
  }

  await coreBankingClient.approveTechnicalAccount(
    createTechnicalAccountOutcome.data.technicalAccountId,
  );

  const device_id = generateUniqueIdentifier();
  const testUserCreds: TestCreditAccountUserCreds = {
    customerId: createCustomerInput!.applicationDetail!.onmoUuid as string,
    mambuCreditCardAccountID: createCreditAccountOutcome.data.accountId,
    technicalAccountId: createTechnicalAccountOutcome.data.technicalAccountId,
    device_id,
    coreBankingCustomerId,
  };
  await createUserRecordInMobileTable({
    onmouuid: testUserCreds.customerId,
    mambuCreditCardAccountID: testUserCreds.mambuCreditCardAccountID,
    mambuTechnicalAccountID: testUserCreds.technicalAccountId,
    dev: testUserCreds.device_id,
    mambuID: testUserCreds.coreBankingCustomerId,
    crmID,
    ...(mobile_phone ? { phonenumber: mobile_phone } : {}),
    ...(onboarded_status ? { onboarded_status } : {}),
  });

  return testUserCreds;
};

type UpdateTestCreditCustomerAccountStateInput = {
  creditAccountId: string;
  action:
    | "REQUEST_APPROVAL"
    | "SET_INCOMPLETE"
    | "APPROVE"
    | "UNDO_APPROVE"
    | "REJECT"
    | "WITHDRAW"
    | "CLOSE"
    | "UNDO_REJECT"
    | "UNDO_WITHDRAW"
    | "UNDO_CLOSE";
};
export const updateTestCreditCustomerAccountState = async ({
  creditAccountId,
  action,
}: UpdateTestCreditCustomerAccountStateInput) => {
  const coreBankingClient = await coreBankingAdapter(CORE_BANKING_ADAPTER_CLIENT_NAME);
  if (!coreBankingClient) {
    throw new Error("Error initialising core banking adapter");
  }

  const setCreditAccountStatusInput: SetCreditAccountStatusInput = {
    action,
    notes: "Test credit account state change via API tests",
  };
  const setCreditAccountStatusOutcome: SetCreditAccountStatusOutcome =
    await coreBankingClient.setCreditAccountStatus(creditAccountId, setCreditAccountStatusInput);
  if (!setCreditAccountStatusOutcome.data || setCreditAccountStatusOutcome.error) {
    throw new Error("Error updating credit account state");
  }
};

export const deleteTestCreditCustomerAccount = async (
  userCredentials: TestCreditAccountUserCreds,
) => {
  const coreBankingClient = await coreBankingAdapter(CORE_BANKING_ADAPTER_CLIENT_NAME);
  if (!coreBankingClient) {
    throw new Error("Error initialising core banking adapter");
  }
  await coreBankingClient.deleteCreditAccount(userCredentials.mambuCreditCardAccountID);
  await coreBankingClient.deleteTechnicalAccount(userCredentials.technicalAccountId);
  await coreBankingClient.deleteCustomer(userCredentials.coreBankingCustomerId);
  await deleteUserRecordInMobileTable(userCredentials.customerId);
};

export const deleteCreditCardAccount = async (mambuCreditCardAccountID: string) => {
  const coreBankingClient = await coreBankingAdapter(CORE_BANKING_ADAPTER_CLIENT_NAME);
  if (!coreBankingClient) {
    throw new Error("Error initialising core banking adapter");
  }
  await coreBankingClient.deleteCreditAccount(mambuCreditCardAccountID);
};

type CreateMambuUserInput = {
  onmouuid: string;
  phone_number: string;
  crmID: string;
  mambuSecrets: MambuSecrets;
};
const createMambuUser = async ({
  onmouuid,
  phone_number,
  crmID,
  mambuSecrets,
}: CreateMambuUserInput) => {
  try {
    const { mambu_base_url, api_key } = mambuSecrets;

    const response = await fetch(`${mambu_base_url}clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.mambu.v2+json",
        apiKey: api_key as string,
      },
      body: JSON.stringify({
        firstName: "test",
        lastName: "test",
        emailAddress: "test",
        mobilePhone: phone_number,
        state: "INACTIVE",
        _crm: { crm_id: crmID },
        _onmo: { onmouuid: onmouuid },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Mambu Client, status: ${response.status}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  } catch (error: any) {
    throw new Error(`Mambu Client creation error: ${error?.message || error}`);
  }
};

export const createUserRecordInMobileTable = async (userCreds: UserCreds) => {
  await putItemMethod({ TableName: user_table, Item: { ...userCreds } });
};

export const deleteTestUser = async (userCreds: UserCreds) => {
  const { SecretString: mambuSecretsString } = await getSecret(`mambu_${env}`);
  if (!mambuSecretsString) {
    throw new Error("Mambu secrets string is undefined");
  }
  const { mambu_base_url, api_key }: MambuSecrets = JSON.parse(mambuSecretsString);
  if (!mambu_base_url || !api_key) {
    throw new Error("Missing necessary Mambu secrets");
  }

  if (!userCreds?.mambuDeleted) {
    await deleteMambuUser({
      mambuID: userCreds.mambuID as string,
      mambuSecrets: { mambu_base_url, api_key },
    });
  }
  await deleteUserRecordInMobileTable(userCreds.onmouuid as string);
};

type DeleteMambuUserInput = {
  mambuID: string;
  mambuSecrets: MambuSecrets;
};
export const deleteMambuUser = async ({ mambuID, mambuSecrets }: DeleteMambuUserInput) => {
  try {
    const { mambu_base_url, api_key } = mambuSecrets;

    const response = await fetch(`${mambu_base_url}clients/${mambuID}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.mambu.v2+json",
        apiKey: api_key as string,
      },
    });

    if (!response.ok) {
      const errorInfo = await response.text();
      throw new Error(`Failed deleting client in mambu: ${errorInfo}`);
    }
  } catch (error: any) {
    throw new Error(`Error when deleting client in mambu: ${error?.message || error}`);
  }
};

export const deleteUserRecordInMobileTable = async (onmouuid: string) => {
  await deleteItemMethod({ TableName: user_table, Key: { onmouuid } });
};

export const createRecordInAprIncreasesTable = async (onmouuid: string) => {
  await putItemMethod({ TableName: apr_increases_table, Item: { onmouuid, run_id: TEST_RUN_ID } });
};

export const deleteRecordInAprIncreasesTable = async (onmouuid: string) => {
  await deleteItemMethod({
    TableName: apr_increases_table,
    Key: { onmouuid, run_id: TEST_RUN_ID },
  });
};

type GenerateAccessTokenInput = {
  onmouuid: string;
  scope: string;
  secretKey: string;
  expiryTimeMinutes: number;
  environment: string;
};
export const generateTestAccessToken = ({
  onmouuid,
  scope,
  secretKey,
  expiryTimeMinutes,
  environment,
}: GenerateAccessTokenInput) => {
  const sanitisedPrivKey = secretKey.replace(/\\n/g, "\n");
  const issuedAt = getCurrentTimestampInSeconds();
  const expirationTime = issuedAt + expiryTimeMinutes * 60;
  const token_id = generateJti();
  const payload = {
    iss: `${onmo_auth_url}/oidc`,
    sub: onmouuid,
    aud: onmo_api_url,
    exp: expirationTime,
    iat: issuedAt,
    jti: token_id,
    env: environment,
    scope,
  };

  return {
    access_token: jwt.sign(payload, sanitisedPrivKey, { algorithm: "RS256" }),
    expires_in: expirationTime,
    token_id,
  };
};

type CreateTestTokenRecordInput = {
  scope: string;
  environment: string;
  expiryTimeMinutes: number;
  tableName: string;
  onmouuid?: string;
  domain: "app" | "web";
};
export const createTestTokenRecord = async ({
  scope,
  environment,
  expiryTimeMinutes,
  tableName,
  onmouuid,
  domain,
}: CreateTestTokenRecordInput) => {
  const { SecretString } = await getSecret(`onmo-auth-signing-keys-${env}`);
  if (!SecretString) {
    throw new Error("Token signing keys secrets string is undefined");
  }
  const { priv_signing_key }: SigningKeySecrets = JSON.parse(SecretString);
  if (!priv_signing_key) {
    throw new Error("Missing necessary signing private key");
  }

  const testOnmouuid = onmouuid || generateUniqueIdentifier();

  const accessToken = generateTestAccessToken({
    onmouuid: testOnmouuid,
    scope,
    secretKey: priv_signing_key,
    expiryTimeMinutes,
    environment,
  });

  try {
    await putItemMethod({
      TableName: tableName,
      Item: {
        token_id: accessToken.token_id,
        onmouuid: testOnmouuid,
        scope,
        token: accessToken.access_token,
        domain,
        ttl: accessToken.expires_in,
      },
    });
  } catch (error) {
    throw new Error(`Error generating token`);
  }
  return {
    token_id: accessToken.token_id,
    onmouuid: testOnmouuid,
    access_token: accessToken.access_token,
  };
};

type DeleteTestTokenRecordInput = { onmouuid: string; token_id: string };
export const deleteTestTokenRecord = async ({ token_id, onmouuid }: DeleteTestTokenRecordInput) => {
  await deleteItemMethod({
    TableName: auth_tokens_table,
    Key: { token_id: token_id, onmouuid: onmouuid },
  });
};

type DeleteTestRefreshTokenRecordInput = { onmouuid: string; token_id: string };
export const deleteTestRefreshTokenRecord = async ({
  token_id,
  onmouuid,
}: DeleteTestRefreshTokenRecordInput) => {
  await deleteItemMethod({
    TableName: auth_refresh_tokens_table,
    Key: { token_id: token_id, onmouuid: onmouuid },
  });
};

export const deleteAllTokensForOnmouuid = async (onmouuid: string) => {
  const queryOperations = [
    queryTableMethod({
      TableName: auth_tokens_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    }),
    queryTableMethod({
      TableName: auth_refresh_tokens_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    }),
  ];

  const [queryAuthTokensTableRes, queryAuthRefreshTokensTableRes] =
    await Promise.all(queryOperations);

  const deleteAccessTokens = queryAuthTokensTableRes.Items!.map(({ token_id, onmouuid }) => {
    return deleteTestTokenRecord({ token_id, onmouuid });
  });
  const deleteRefreshTokens = queryAuthRefreshTokensTableRes.Items!.map(
    ({ token_id, onmouuid }) => {
      return deleteTestRefreshTokenRecord({ token_id, onmouuid });
    },
  );
  await Promise.all([...deleteAccessTokens, ...deleteRefreshTokens]);
};

type CreateTestRateLimitRecordInput = {
  onmouuid: string;
  domain: string;
  action: string;
  rate_limit_expiry_minutes: number;
  record_expiry_minutes: number;
};
export const createTestRateLimitRecord = async ({
  onmouuid,
  domain,
  action,
  rate_limit_expiry_minutes,
  record_expiry_minutes,
}: CreateTestRateLimitRecordInput) => {
  const id = randomBytes(16).toString("hex");
  await putItemMethod({
    TableName: rate_limiting_table,
    Item: {
      id,
      onmouuid,
      domain,
      action,
      rate_limit_expiry: getCurrentTimestampInSeconds() + rate_limit_expiry_minutes * SIXTY_SECONDS,
      ttl: getCurrentTimestampInSeconds() + record_expiry_minutes * SIXTY_SECONDS,
    },
  });

  return id;
};

type CreateTestSuperRateLimitRecordInput = { onmouuid: string; domain: string; action: string };
export const createTestSuperRateLimitRecord = async ({
  onmouuid,
  domain,
  action,
}: CreateTestSuperRateLimitRecordInput) => {
  const id = randomBytes(16).toString("hex");
  await putItemMethod({
    TableName: rate_limiting_table,
    Item: { id, onmouuid, domain, action, super_rate_limited: true },
  });

  return id;
};

export const deleteTestRateLimitRecord = async (id: string, onmouuid: string) => {
  await deleteItemMethod({ TableName: rate_limiting_table, Key: { id, onmouuid } });
};

type CreateTestAuthKeyRecordInput = { onmouuid: string; device_id: string };
export const createTestAuthKeyRecord = async ({
  onmouuid,
  device_id,
}: CreateTestAuthKeyRecordInput) => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const fe_public_key = formatPublicKey(publicKey);
  await putItemMethod({
    TableName: auth_keys_table,
    Item: { onmouuid, device_id, fe_public_key, last_updated: new Date().toISOString() },
  });

  return { fe_public_key, publicKey, privateKey };
};

export const deleteTestAuthKeyRecord = async (onmouuid: string) => {
  await deleteItemMethod({ TableName: auth_keys_table, Key: { onmouuid } });
};

export const createTestTransaction = async (
  testUserCreds: UserCreds,
  includeOnmouuid: boolean = true,
) => {
  const ttl = getCurrentTimestampInSeconds() + FIFTEEN_MINUTES;
  const transaction_id = generateUniqueIdentifier();

  await putItemMethod({
    TableName: auth_transactions_table,
    Item: {
      transaction_id,
      ...(includeOnmouuid ? { onmouuid: testUserCreds.onmouuid } : {}),
      scope: testUserCreds.scope,
      code_challenge: testUserCreds.code_challenge,
      ttl,
    },
  });

  return transaction_id;
};

export const expireTestTransaction = async (transaction_id: string) => {
  await updateItemMethod({
    TableName: auth_transactions_table,
    Key: { transaction_id: transaction_id },
    UpdateExpression: "set #ttlAttribute = :newTTL",
    ExpressionAttributeNames: { "#ttlAttribute": "ttl" },
    ExpressionAttributeValues: { ":newTTL": getCurrentTimestampInSeconds() - FIFTEEN_MINUTES },
  });
};

export const setOtpVerifiedTestTransaction = async (transaction_id: string) => {
  await updateItemMethod({
    TableName: auth_transactions_table,
    Key: { transaction_id: transaction_id },
    UpdateExpression: "set otp_sms_verified = :otp_sms_verified, verify_code = :verify_code",
    ExpressionAttributeValues: { ":otp_sms_verified": true, ":verify_code": 1111 },
  });
};

type AddAttributesToTransactionInput = {
  attributes: { [key: string]: any };
  tableName: string;
  keyName: string;
  keyValue: any;
};
export const updateAttributesOnRecord = async ({
  attributes,
  tableName,
  keyName,
  keyValue,
}: AddAttributesToTransactionInput) => {
  const attributeNames = Object.keys(attributes);
  const updateExpression = attributeNames
    .map((_key, index) => `#attrName${index} = :attrValue${index}`)
    .join(", ");

  const expressionAttributeNames = attributeNames.reduce<{ [key: string]: string }>(
    (acc, key, index) => {
      acc[`#attrName${index}`] = key;
      return acc;
    },
    {},
  );

  const expressionAttributeValues = attributeNames.reduce<{ [key: string]: any }>(
    (acc, key, index) => {
      acc[`:attrValue${index}`] = attributes[key];
      return acc;
    },
    {},
  );

  await updateItemMethod({
    TableName: tableName,
    Key: { [keyName]: keyValue },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  });
};

export const deleteTestTransaction = async (transaction_id: string) => {
  await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
};

type RemoveAttributeFromUserRecordInput = { onmouuid: string; attributeName: string };
export const removeAttributeFromUserRecord = async ({
  onmouuid,
  attributeName,
}: RemoveAttributeFromUserRecordInput) => {
  await updateItemMethod({
    TableName: user_table,
    Key: { onmouuid: onmouuid },
    UpdateExpression: `REMOVE #attrName`,
    ExpressionAttributeNames: { "#attrName": attributeName },
  });
};

type CreateTestAuthHashRecordInput = { onmouuid: string; passcode: string };
export const createTestAuthHashRecord = async ({
  onmouuid,
  passcode,
}: CreateTestAuthHashRecordInput) => {
  const { salt, hash } = generatePasscodeHash(passcode);
  await putItemMethod({
    TableName: auth_hashes_table,
    Item: { onmouuid, salt, hash },
  });
};

type RemoveAttributeFromTestAuthHashRecordInput = { onmouuid: string; attributeName: string };
export const removeAttributeFromTestAuthHashRecord = async ({
  onmouuid,
  attributeName,
}: RemoveAttributeFromTestAuthHashRecordInput) => {
  await updateItemMethod({
    TableName: auth_hashes_table,
    Key: { onmouuid: onmouuid },
    UpdateExpression: `REMOVE #attrName`,
    ExpressionAttributeNames: { "#attrName": attributeName },
  });
};

export const deleteTestAuthHashRecord = async (onmouuid: string) => {
  await deleteItemMethod({ TableName: auth_hashes_table, Key: { onmouuid } });
};

type CreateTestLegacyAuthRecordsInput = { onmouuid: string; passcode: string };
export const createTestLegacyAuthRecords = async ({
  onmouuid,
  passcode,
}: CreateTestLegacyAuthRecordsInput) => {
  const { SecretString } = await getSecret("onmo");
  if (!SecretString) {
    throw new Error("Unable to retrieve secret containing necessary encryption key");
  }
  const { ["encryptkey" + env]: encryptKey } = JSON.parse(SecretString);
  if (!encryptKey) {
    throw new Error("Unable to retrieve necessary encryption key");
  }

  const { pubkey_b64, privkey_b64 } = generateKeyPair();

  const passcode_enc_b64 = await encryptRSA(pubkey_b64, passcode);
  const { iv, encryptedData: encryptedPrivateKey } = shaEncrypt(encryptKey, privkey_b64);

  await putItemMethod({ TableName: legacy_auth_table, Item: { onmouuid, passcode_enc_b64 } });
  await putItemMethod({
    TableName: legacy_rsa_table,
    Item: { onmouuid, priviv: iv, privatekey: encryptedPrivateKey },
  });
};

type RemoveAttributeFromLegacyAuthTableInput = { onmouuid: string; attributeName: string };
export const removeAttributeFromLegacyAuthTable = async ({
  onmouuid,
  attributeName,
}: RemoveAttributeFromLegacyAuthTableInput) => {
  await updateItemMethod({
    TableName: legacy_auth_table,
    Key: { onmouuid },
    UpdateExpression: `REMOVE #attrName`,
    ExpressionAttributeNames: { "#attrName": attributeName },
  });
};

type RemoveAttributeFromLegacyRsaTableInput = { onmouuid: string; attributeName: string };
export const removeAttributeFromLegacyRSATable = async ({
  onmouuid,
  attributeName,
}: RemoveAttributeFromLegacyRsaTableInput) => {
  await updateItemMethod({
    TableName: legacy_rsa_table,
    Key: { onmouuid },
    UpdateExpression: `REMOVE #attrName`,
    ExpressionAttributeNames: { "#attrName": attributeName },
  });
};

export const deleteLegacyAuthRecord = async (onmouuid: string) => {
  await deleteItemMethod({ TableName: legacy_auth_table, Key: { onmouuid } });
};

export const deleteLegacyRSARecord = async (onmouuid: string) => {
  await deleteItemMethod({ TableName: legacy_rsa_table, Key: { onmouuid } });
};

export const createAuthCodeRecord = async (testUserCreds: UserCreds) => {
  const ttl = getCurrentTimestampInSeconds() + 60;
  await putItemMethod({
    TableName: auth_codes_table,
    Item: {
      auth_code: testUserCreds.auth_code,
      onmouuid: testUserCreds.onmouuid,
      transaction_id: testUserCreds.transaction_id,
      scope: testUserCreds.scope,
      code_challenge: testUserCreds.code_challenge,
      ttl,
    },
  });
};

export const deleteAuthCodeRecord = async (testUserCreds: UserCreds) => {
  await deleteItemMethod({
    TableName: auth_codes_table,
    Key: { auth_code: testUserCreds.auth_code },
  });
};

export const expireAuthCode = async (testUserCreds: UserCreds) => {
  await updateItemMethod({
    TableName: auth_codes_table,
    Key: { auth_code: testUserCreds.auth_code },
    UpdateExpression: "set #ttlAttribute = :newTTL",
    ExpressionAttributeNames: { "#ttlAttribute": "ttl" },
    ExpressionAttributeValues: { ":newTTL": getCurrentTimestampInSeconds() - FIFTEEN_MINUTES },
  });
};

type RemoveAttributeAuthCodeRecordInput = { testUserCreds: UserCreds; attributeName: string };
export const removeAttributeAuthCodeRecord = async ({
  testUserCreds,
  attributeName,
}: RemoveAttributeAuthCodeRecordInput) => {
  await updateItemMethod({
    TableName: auth_codes_table,
    Key: { auth_code: testUserCreds.auth_code },
    UpdateExpression: `REMOVE #attrName`,
    ExpressionAttributeNames: { "#attrName": attributeName },
  });
};

type SetTransactionIdOnAuthCodeRecordInput = {
  testUserCreds: UserCreds;
  new_transaction_id: string;
};
export const setTransactionIdOnAuthCodeRecord = async ({
  testUserCreds,
  new_transaction_id,
}: SetTransactionIdOnAuthCodeRecordInput) => {
  await updateItemMethod({
    TableName: auth_codes_table,
    Key: { auth_code: testUserCreds.auth_code },
    UpdateExpression: "set transaction_id = :transaction_id",
    ExpressionAttributeValues: { ":transaction_id": new_transaction_id },
  });
};

type RemoveAttributeFromTransactionInput = {
  transaction_id: string;
  attributeName: string;
};
export const removeAttributeFromTransaction = async ({
  transaction_id,
  attributeName,
}: RemoveAttributeFromTransactionInput) => {
  await updateItemMethod({
    TableName: auth_transactions_table,
    Key: { transaction_id: transaction_id },
    UpdateExpression: `REMOVE #attrName`,
    ExpressionAttributeNames: { "#attrName": attributeName },
  });
};

export const setOtpSentTestTransaction = async (transaction_id: string) => {
  await updateItemMethod({
    TableName: auth_transactions_table,
    Key: { transaction_id: transaction_id },
    UpdateExpression: "set otp_sms_verified = :otp_sms_verified, verify_code = :verify_code",
    ExpressionAttributeValues: { ":otp_sms_verified": false, ":verify_code": 1111 },
  });
};

type SetAuthCodeOnTestTransactionInput = { transaction_id: string; auth_code: string };
export const setAuthCodeOnTestTransaction = async ({
  transaction_id,
  auth_code,
}: SetAuthCodeOnTestTransactionInput) => {
  await updateItemMethod({
    TableName: auth_transactions_table,
    Key: { transaction_id: transaction_id },
    UpdateExpression: "set auth_code = :auth_code",
    ExpressionAttributeValues: { ":auth_code": auth_code },
  });
};

export const updateCustomerCardStatus = async (cardId: string, cardStatus: string) => {
  await updateItemMethod({
    TableName: CUSTOMER_TO_CARD_MAPPING_TABLE,
    Key: { cardId },
    UpdateExpression: "set cardStatus = :cardStatus, activationDateTime = :activationDateTime",
    ExpressionAttributeValues: {
      ":cardStatus": cardStatus,
      ":activationDateTime": new Date().toISOString(),
    },
  });
};
