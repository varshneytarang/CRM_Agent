/**
 * Retention API Routes
 * Core endpoints for retention scoring, signal ingestion, and outcome tracking.
 */

import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import { requireAuth } from "../../routes/auth";
import {
  saveRetentionSignal,
  getAccountSignals,
  getAccountSignalsBySource,
  getAccountsSignalCoverage,
} from "../../db/repositories/retentionSignalRepository";
import {
  saveRetentionScore,
  getLatestRetentionScore,
  getHighRiskAccounts,
  getAccountsByRiskBand,
  getRetentionSummary,
} from "../../db/repositories/retentionScoreRepository";

export const retentionRouter = Router();

type AuthenticatedRequest = Request & {
  user?: {
    userid?: string;
    username?: string;
  };
};

function getAccountId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

function getAgentBaseUrl(): string {
  return process.env.AGENT_BASE_URL ?? "http://localhost:8000";
}

/**
 * POST /api/retention/ingest-signal
 * Ingest a retention signal event (from webhook or batch import).
 */
retentionRouter.post("/ingest-signal", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userid = String(req.user?.userid ?? "");
    const { account_id, source, signal_type, value, reliability_score, freshness_hours, metadata } = req.body;

    if (!account_id || !source || !signal_type || value === undefined) {
      return res.status(400).json({ error: "Missing required fields: account_id, source, signal_type, value" });
    }

    const signal = await saveRetentionSignal({
      userid,
      account_id,
      source,
      signal_type,
      value,
      reliability_score: reliability_score ?? 0.8,
      freshness_hours: freshness_hours ?? 0,
      extracted_metadata: metadata,
    });

    if (!signal) {
      return res.status(500).json({ error: "Failed to save signal" });
    }

    return res.status(201).json({
      status: "received",
      signal_id: signal.id,
      message: "Signal ingested successfully",
    });
  } catch (error: any) {
    console.error("[Retention] Error ingesting signal:", error);
    return res.status(500).json({
      error: "Failed to ingest signal",
      message: error?.message ?? "Unknown error",
    });
  }
});

/**
 * POST /api/retention/score
 * Trigger retention scoring for account(s).
 */
retentionRouter.post("/score", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userid = String(req.user?.userid ?? "");
    const { account_id, account_ids } = req.body ?? {};
    const targetIds = account_ids ?? (account_id ? [account_id] : []);

    if (targetIds.length === 0) {
      return res.status(400).json({ error: "At least one account_id is required" });
    }

    const agentBaseUrl = getAgentBaseUrl();

    try {
      const agentRes = await axios.post(
        `${agentBaseUrl}/agent/retention/score`,
        {
          userid,
          action: "score_accounts",
          account_ids: targetIds,
          context: {},
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      // Save scores returned from agent
      const scores = agentRes.data?.scores ?? [];
      for (const scoreData of scores) {
        await saveRetentionScore(scoreData);
      }

      return res.json({
        status: "success",
        scored_accounts: scores.length,
        scores: scores.slice(0, 10), // Return first 10 for response
        total_available: scores.length,
      });
    } catch (agentErr: any) {
      console.error("[Retention] Agent scoring failed:", agentErr?.message);
      return res.status(502).json({
        error: "Retention scoring agent unavailable",
        message: agentErr?.message ?? "Agent timeout",
      });
    }
  } catch (error: any) {
    console.error("[Retention] Error triggering score:", error);
    return res.status(500).json({
      error: "Failed to trigger scoring",
      message: error?.message ?? "Unknown error",
    });
  }
});

/**
 * GET /api/retention/account/:account_id
 * Get current risk assessment for an account.
 */
retentionRouter.get("/account/:account_id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userid = String(req.user?.userid ?? "");
    const account_id = getAccountId(req.params.account_id);

    if (!account_id) {
      return res.status(400).json({ error: "account_id is required" });
    }

    const score = await getLatestRetentionScore(userid, account_id);
    const signals = await getAccountSignals(userid, account_id, 50, 72);
    const coverage = await getAccountsSignalCoverage(userid, [account_id]);

    if (!score) {
      return res.status(404).json({ error: "No retention score found for this account. Run scoring first." });
    }

    return res.json({
      account_id,
      score,
      signals: signals.slice(0, 20),
      signal_coverage: coverage[account_id] ?? { total_signals: 0, sources: [] },
    });
  } catch (error: any) {
    console.error("[Retention] Error fetching account:", error);
    return res.status(500).json({
      error: "Failed to fetch account",
      message: error?.message ?? "Unknown error",
    });
  }
});

/**
 * GET /api/retention/summary
 * Get retention dashboard summary.
 */
retentionRouter.get("/summary", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userid = String(req.user?.userid ?? "");

    const summary = await getRetentionSummary(userid);
    const highRisk = await getHighRiskAccounts(userid, "high", 10);
    const mediumRisk = await getHighRiskAccounts(userid, "medium", 10);

    return res.json({
      summary,
      sample_high_risk: highRisk,
      sample_medium_risk: mediumRisk,
    });
  } catch (error: any) {
    console.error("[Retention] Error fetching summary:", error);
    return res.status(500).json({
      error: "Failed to fetch summary",
      message: error?.message ?? "Unknown error",
    });
  }
});

/**
 * GET /api/retention/risk-band
 * Get paginated accounts by risk level.
 */
retentionRouter.get("/risk-band", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userid = String(req.user?.userid ?? "");
    const riskLevel = String(req.query.level ?? "high").toLowerCase() as "high" | "medium" | "low";
    const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);

    const result = await getAccountsByRiskBand(userid, riskLevel, offset, limit);

    return res.json({
      risk_level: riskLevel,
      offset,
      limit,
      total: result.total,
      accounts: result.accounts,
    });
  } catch (error: any) {
    console.error("[Retention] Error fetching risk band:", error);
    return res.status(500).json({
      error: "Failed to fetch risk band",
      message: error?.message ?? "Unknown error",
    });
  }
});

/**
 * GET /api/retention/signals
 * Get signals for account with filters.
 */
retentionRouter.get("/signals", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userid = String(req.user?.userid ?? "");
    const { account_id, source } = req.query;

    if (!account_id || typeof account_id !== "string") {
      return res.status(400).json({ error: "account_id query parameter is required" });
    }

    let signals;
    if (source && typeof source === "string") {
      signals = await getAccountSignalsBySource(userid, account_id, source, 100);
    } else {
      signals = await getAccountSignals(userid, account_id, 100, 72);
    }

    return res.json({
      account_id,
      signal_count: signals.length,
      signals: signals,
    });
  } catch (error: any) {
    console.error("[Retention] Error fetching signals:", error);
    return res.status(500).json({
      error: "Failed to fetch signals",
      message: error?.message ?? "Unknown error",
    });
  }
});

/**
 * POST /api/retention/health
 * Check retention agent health.
 */
retentionRouter.get("/health", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const baseUrl = getAgentBaseUrl();
    const health = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
    return res.json({ ok: true, agent: health.data });
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err?.message ?? "Retention agent unavailable",
    });
  }
});

export default retentionRouter;
