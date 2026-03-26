import crypto from "crypto";
import { query, queryOne, queryAll } from "../connection";
import { encryptToken, decryptToken } from "../../security/tokenCipher";

interface MergeAccount {
  id: string;
  userid: string;
  token_ciphertext: string;
  token_key_version: number;
  account_name: string | null;
  external_account_id: string | null;
  status: "active" | "revoked" | "expired" | "invalid";
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface TokenAuditLog {
  log_id: string;
  userid: string;
  event_type: string;
  provider: string;
  account_id: string | null;
  external_account_id: string | null;
  action_details: any;
  error_message: string | null;
  http_status_code: number | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

function getEncryptionKey(): string | undefined {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    console.warn("TOKEN_ENCRYPTION_KEY not set. Tokens will be stored without encryption.");
  }
  return key;
}

function normalizeUserId(userid: string): string {
  const trimmed = String(userid ?? "").trim();
  const stripped = trimmed.startsWith("user_") ? trimmed.slice(5) : trimmed;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(stripped)) {
    throw new Error(`Invalid user id format: ${trimmed}`);
  }
  return stripped;
}

/**
 * Create or update a Merge account token
 */
export async function upsertMergeAccountToken(
  userid: string,
  externalAccountId: string,
  plainToken: string,
  accountName?: string
): Promise<MergeAccount> {
  const normalizedUserId = normalizeUserId(userid);
  try {
    const existingUser = await queryOne<{ userid: string }>(
      `SELECT userid FROM users WHERE userid = $1`,
      [normalizedUserId]
    );
    if (!existingUser) {
      throw new Error("User not found for token persistence");
    }

    // Encrypted token
    const encryptionKey = getEncryptionKey();
    const encryptedToken = encryptionKey
      ? encryptToken(plainToken, encryptionKey)
      : plainToken;

    // Upsert account
    const accountId = crypto.randomUUID();
    const result = await queryOne<MergeAccount>(
      `INSERT INTO merge_accounts 
        (id, userid, token_ciphertext, token_key_version, account_name, external_account_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (userid, external_account_id) DO UPDATE SET
         token_ciphertext = $3,
         token_key_version = $4,
         updated_at = NOW()
       RETURNING *`,
      [
        accountId,
        normalizedUserId,
        encryptedToken,
        1, // key_version
        accountName || null, // Fixed: was params.accountName
        externalAccountId,    // Fixed: was params.externalAccountId
        "active",
      ]
    );

    if (!result) {
      throw new Error("Failed to upsert account");
    }

    // Log audit
    await logTokenEvent("token_created", "merge", normalizedUserId, result.id, externalAccountId, {
      account_name: accountName,
    });

    return result;
  } catch (err) {
    await logTokenEvent(
      "token_error",
      "merge",
      normalizedUserId,
      null,
      externalAccountId,
      null,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/**
 * Retrieve a Merge account token by external ID
 */
export async function getMergeAccountToken(
  userid: string,
  externalAccountId: string
): Promise<string | null> {
  const normalizedUserId = normalizeUserId(userid);
  try {
    const account = await queryOne<MergeAccount>(
      `SELECT * FROM merge_accounts WHERE userid = $1 AND external_account_id = $2 AND status = 'active'`,
      [normalizedUserId, externalAccountId]
    );

    if (!account) {
      return null;
    }

    // Log usage
    await query(
      `UPDATE merge_accounts SET last_used_at = NOW() WHERE id = $1`,
      [account.id]
    );

    // Decrypt token
    const encryptionKey = getEncryptionKey();
    const decryptedToken = (encryptionKey && account.token_ciphertext)
      ? decryptToken(account.token_ciphertext, encryptionKey)
      : account.token_ciphertext;

    // Log audit
    await logTokenEvent("token_used", "merge", normalizedUserId, account.id, externalAccountId);

    return decryptedToken;
  } catch (err) {
    await logTokenEvent(
      "token_error",
      "merge",
      normalizedUserId,
      null,
      externalAccountId,
      null,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

export async function getLatestMergeAccountTokenForUser(
  userid: string
): Promise<string | null> {
  const normalizedUserId = normalizeUserId(userid);
  const account = await queryOne<MergeAccount>(
    `SELECT *
     FROM merge_accounts
     WHERE userid = $1 AND status = 'active'
     ORDER BY COALESCE(last_used_at, updated_at, created_at) DESC
     LIMIT 1`,
    [normalizedUserId]
  );

  if (!account) {
    return null;
  }

  const encryptionKey = getEncryptionKey();
  return encryptionKey
    ? decryptToken(account.token_ciphertext, encryptionKey)
    : account.token_ciphertext;
}

/**
 * Revoke a Merge account token
 */
export async function revokeMergeAccountToken(
  userid: string,
  externalAccountId: string,
  reason?: string
): Promise<void> {
  const normalizedUserId = normalizeUserId(userid);
  try {
    const result = await query(
      `UPDATE merge_accounts SET status = 'revoked', updated_at = NOW() 
       WHERE userid = $1 AND external_account_id = $2 RETURNING id`,
      [normalizedUserId, externalAccountId]
    );

    // Check rowCount safely
    if (!result || (result as any).rowCount === 0) {
      throw new Error("Account not found");
    }

    const accountId = (result as any).rows[0]?.id;
    
    // Fixed: Corrected the object syntax and parameter names
    await logTokenEvent(
      "token_revoked",
      "merge",
      normalizedUserId,
      accountId,
      externalAccountId,
      { reason: reason }
    );
  } catch (err) {
    await logTokenEvent(
      "token_error",
      "merge",
      normalizedUserId,
      null,
      externalAccountId,
      null,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/**
 * Get all active tokens for a user
 */
export async function getUserMergeAccounts(userid: string): Promise<MergeAccount[]> {
  const normalizedUserId = normalizeUserId(userid);
  return queryAll<MergeAccount>(
    `SELECT * FROM merge_accounts WHERE userid = $1 AND status = 'active' ORDER BY created_at DESC`,
    [normalizedUserId]
  );
}

/**
 * Log a token event to audit trail
 */
export async function logTokenEvent(
  event_type: string,
  provider: string,
  userid: string,
  accountId: string | null,
  externalAccountId: string | null,
  actionDetails?: any,
  errorMessage?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Note: We don't normalize inside logTokenEvent to avoid infinite recursion 
  // if normalizeUserId throws, but I'll leave your logic as is for consistency.
  try {
    await query(
      `INSERT INTO token_audit_logs 
        (log_id, userid, event_type, provider, account_id, external_account_id, action_details, error_message, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        crypto.randomUUID(),
        userid, 
        event_type,
        provider,
        accountId,
        externalAccountId,
        JSON.stringify(actionDetails || {}),
        errorMessage || null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (err) {
    console.error("Failed to log token event:", err);
  }
}

export async function hasActiveMergeAccount(userid: string): Promise<boolean> {
  const normalizedUserId = normalizeUserId(userid);
  const row = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM merge_accounts WHERE userid = $1 AND status = 'active') AS exists`,
    [normalizedUserId]
  );
  return Boolean(row?.exists);
}

export async function getAuditLogs(
  provider?: string,
  eventType?: string,
  limitDays: number = 7
): Promise<TokenAuditLog[]> {
  let query_text = `SELECT * FROM token_audit_logs WHERE created_at > NOW() - INTERVAL '${limitDays} days'`;
  const params: any[] = [];

  if (provider) {
    params.push(provider);
    query_text += ` AND provider = $${params.length}`;
  }

  if (eventType) {
    params.push(eventType);
    query_text += ` AND event_type = $${params.length}`;
  }

  query_text += ` ORDER BY created_at DESC LIMIT 100`;

  return queryAll<TokenAuditLog>(query_text, params);
}