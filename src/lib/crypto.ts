import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Derive 32-byte key for AES-256-GCM from environment
function getMasterKey(): Buffer {
  const secret = process.env.APP_MASTER_ENCRYPTION_KEY || "pms_default_secret_master_key_for_aes_256_encryption_2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt site password using AES-256-GCM
 */
export function encryptSitePassword(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt site password using AES-256-GCM
 */
export function decryptSitePassword(encryptedData: {
  ciphertext: string;
  iv: string;
  authTag: string;
}): string {
  const key = getMasterKey();
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Hash login password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const JWT_SECRET = process.env.JWT_SECRET || "pms_jwt_secret_token_default_fallback_2026";

export interface UserSessionPayload {
  userId: string;
  username: string;
  role: "admin" | "pm" | "user";
  staffId?: string | null;
  fullName?: string;
}

/**
 * Sign JWT session token (expires in 24h)
 */
export function signSessionToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Verify JWT session token
 */
export function verifySessionToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Generate strong random password
 */
export function generateRandomPassword(length = 12): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const specials = "!@#$%^&*";
  const all = uppers + lowers + numbers + specials;

  let pwd = "";
  pwd += uppers[Math.floor(Math.random() * uppers.length)];
  pwd += lowers[Math.floor(Math.random() * lowers.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += specials[Math.floor(Math.random() * specials.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split("").sort(() => 0.5 - Math.random()).join("");
}
