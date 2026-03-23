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

/**
 * ============================================================================
 * PASSWORD HASHING (PBKDF2)
 * ============================================================================
 */

const HASH_ALGORITHM = "sha256";
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

/**
 * Hash a password using PBKDF2 with random salt
 * Returns: salt:hash (both in hex)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    HASH_ALGORITHM
  );
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a password against a hash
 * Input hash format: salt:hash (both in hex)
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) {
      throw new Error("Invalid hash format. Expected salt:hash");
    }

    const salt = Buffer.from(saltHex, "hex");
    const computedHash = crypto.pbkdf2Sync(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      HASH_ALGORITHM
    );

    return computedHash.toString("hex") === hashHex;
  } catch (err) {
    console.error("Password verification failed:", err);
    return false;
  }
}

/**
 * ============================================================================
 * JWT TOKEN GENERATION (HS256)
 * ============================================================================
 */

interface JWTPayload {
  userid: string;
  username: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

/**
 * Create a signed JWT token
 */
export function createJWT(payload: JWTPayload): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable not set");
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY,
  };

  // Create header.payload.signature
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable not set");
    }

    const [headerB64, bodyB64, signatureB64] = token.split(".");
    if (!headerB64 || !bodyB64 || !signatureB64) {
      throw new Error("Invalid token format");
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest("base64url");

    if (signatureB64 !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString());

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("Token expired");
    }

    return payload as JWTPayload;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
