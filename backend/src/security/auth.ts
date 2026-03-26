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

const ACCESS_TOKEN_EXPIRY_SECONDS = Number(process.env.JWT_ACCESS_EXPIRY_SECONDS ?? 15 * 60);
const REFRESH_TOKEN_EXPIRY_SECONDS = Number(process.env.JWT_REFRESH_EXPIRY_SECONDS ?? 7 * 24 * 60 * 60);

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable not set");
  }
  return secret;
}

function getRefreshJwtSecret(): string {
  return process.env.JWT_REFRESH_SECRET || getJwtSecret();
}

function signJwt(payload: JWTPayload, secret: string, expirySeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
  };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifySignedJwt(token: string, secret: string): JWTPayload | null {
  try {
    const [headerB64, bodyB64, signatureB64] = token.split(".");
    if (!headerB64 || !bodyB64 || !signatureB64) {
      throw new Error("Invalid token format");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${bodyB64}`)
      .digest("base64url");

    if (signatureB64 !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp <= now) {
      throw new Error("Token expired");
    }

    return payload as JWTPayload;
  } catch (err) {
    // Expected failures (expired/invalid tokens) are common in dev due to stale clients.
    // Keep logs quiet unless explicitly enabled.
    if (String(process.env.JWT_DEBUG_LOGS ?? "false").toLowerCase() === "true") {
      console.warn("JWT verification failed:", err instanceof Error ? err.message : String(err));
    }
    return null;
  }
}

/**
 * Create a signed JWT token
 */
export function createJWT(payload: JWTPayload): string {
  return signJwt(payload, getJwtSecret(), ACCESS_TOKEN_EXPIRY_SECONDS);
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  return verifySignedJwt(token, getJwtSecret());
}

/**
 * Create a long-lived refresh token.
 */
export function createRefreshJWT(payload: JWTPayload): string {
  return signJwt(payload, getRefreshJwtSecret(), REFRESH_TOKEN_EXPIRY_SECONDS);
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshJWT(token: string): JWTPayload | null {
  return verifySignedJwt(token, getRefreshJwtSecret());
}
