import {
  upsertMergeAccountToken,
  getMergeAccountToken,
  getLatestMergeAccountTokenForUser,
  revokeMergeAccountToken,
  hasActiveMergeAccount,
} from "../db/repositories/tokenRepository";

const accountTokenByEndUserOriginId = new Map<string, string>();

function normalizeUserId(value: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed.startsWith("user_") ? trimmed.slice(5) : trimmed;
}

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function fallbackToMemory(): boolean {
  return process.env.TOKEN_STORE_FALLBACK_MEMORY !== "false";
}

/**
 * Store account token - use DB if available, fallback to memory map
 */
export async function setAccountToken(
  userId: string,
  accountToken: string,
  externalAccountId?: string
): Promise<void> {
  const normalizedUserId = normalizeUserId(userId);
  const resolvedExternalAccountId = externalAccountId ?? normalizedUserId;
  const memoryKey = `${normalizedUserId}:${resolvedExternalAccountId}`;

  // Always store in memory as fallback
  accountTokenByEndUserOriginId.set(memoryKey, accountToken);
  accountTokenByEndUserOriginId.set(normalizedUserId, accountToken);

  // Try to store in database if configured
  if (useDb()) {
    try {
      await upsertMergeAccountToken(normalizedUserId, resolvedExternalAccountId, accountToken);
      console.log(`✅ Token persisted for ${normalizedUserId}:${resolvedExternalAccountId}`);
    } catch (err) {
      console.error(
        `⚠️  Failed to persist token for ${normalizedUserId}:${resolvedExternalAccountId}:`,
        err instanceof Error ? err.message : String(err)
      );
      if (!fallbackToMemory()) {
        throw err;
      }
      console.log(
        `  Continuing with in-memory fallback (TOKEN_STORE_FALLBACK_MEMORY=${fallbackToMemory()})`
      );
    }
  }
}

/**
 * Retrieve account token - try DB first, fallback to memory map
 */
export async function getAccountToken(
  userId: string,
  externalAccountId?: string
): Promise<string | undefined> {
  const normalizedUserId = normalizeUserId(userId);
  const resolvedExternalAccountId = externalAccountId ?? null;

  if (useDb()) {
    try {
      const token = resolvedExternalAccountId
        ? await getMergeAccountToken(normalizedUserId, resolvedExternalAccountId)
        : await getLatestMergeAccountTokenForUser(normalizedUserId);
      if (token) {
        console.log(`✅ Token retrieved from DB for ${normalizedUserId}`);
        return token;
      }
    } catch (err) {
      console.error(
        `⚠️  Failed to retrieve token from DB for ${normalizedUserId}:`,
        err instanceof Error ? err.message : String(err)
      );
      if (!fallbackToMemory()) {
        throw err;
      }
      console.log(
        `  Falling back to in-memory store (TOKEN_STORE_FALLBACK_MEMORY=${fallbackToMemory()})`
      );
    }
  }

  // Fallback to memory
  const memoryKey = resolvedExternalAccountId
    ? `${normalizedUserId}:${resolvedExternalAccountId}`
    : normalizedUserId;
  const memoryToken = accountTokenByEndUserOriginId.get(memoryKey);
  if (memoryToken) {
    console.log(`📦 Token retrieved from memory fallback for ${memoryKey}`);
  }
  return memoryToken;
}

/**
 * Revoke a token
 */
export async function revokeAccountToken(
  userId: string,
  externalAccountId?: string
): Promise<void> {
  const normalizedUserId = normalizeUserId(userId);
  const resolvedExternalAccountId = externalAccountId ?? normalizedUserId;
  const memoryKey = `${normalizedUserId}:${resolvedExternalAccountId}`;

  // Remove from memory
  accountTokenByEndUserOriginId.delete(memoryKey);

  if (useDb()) {
    try {
      await revokeMergeAccountToken(normalizedUserId, resolvedExternalAccountId, "Manual revocation");
      console.log(`✅ Token revoked for ${normalizedUserId}:${resolvedExternalAccountId}`);
    } catch (err) {
      console.error(
        `⚠️  Failed to revoke token for ${normalizedUserId}:${resolvedExternalAccountId}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

export async function hasAccountToken(endUserOriginId: string): Promise<boolean> {
  const normalizedUserId = normalizeUserId(endUserOriginId);
  if (useDb()) {
    try {
      return await hasActiveMergeAccount(normalizedUserId);
    } catch (err) {
      if (!fallbackToMemory()) {
        throw err;
      }
    }
  }
  return accountTokenByEndUserOriginId.has(normalizedUserId);
}
