import {
  DIGEST,
  INTERATIONS,
  KEY_LENGTH,
  ENV,
  AUTH_HASHES_TABLE,
  LEGACY_AUTH_TABLE,
  LEGACY_RSA_TABLE,
  LEGACY_AUTH_BACKUP_TABLE,
  LEGACY_RSA_BACKUP_TABLE,
} from "@libs/config";
import {
  LOGIN_SCENARIO_FIRST_TIME_EXISTING_CUSTOMER,
  LOGIN_SCENARIO_FIRST_TIME_NEW_CUSTOMER,
  LOGIN_SCENARIO_FIRST_TIME_NEW_DEVICE,
} from "@libs/config";
import {
  queryTableMethod,
  deleteItemMethod,
  putItemMethod,
  getItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { shaDecrypt, decryptRSA } from "@libs/crypto";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { logger } from "@onmoapp/logger";
import { pbkdf2Sync, randomBytes } from "crypto";
import base64url from "base64url";

export type FirstTimeLoginScenario =
  | typeof LOGIN_SCENARIO_FIRST_TIME_NEW_DEVICE
  | typeof LOGIN_SCENARIO_FIRST_TIME_EXISTING_CUSTOMER
  | typeof LOGIN_SCENARIO_FIRST_TIME_NEW_CUSTOMER;

type ResolvePasscodeRecordFlagsInput = { onmouuid: string };
const resolvePasscodeRecordFlags = async ({ onmouuid }: ResolvePasscodeRecordFlagsInput) => {
  const [queryAuthTableRes, queryRsaTableRes, queryHashTableRes] = await Promise.all([
    queryTableMethod({
      TableName: LEGACY_AUTH_TABLE,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    }),
    queryTableMethod({
      TableName: LEGACY_RSA_TABLE,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    }),
    queryTableMethod({
      TableName: AUTH_HASHES_TABLE,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    }),
  ]);

  const hasAuthRecord = !!queryAuthTableRes?.Items?.length;
  const hasRsaRecord = !!queryRsaTableRes?.Items?.length;
  const hasHashRecord = !!queryHashTableRes?.Items?.length;

  return { hasAuthRecord, hasRsaRecord, hasHashRecord };
};

type GetFirstTimeLoginScenarioInput = { onmouuid: string };
export const getFirstTimeLoginScenario = async ({
  onmouuid,
}: GetFirstTimeLoginScenarioInput): Promise<FirstTimeLoginScenario> => {
  const { hasAuthRecord, hasRsaRecord, hasHashRecord } = await resolvePasscodeRecordFlags({
    onmouuid,
  });

  if (hasHashRecord) {
    return LOGIN_SCENARIO_FIRST_TIME_NEW_DEVICE;
  }
  if (hasAuthRecord && hasRsaRecord) {
    return LOGIN_SCENARIO_FIRST_TIME_EXISTING_CUSTOMER;
  }
  if (hasAuthRecord || hasRsaRecord) {
    throw new Error("User has inconsistent passcode records");
  }
  return LOGIN_SCENARIO_FIRST_TIME_NEW_CUSTOMER;
};
type VerifyHashedPasscodeInput = { passcode: string; onmouuid: string };
export const verifyHashedPasscode = async ({ passcode, onmouuid }: VerifyHashedPasscodeInput) => {
  const queryAuthHashesTableRes = await queryTableMethod({
    TableName: AUTH_HASHES_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });

  if (!queryAuthHashesTableRes?.Count) {
    throw new Error(`No record in ${AUTH_HASHES_TABLE} found`);
  }

  const { salt, hash } = queryAuthHashesTableRes.Items![0];
  if (!hash) {
    throw new Error(`Missing hash in ${AUTH_HASHES_TABLE} record`);
  }
  if (!salt) {
    throw new Error(`Missing salt in ${AUTH_HASHES_TABLE} record`);
  }

  const passcodeVerified = verifyPasscodeHash({ passcode, salt, hash });

  return passcodeVerified;
};

type VerifyPasscodeHashInput = { passcode: string; salt: string; hash: string };
const verifyPasscodeHash = ({ passcode, salt, hash }: VerifyPasscodeHashInput) => {
  const derivedHash = pbkdf2Sync(
    passcode.toString(),
    salt,
    INTERATIONS,
    KEY_LENGTH,
    DIGEST,
  ).toString("hex");

  return derivedHash === hash;
};

export const generatePasscodeHash = (passcode: string) => {
  const generatedSalt = randomBytes(16).toString("hex");
  const generatedHash = pbkdf2Sync(
    passcode.toString(),
    generatedSalt,
    INTERATIONS,
    KEY_LENGTH,
    DIGEST,
  ).toString("hex");

  return { salt: generatedSalt, hash: generatedHash };
};

type VerifyPasscodeEncryptedInput = { passcode: string; onmouuid: string };
export const verifyPasscodeEncrypted = async ({
  passcode,
  onmouuid,
}: VerifyPasscodeEncryptedInput) => {
  //get record from auth table and extract passcode
  const queryAuthTableRes = await queryTableMethod({
    TableName: LEGACY_AUTH_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryAuthTableRes?.Items?.length) {
    throw new Error(`No record in ${LEGACY_AUTH_TABLE} found`);
  }
  const { passcode_enc_b64 } = queryAuthTableRes.Items[0];
  if (!passcode_enc_b64) {
    throw new Error(`Missing passcode in ${LEGACY_AUTH_TABLE} record`);
  }

  //get record from rsa table and extract priviv and privatekey
  const queryRsaTableRes = await queryTableMethod({
    TableName: LEGACY_RSA_TABLE,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryRsaTableRes?.Items?.length) {
    throw new Error(`No record in ${LEGACY_RSA_TABLE} found`);
  }
  const { priviv, privatekey } = queryRsaTableRes.Items[0];
  if (!privatekey) {
    throw new Error(`Missing privatekey in ${LEGACY_RSA_TABLE} record`);
  }
  if (!priviv) {
    throw new Error(`Missing priviv in ${LEGACY_RSA_TABLE} record`);
  }

  //get encryption key from secrets manager
  const { SecretString } = await getSecret("onmo");
  if (!SecretString) {
    throw new Error("Unable to retrieve secret containing necessary encryption key");
  }
  const { ["encryptkey" + ENV]: encryptKey } = JSON.parse(SecretString);
  if (!encryptKey) {
    throw new Error("Unable to retrieve necessary encryption key");
  }

  //decrypt the private key
  const decryptedPrivateKey = base64url.encode(
    shaDecrypt(encryptKey, { iv: priviv, encryptedData: privatekey }),
  );

  const decryptedPasscode = await decryptRSA(decryptedPrivateKey, passcode_enc_b64);

  return decryptedPasscode === passcode;
};

type MigratePasscodeInput = { passcode: string; onmouuid: string };
export const migrateEncryptedPasscodeToHashed = async ({
  passcode,
  onmouuid,
}: MigratePasscodeInput) => {
  const { salt, hash } = generatePasscodeHash(passcode);
  try {
    await putItemMethod({
      TableName: AUTH_HASHES_TABLE,
      Item: { onmouuid, salt, hash, created: new Date().toISOString() },
    });
  } catch (error: any) {
    throw new Error(`Failed to store hashed passcode: ${error?.message || error}`);
  }

  try {
    await Promise.all([
      deleteItemMethod({ TableName: LEGACY_AUTH_TABLE, Key: { onmouuid } }),
      deleteItemMethod({ TableName: LEGACY_RSA_TABLE, Key: { onmouuid } }),
    ]);
  } catch (error: any) {
    // if error, we should delete the new hash record to maintain consistency
    try {
      await deleteItemMethod({ TableName: AUTH_HASHES_TABLE, Key: { onmouuid } });
    } catch (rollbackError: any) {
      logger.error(`Failed to rollback hash creation: ${rollbackError?.message || rollbackError}`);
    }
    throw new Error(`Failed to delete encrypted passcode records: ${error?.message || error}`);
  }
};

type BackupLegacyPasscodeInput = { onmouuid: string };
export const backupLegacyPasscodeRecords = async ({ onmouuid }: BackupLegacyPasscodeInput) => {
  const [legacyAuthRes, legacyRsaRes] = await Promise.all([
    getItemMethod({ TableName: LEGACY_AUTH_TABLE, Key: { onmouuid } }),
    getItemMethod({ TableName: LEGACY_RSA_TABLE, Key: { onmouuid } }),
  ]);

  if (!legacyAuthRes?.Item) {
    throw new Error(`Missing ${LEGACY_AUTH_TABLE} item`);
  }
  if (!legacyRsaRes?.Item) {
    throw new Error(`Missing ${LEGACY_RSA_TABLE} item`);
  }

  await Promise.all([
    putItemMethod({ TableName: LEGACY_AUTH_BACKUP_TABLE, Item: legacyAuthRes.Item }),
    putItemMethod({ TableName: LEGACY_RSA_BACKUP_TABLE, Item: legacyRsaRes.Item }),
  ]);
};
