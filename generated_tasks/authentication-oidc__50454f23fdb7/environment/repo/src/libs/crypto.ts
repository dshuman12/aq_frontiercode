import { getCurrentTimestampInSeconds } from "@libs/utils";
import {
  randomBytes,
  createHash,
  createDecipheriv,
  createCipheriv,
  generateKeyPairSync,
} from "crypto";
var Crypt = require("hybrid-crypto-js").Crypt;
import base64url from "base64url";
import jwt from "jsonwebtoken";
import { ENV, ONMO_AUTH_URL, ONMO_API_URL } from "@libs/config";

export type DecodedToken = {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  jti?: string;
  env?: string;
  scope?: string;
};
type GenerateAccessTokenInput = {
  onmouuid: string;
  scope: string;
  secretKey: string;
  expiryMinutes: number;
};
type shaDecryptData = { iv: string; encryptedData: string };
type VerifyTokenInput = { token: string; pubKey: string };

export const generateAuthCode = (length: number = 64): string =>
  randomBytes(length).toString("hex");

export const generateUnsignedChallenge = (length: number = 64): string =>
  randomBytes(length).toString("base64");

export const generateAccessToken = ({
  onmouuid,
  scope,
  secretKey,
  expiryMinutes,
}: GenerateAccessTokenInput) => {
  const sanitisedPrivKey = secretKey.replace(/\\n/g, "\n");
  const issuedAt = getCurrentTimestampInSeconds();
  const expirationTime = issuedAt + expiryMinutes * 60;
  const token_id = generateJti();
  const payload = {
    iss: `${ONMO_AUTH_URL}/oidc`,
    sub: onmouuid,
    aud: ONMO_API_URL,
    exp: expirationTime,
    iat: issuedAt,
    jti: token_id,
    env: ENV,
    scope,
  };

  return {
    access_token: jwt.sign(payload, sanitisedPrivKey, { algorithm: "RS256" }),
    expires_in: expirationTime,
    token_id,
  };
};

export const generateJti = () => randomBytes(16).toString("hex");

export const verifyToken = ({ token, pubKey }: VerifyTokenInput): Promise<DecodedToken> => {
  const sanitisedPubKey = pubKey.replace(/\\n/g, "\n");

  return new Promise((resolve, reject) => {
    jwt.verify(token, sanitisedPubKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as DecodedToken);
      }
    });
  });
};

export const generateCodeChallenge = (codeVerifier: string) => {
  return createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

export const shaDecrypt = (encryptKey: string, data: shaDecryptData) => {
  const iv = Buffer.from(data.iv, "hex");
  const encryptedText = Buffer.from(data.encryptedData, "hex");

  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(encryptKey), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

export const decryptRSA = async (privateKey: string, encryptedData: string) => {
  const decodedPrivateKey = base64url.decode(privateKey);
  const decodedData = base64url.decode(encryptedData);

  const crypt = await new Crypt({
    aesStandard: "AES-CBC",
    aesKeySize: 192,
    rsaStandard: "RSA-OAEP",
    md: "sha512",
  });

  const decrypted = crypt.decrypt(decodedPrivateKey, decodedData);

  return decrypted.message;
};

export const shaEncrypt = (secretkey: string, data: string) => {
  const decodedData = base64url.decode(data);
  const iv = randomBytes(16);

  const cipher = createCipheriv("aes-256-cbc", Buffer.from(secretkey), iv);
  let encrypted = cipher.update(decodedData);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
};

export const encryptRSA = async (key: string, data: string) => {
  const publicKey = base64url.decode(key);

  const crypt = new Crypt({
    aesStandard: "AES-CBC",
    aesKeySize: 128,
    rsaStandard: "RSA-OAEP",
    md: "sha512",
  });

  const encrypted = crypt.encrypt(publicKey, data);

  return base64url.encode(encrypted);
};

export const generateKeyPair = () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { pubkey_b64: base64url.encode(publicKey), privkey_b64: base64url.encode(privateKey) };
};
