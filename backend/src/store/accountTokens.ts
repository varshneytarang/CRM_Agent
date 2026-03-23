import {
  upsertMergeAccountToken,
  getMergeAccountToken,
  revokeMergeAccountToken,
} from "../db/repositories/tokenRepository";

const accountTokenByEndUserOriginId = new Map<string, string>();

const USE_DB = Boolean(process.env.DATABASE_URL);
const FALLBACK_TO_MEMORY = process.env.TOKEN_STORE_FALLBACK_MEMORY !== "false";

/**
 * Store account token - use DB if available, fallback to memory map
 */
export async function setAccountToken(
  endUserOriginId: string,
  accountToken: string
): Promise<void> {
  // Always store in memory as fallback
  accountTokenByEndUserOriginId.set(endUserOriginId, accountToken);

  // Try to store in database if configured
  if (USE_DB) {
    try {
      await upsertMergeAccountToken(endUserOriginId, accountToken);
      console.log(`✅ Token persisted for ${endUserOriginId}`);
    } catch (err) {
      console.error(
        `⚠️  Failed to persist token for ${endUserOriginId}:`,
        err instanceof Error ? err.message : String(err)
      );
      if (!FALLBACK_TO_MEMORY) {
        throw err;
      }
      console.log(
        `  Continuing with in-memory fallback (TOKEN_STORE_FALLBACK_MEMORY=${FALLBACK_TO_MEMORY})`
      );
    }
  }
}

/**
 * Retrieve account token - try DB first, fallback to memory map
 */
export async function getAccountToken(
  endUserOriginId: string
): Promise<string | undefined> {
  if (USE_DB) {
    try {
      const token = await getMergeAccountToken(endUserOriginId);
      if (token) {
        console.log(`✅ Token retrieved from DB for ${endUserOriginId}`);
        return token;
      }
    } catch (err) {
      console.error(
        `⚠️  Failed to retrieve token from DB for ${endUserOriginId}:`,
        err instanceof Error ? err.message : String(err)
      );
      if (!FALLBACK_TO_MEMORY) {
        throw err;
      }
      console.log(
        `  Falling back to in-memory store (TOKEN_STORE_FALLBACK_MEMORY=${FALLBACK_TO_MEMORY})`
      );
    }
  }

  // Fallback to memory
  const memoryToken = accountTokenByEndUserOriginId.get(endUserOriginId);
  if (memoryToken) {
    console.log(`📦 Token retrieved from memory fallback for ${endUserOriginId}`);
  }
  return memoryToken;
}

/**
 * Revoke a token
 */
export async function revokeAccountToken(endUserOriginId: string): Promise<void> {
  // Remove from memory
  accountTokenByEndUserOriginId.delete(endUserOriginId);

  if (USE_DB) {
    try {
      await revokeMergeAccountToken(endUserOriginId, "Manual revocation");
      console.log(`✅ Token revoked for ${endUserOriginId}`);
    } catch (err) {
      console.error(
        `⚠️  Failed to revoke token for ${endUserOriginId}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}
