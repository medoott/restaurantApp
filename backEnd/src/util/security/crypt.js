import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = "sha512";

function deriveKey(secret) {
  const keyMaterial = crypto.pbkdf2Sync(
    secret,
    "restaurant-platform-encryption-v1",
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST,
  );
  return keyMaterial;
}

export function encrypt(plaintext, encryptKey) {
  const key = deriveKey(encryptKey || process.env.CRYPT_SIGNATURE || process.env.ENC_PHONE);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plaintext), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext, decryptKey) {
  const key = deriveKey(decryptKey || process.env.CRYPT_SIGNATURE || process.env.ENC_PHONE);
  const parts = String(ciphertext).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export const generateEncrypt = ({ text, encryptKey } = {}) => encrypt(text, encryptKey);
export const Decrypt = ({ ciphertext, signature } = {}) => decrypt(ciphertext, signature);

export function hashPhone(phone, secret) {
  const key = deriveKey(secret || process.env.CRYPT_SIGNATURE || process.env.ENC_PHONE);
  return crypto.createHmac("sha256", key).update(String(phone)).digest("hex");
}
