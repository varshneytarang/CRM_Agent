/**
 * Retention Score Repository
 * Data access layer for churn risk assessments.
 */

import { query, queryAll, queryOne } from "../connection";
import type { RetentionScore } from "../../retention/contracts/retention";

interface SaveRetentionScoreInput {
  userid: string;
  account_id: string;
  company_name: string;
  annual_contract_value: number;
  churn_risk_30d: number;
  churn_risk_90d: number;
  contraction_risk: number;
  relationship_risk: number;
  overall_risk_level: string;
  confidence_score: number;
  data_quality_score: number;
  top_risk_reasons: Record<string, unknown>[];
  suggested_interventions: string[];
  suggested_playbooks: string[];
  model_version: string;
  scored_at: string;
}

/**
 * Save or update a retention score.
 */
export async function saveRetentionScore(
  input: SaveRetentionScoreInput
): Promise<RetentionScore | null> {
  try {
    const result = await query<RetentionScore>(
      `INSERT INTO retention_scores 
       (userid, account_id, company_name, annual_contract_value, 
        churn_risk_30d, churn_risk_90d, contraction_risk, relationship_risk,
        overall_risk_level, confidence_score, data_quality_score,
        top_risk_reasons, suggested_interventions, suggested_playbooks,
        model_version, scored_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (userid, account_id) DO UPDATE SET
        overall_risk_level = $9,
        confidence_score = $10,
        data_quality_score = $11,
        top_risk_reasons = $12,
        suggested_interventions = $13,
        suggested_playbooks = $14,
        model_version = $15,
        scored_at = $16,
        updated_at = NOW()
       RETURNING *`,
      [
        input.userid,
        input.account_id,
        input.company_name,
        input.annual_contract_value,
        input.churn_risk_30d,
        input.churn_risk_90d,
        input.contraction_risk,
        input.relationship_risk,
        input.overall_risk_level,
        input.confidence_score,
        input.data_quality_score,
        JSON.stringify(input.top_risk_reasons),
        JSON.stringify(input.suggested_interventions),
        JSON.stringify(input.suggested_playbooks),
        input.model_version,
        input.scored_at,
      ]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("[RetentionScoreRepository] Error saving score:", error);
    return null;
  }
}

/**
 * Get latest score for an account.
 */
export async function getLatestRetentionScore(
  userid: string,
  account_id: string
): Promise<RetentionScore | null> {
  try {
    return await queryOne<RetentionScore>(
      `SELECT * FROM retention_scores 
       WHERE userid = $1 AND account_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userid, account_id]
    );
  } catch (error) {
    console.error("[RetentionScoreRepository] Error fetching score:", error);
    return null;
  }
}

/**
 * Get all high-risk accounts for a user.
 */
export async function getHighRiskAccounts(
  userid: string,
  risk_level: string = "high",
  limit: number = 50
): Promise<RetentionScore[]> {
  try {
    return await queryAll<RetentionScore>(
      `SELECT * FROM retention_scores 
       WHERE userid = $1 AND overall_risk_level = $2
       ORDER BY updated_at DESC
       LIMIT $3`,
      [userid, risk_level, limit]
    );
  } catch (error) {
    console.error("[RetentionScoreRepository] Error fetching high-risk accounts:", error);
    return [];
  }
}

/**
 * Get accounts by risk band with pagination.
 */
export async function getAccountsByRiskBand(
  userid: string,
  risk_level: "high" | "medium" | "low",
  offset: number = 0,
  limit: number = 50
): Promise<{ accounts: RetentionScore[]; total: number }> {
  try {
    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM retention_scores 
       WHERE userid = $1 AND overall_risk_level = $2`,
      [userid, risk_level]
    );

    const accounts = await queryAll<RetentionScore>(
      `SELECT * FROM retention_scores 
       WHERE userid = $1 AND overall_risk_level = $2
       ORDER BY updated_at DESC
       LIMIT $3 OFFSET $4`,
      [userid, risk_level, limit, offset]
    );

    return {
      accounts,
      total: countResult?.total || 0,
    };
  } catch (error) {
    console.error("[RetentionScoreRepository] Error fetching accounts by risk band:", error);
    return { accounts: [], total: 0 };
  }
}

/**
 * Get summary statistics for all scores.
 */
export async function getRetentionSummary(userid: string): Promise<{
  total_accounts_scored: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  avg_churn_risk_30d: number;
  total_at_risk_acv: number;
}> {
  try {
    const result = await queryOne<any>(
      `SELECT 
        COUNT(*) as total_accounts_scored,
        SUM(CASE WHEN overall_risk_level = 'high' THEN 1 ELSE 0 END) as high_risk_count,
        SUM(CASE WHEN overall_risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk_count,
        SUM(CASE WHEN overall_risk_level = 'low' THEN 1 ELSE 0 END) as low_risk_count,
        AVG(churn_risk_30d) as avg_churn_risk_30d,
        SUM(CASE WHEN overall_risk_level IN ('high', 'medium') THEN annual_contract_value ELSE 0 END) as total_at_risk_acv
       FROM retention_scores 
       WHERE userid = $1`,
      [userid]
    );

    return {
      total_accounts_scored: result?.total_accounts_scored || 0,
      high_risk_count: result?.high_risk_count || 0,
      medium_risk_count: result?.medium_risk_count || 0,
      low_risk_count: result?.low_risk_count || 0,
      avg_churn_risk_30d: parseFloat(result?.avg_churn_risk_30d || "0"),
      total_at_risk_acv: parseFloat(result?.total_at_risk_acv || "0"),
    };
  } catch (error) {
    console.error("[RetentionScoreRepository] Error fetching summary:", error);
    return {
      total_accounts_scored: 0,
      high_risk_count: 0,
      medium_risk_count: 0,
      low_risk_count: 0,
      avg_churn_risk_30d: 0,
      total_at_risk_acv: 0,
    };
  }
}
