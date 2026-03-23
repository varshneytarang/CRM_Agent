import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16; // GCM produces a 128-bit auth tag

/**
 * Encrypts a token using AES-256-GCM
 * Returns: iv:ciphertext:authTag (all in hex)
 */
export function encryptToken(
  plaintext: string,
  encryptionKey: string
): string {
  const key = normalizeKey(encryptionKey);
  const iv = crypto.randomBytes(12); // GCM typically uses 96-bit IV

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:ciphertext:authTag (all hex)
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypts a token encrypted with encryptToken()
 * Input format: iv:ciphertext:authTag (all in hex)
 */
export function decryptToken(ciphertext: string, encryptionKey: string): string {
  try {
    const key = normalizeKey(encryptionKey);
    const [ivHex, encryptedHex, authTagHex] = ciphertext.split(":");

    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error("Invalid ciphertext format. Expected iv:ciphertext:authTag");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    throw new Error(`Token decryption failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Validates that the encryption key is valid AES-256 key (32 bytes)
 * If given a string, converts to buffer and ensures it's 32 bytes
 */
function normalizeKey(key: string | Buffer): Buffer {
  if (typeof key === "string") {
    // If string, hash it to get exactly 32 bytes
    return crypto.createHash("sha256").update(key).digest();
  }
  if (key.length !== 32) {
    throw new Error(
      `AES-256 key must be 32 bytes. Received ${key.length} bytes.`
    );
  }
  return key;
}

/**
 * Generates a random 32-byte encryption key (useful for tests/setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
