/**
 * Retention Signal Repository
 * Data access layer for retention signals and account features.
 */

import { query, queryAll, queryOne } from "../connection";
import type { RetentionSignal } from "../../retention/contracts/retention";

interface SaveRetentionSignalInput {
  userid: string;
  account_id: string;
  source: string;
  signal_type: string;
  value: unknown;
  reliability_score: number;
  freshness_hours: number;
  extracted_metadata?: Record<string, unknown>;
}

/**
 * Save a retention signal event.
 */
export async function saveRetentionSignal(
  input: SaveRetentionSignalInput
): Promise<RetentionSignal | null> {
  try {
    const result = await query<RetentionSignal>(
      `INSERT INTO retention_signals 
       (userid, account_id, source, signal_type, value, reliability_score, freshness_hours, extracted_metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.userid,
        input.account_id,
        input.source,
        input.signal_type,
        JSON.stringify(input.value),
        input.reliability_score,
        input.freshness_hours,
        input.extracted_metadata ? JSON.stringify(input.extracted_metadata) : null,
      ]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("[RetentionSignalRepository] Error saving signal:", error);
    return null;
  }
}

/**
 * Get recent signals for an account.
 */
export async function getAccountSignals(
  userid: string,
  account_id: string,
  limit: number = 100,
  hours: number = 24
): Promise<RetentionSignal[]> {
  try {
    return await queryAll<RetentionSignal>(
      `SELECT * FROM retention_signals 
       WHERE userid = $1 AND account_id = $2 
       AND timestamp > NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp DESC 
       LIMIT $3`,
      [userid, account_id, limit]
    );
  } catch (error) {
    console.error("[RetentionSignalRepository] Error fetching signals:", error);
    return [];
  }
}

/**
 * Get signals by source for an account.
 */
export async function getAccountSignalsBySource(
  userid: string,
  account_id: string,
  source: string,
  limit: number = 50
): Promise<RetentionSignal[]> {
  try {
    return await queryAll<RetentionSignal>(
      `SELECT * FROM retention_signals 
       WHERE userid = $1 AND account_id = $2 AND source = $3
       ORDER BY timestamp DESC 
       LIMIT $4`,
      [userid, account_id, source, limit]
    );
  } catch (error) {
    console.error("[RetentionSignalRepository] Error fetching signals by source:", error);
    return [];
  }
}

/**
 * Get aggregated signal health for multiple accounts.
 */
export async function getAccountsSignalCoverage(
  userid: string,
  account_ids: string[]
): Promise<Record<string, { total_signals: number; sources: string[]; latest_timestamp: string }>> {
  try {
    if (account_ids.length === 0) {
      return {};
    }

    const placeholders = account_ids.map((_, i) => `$${i + 2}`).join(",");
    const results = await queryAll<{
      account_id: string;
      total_signals: number;
      sources: string[];
      latest_timestamp: string;
    }>(
      `SELECT 
        account_id,
        COUNT(*) as total_signals,
        ARRAY_AGG(DISTINCT source) as sources,
        MAX(timestamp)::varchar as latest_timestamp
       FROM retention_signals 
       WHERE userid = $1 AND account_id IN (${placeholders})
       GROUP BY account_id`,
      [userid, ...account_ids]
    );

    const coverage: Record<string, any> = {};
    for (const row of results) {
      coverage[row.account_id] = {
        total_signals: row.total_signals,
        sources: row.sources || [],
        latest_timestamp: row.latest_timestamp,
      };
    }
    return coverage;
  } catch (error) {
    console.error("[RetentionSignalRepository] Error fetching signal coverage:", error);
    return {};
  }
}
