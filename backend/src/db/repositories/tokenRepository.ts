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

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn(
    "⚠️  TOKEN_ENCRYPTION_KEY not set. Tokens will not be encrypted."
  );
}

/**
 * Create or update a Merge account token
 */
export async function upsertMergeAccountToken(
  externalAccountId: string,
  plainToken: string,
  accountName?: string
): Promise<MergeAccount> {
  try {
    // Create user entry if needed (using externalAccountId as temp userid)
    const fakeUserid = `user_${externalAccountId}`;
    
    await query(
      `INSERT INTO users (userid, username, org_name, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (userid) DO NOTHING`,
      [fakeUserid, `user_${externalAccountId}`, null, null]
    );

    // Encrypt token
    const encryptedToken = ENCRYPTION_KEY
      ? encryptToken(plainToken, ENCRYPTION_KEY)
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
        fakeUserid,
        encryptedToken,
        1, // key_version
        accountName || null,
        externalAccountId,
        "active",
      ]
    );

    if (!result) {
      throw new Error("Failed to upsert account");
    }

    // Log audit
    await logTokenEvent("token_created", "merge", result.id, externalAccountId, {
      account_name: accountName,
    });

    return result;
  } catch (err) {
    await logTokenEvent(
      "token_error",
      "merge",
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
  externalAccountId: string
): Promise<string | null> {
  try {
    const account = await queryOne<MergeAccount>(
      `SELECT * FROM merge_accounts WHERE external_account_id = $1 AND status = 'active'`,
      [externalAccountId]
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
    const decryptedToken = ENCRYPTION_KEY
      ? decryptToken(account.token_ciphertext, ENCRYPTION_KEY)
      : account.token_ciphertext;

    // Log audit
    await logTokenEvent("token_used", "merge", account.id, externalAccountId);

    return decryptedToken;
  } catch (err) {
    await logTokenEvent(
      "token_error",
      "merge",
      null,
      externalAccountId,
      null,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/**
 * Revoke a Merge account token
 */
export async function revokeMergeAccountToken(
  externalAccountId: string,
  reason?: string
): Promise<void> {
  try {
    const result = await query(
      `UPDATE merge_accounts SET status = 'revoked', updated_at = NOW() 
       WHERE external_account_id = $1 RETURNING id`,
      [externalAccountId]
    );

    if (result.rowCount === 0) {
      throw new Error("Account not found");
    }

    const accountId = result.rows[0]?.id;
    await logTokenEvent(
      "token_revoked",
      "merge",
      accountId,
      externalAccountId,
      { reason }
    );
  } catch (err) {
    await logTokenEvent(
      "token_error",
      "merge",
      null,
      externalAccountId,
      null,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/**
 * Get all active tokens for a user (for dashboard/management)
 */
export async function getUserMergeAccounts(userid: string): Promise<MergeAccount[]> {
  const accounts = await queryAll<MergeAccount>(
    `SELECT * FROM merge_accounts WHERE userid = $1 AND status = 'active' ORDER BY created_at DESC`,
    [userid]
  );
  return accounts;
}

/**
 * Log a token event to audit trail
 */
export async function logTokenEvent(
  event_type: string,
  provider: string,
  accountId: string | null,
  externalAccountId: string | null,
  actionDetails?: any,
  errorMessage?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Use a placeholder userid for now; in production, this would come from auth context
    const userid = `user_${externalAccountId || "unknown"}`;
    
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
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit logs for a time period
 */
export async function getAuditLogs(
  provider?: string,
  eventType?: string,
  limitDays: number = 7
): Promise<TokenAuditLog[]> {
  let query_text = `SELECT * FROM token_audit_logs WHERE created_at > NOW() - INTERVAL '${limitDays} days'`;
  const params: any[] = [];

  if (provider) {
    query_text += ` AND provider = $${params.length + 1}`;
    params.push(provider);
  }

  if (eventType) {
    query_text += ` AND event_type = $${params.length + 1}`;
    params.push(eventType);
  }

  query_text += ` ORDER BY created_at DESC LIMIT 100`;

  return queryAll<TokenAuditLog>(query_text, params);
}
