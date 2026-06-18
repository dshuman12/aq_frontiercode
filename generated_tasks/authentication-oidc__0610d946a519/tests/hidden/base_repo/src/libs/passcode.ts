import { DIGEST, INTERATIONS, KEY_LENGTH } from "@libs/constants";
import {
  queryTableMethod,
  deleteItemMethod,
  putItemMethod,
  getItemMethod,
} from "@onmoapp/onmo-dynamodb";
import { shaDecrypt, decryptRSA } from "@libs/crypto";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { Logger } from "@onmoapp/onmo-logger";
import { pbkdf2Sync, randomBytes } from "crypto";
import base64url from "base64url";

const auth_hashes_table = process.env.AUTH_HASHES_TABLE as string;
const legacy_auth_table = process.env.LEGACY_AUTH_TABLE as string;
const legacy_rsa_table = process.env.LEGACY_RSA_TABLE as string;
const legacy_auth_backup_table = process.env.LEGACY_AUTH_BACKUP_TABLE as string;
const legacy_rsa_backup_table = process.env.LEGACY_RSA_BACKUP_TABLE as string;
const env = process.env.ENVIRONMENT as string;

type VerifyHashedPasscodeInput = { passcode: string; onmouuid: string };
export const verifyHashedPasscode = async ({ passcode, onmouuid }: VerifyHashedPasscodeInput) => {
  const queryAuthHashesTableRes = await queryTableMethod({
    TableName: auth_hashes_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });

  if (!queryAuthHashesTableRes?.Count) {
    throw new Error(`No record in ${auth_hashes_table} found`);
  }

  const { salt, hash } = queryAuthHashesTableRes.Items![0];
  if (!hash) {
    throw new Error(`Missing hash in ${auth_hashes_table} record`);
  }
  if (!salt) {
    throw new Error(`Missing salt in ${auth_hashes_table} record`);
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

type VerifyPasscodeEncryptedInput = { passcode: string; onmouuid: string; logger: any };
export const verifyPasscodeEncrypted = async ({
  passcode,
  onmouuid,
  logger,
}: VerifyPasscodeEncryptedInput) => {
  //get record from auth table and extract passcode
  const queryAuthTableRes = await queryTableMethod({
    TableName: legacy_auth_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryAuthTableRes?.Items?.length) {
    throw new Error(`No record in ${legacy_auth_table} found`);
  }
  const { passcode_enc_b64 } = queryAuthTableRes.Items[0];
  if (!passcode_enc_b64) {
    throw new Error(`Missing passcode in ${legacy_auth_table} record`);
  }
  logger.info(`Found record in ${legacy_auth_table} with encrypted passcode`);

  //get record from rsa table and extract priviv and privatekey
  const queryRsaTableRes = await queryTableMethod({
    TableName: legacy_rsa_table,
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
  });
  if (!queryRsaTableRes?.Items?.length) {
    throw new Error(`No record in ${legacy_rsa_table} found`);
  }
  const { priviv, privatekey } = queryRsaTableRes.Items[0];
  if (!privatekey) {
    throw new Error(`Missing privatekey in ${legacy_rsa_table} record`);
  }
  if (!priviv) {
    throw new Error(`Missing priviv in ${legacy_rsa_table} record`);
  }
  logger.info(`Found record in ${legacy_rsa_table} with private key and iv`);

  //get encryption key from secrets manager
  const { SecretString } = await getSecret("onmo");
  if (!SecretString) {
    throw new Error("Unable to retrieve secret containing necessary encryption key");
  }
  const { ["encryptkey" + env]: encryptKey } = JSON.parse(SecretString);
  if (!encryptKey) {
    throw new Error("Unable to retrieve necessary encryption key");
  }
  logger.info("Retrieved encryption key from secrets manager");

  //decrypt the private key
  const decryptedPrivateKey = base64url.encode(
    shaDecrypt(encryptKey, { iv: priviv, encryptedData: privatekey }),
  );
  logger.info("Decrypted private key");

  const decryptedPasscode = await decryptRSA(decryptedPrivateKey, passcode_enc_b64);
  logger.info("Decrypted passcode");

  return decryptedPasscode === passcode;
};

type MigratePasscodeInput = { passcode: string; onmouuid: string; logger: Logger };
export const migrateEncryptedPasscodeToHashed = async ({
  passcode,
  onmouuid,
  logger,
}: MigratePasscodeInput) => {
  const { salt, hash } = generatePasscodeHash(passcode);
  try {
    await putItemMethod({
      TableName: auth_hashes_table,
      Item: { onmouuid, salt, hash, created: new Date().toISOString() },
    });
    logger.info("Successfully stored hashed passcode");
  } catch (error: any) {
    throw new Error(`Failed to store hashed passcode: ${error?.message || error}`);
  }

  try {
    await Promise.all([
      deleteItemMethod({ TableName: legacy_auth_table, Key: { onmouuid } }),
      deleteItemMethod({ TableName: legacy_rsa_table, Key: { onmouuid } }),
    ]);
    logger.info("Successfully deleted encrypted passcode records");
  } catch (error: any) {
    // if error, we should delete the new hash record to maintain consistency
    try {
      await deleteItemMethod({ TableName: auth_hashes_table, Key: { onmouuid } });
    } catch (rollbackError: any) {
      logger.error(`Failed to rollback hash creation: ${rollbackError?.message || rollbackError}`);
    }
    throw new Error(`Failed to delete encrypted passcode records: ${error?.message || error}`);
  }
};

type BackupLegacyPasscodeInput = { onmouuid: string; logger: Logger };
export const backupLegacyPasscodeRecords = async ({
  onmouuid,
  logger,
}: BackupLegacyPasscodeInput) => {
  const [legacyAuthRes, legacyRsaRes] = await Promise.all([
    getItemMethod({ TableName: legacy_auth_table, Key: { onmouuid } }),
    getItemMethod({ TableName: legacy_rsa_table, Key: { onmouuid } }),
  ]);

  if (!legacyAuthRes?.Item) {
    throw new Error(`Missing ${legacy_auth_table} item`);
  }
  if (!legacyRsaRes?.Item) {
    throw new Error(`Missing ${legacy_rsa_table} item`);
  }

  logger.info(
    `Backing up ${legacy_auth_table} & ${legacy_rsa_table} records to ${legacy_auth_backup_table} & ${legacy_rsa_backup_table} respectively`,
  );
  await Promise.all([
    putItemMethod({ TableName: legacy_auth_backup_table, Item: legacyAuthRes.Item }),
    putItemMethod({ TableName: legacy_rsa_backup_table, Item: legacyRsaRes.Item }),
  ]);
  logger.info("Successfully backed up encrypted passcode records");
};
