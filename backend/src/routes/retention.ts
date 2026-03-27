import express, { Request, Response } from "express";
import { requireAuth } from "./auth";

export const retentionRouter = express.Router();

// Middleware to verify authentication
retentionRouter.use(requireAuth);

const DEMO_MODE = String(process.env.RETENTION_DEMO_MODE ?? "false").toLowerCase() === "true";
const FALLBACK_ON_AGENT_ERROR = String(
  process.env.RETENTION_FALLBACK_ON_ERROR ?? "true"
).toLowerCase() === "true";

let fallbackLogShown = false;

function logRetentionError(context: string, error: unknown) {
  if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
    if (!fallbackLogShown) {
      fallbackLogShown = true;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Retention] ${context}; using fallback responses (${message})`);
    }
    return;
  }
  console.error(`[Retention] ${context}:`, error);
}

function getTenantId(req: Request): string {
  return (req as any).user?.userid ?? "demo_tenant";
}

function getAccountIdParam(req: Request): string {
  const raw = req.params.accountId;
  return Array.isArray(raw) ? raw[0] : raw;
}

function getMockSummary() {
  return {
    total_accounts_at_risk: 12,
    critical_risk_count: 2,
    high_risk_count: 5,
    medium_risk_count: 5,
    interventions_last_30_days: 8,
    avg_churn_risk_score: 0.52,
    top_risk_factors: [
      "Declining usage trends",
      "No adoption of new features",
      "Support ticket volume increase",
    ],
    intervention_success_rate: 0.71,
    dashboard_updated_at: new Date().toISOString(),
  };
}

function getMockAtRiskAccounts() {
  return {
    at_risk_accounts: [
      {
        account_id: "acc_001",
        account_name: "TechCorp Industries",
        churn_risk_score: 0.82,
        risk_level: "critical",
        key_risk_factors: [
          "No logins in 60 days",
          "Contract expiration in 45 days",
          "High support ticket volume",
        ],
        days_until_renewal: 45,
        recommended_action: "Schedule executive business review immediately",
      },
      {
        account_id: "acc_002",
        account_name: "Global Enterprises Inc",
        churn_risk_score: 0.71,
        risk_level: "high",
        key_risk_factors: ["Declining usage", "No feature adoption"],
        days_until_renewal: 90,
        recommended_action: "Offer targeted training and feature enablement",
      },
    ],
    total_count: 2,
    retrieved_at: new Date().toISOString(),
  };
}

function getMockScore(accountId: string) {
  return {
    account_id: accountId,
    churn_risk_score: 0.74,
    risk_level: "high",
    key_risk_factors: [
      "Low active user adoption",
      "Declining product usage",
      "Renewal in next 90 days",
    ],
    recommendations: [
      "Schedule executive check-in this week",
      "Launch feature enablement session",
      "Proactively resolve open support issues",
    ],
    calculated_at: new Date().toISOString(),
  };
}

function getMockStrategies(accountId: string) {
  return {
    account_id: accountId,
    strategies: [
      {
        strategy_id: `${accountId}-strat-1`,
        strategy_name: "Executive Business Review",
        description: "Run a focused leadership review to realign value and timeline.",
        target_outcome: "Improve stakeholder confidence and reduce churn risk.",
        success_probability: 0.78,
        estimated_impact: "Medium-to-high retention impact",
        timeline: "2 weeks",
        suggested_actions: [
          { action: "Schedule executive call", timeline: "48 hours" },
          { action: "Prepare ROI summary", timeline: "3 days" },
        ],
        rationale: "High-risk profile with renewal pressure benefits from top-down alignment.",
        prerequisites: ["Decision maker identified"],
      },
      {
        strategy_id: `${accountId}-strat-2`,
        strategy_name: "Feature Enablement Sprint",
        description: "Target underused features with guided enablement.",
        target_outcome: "Increase adoption and stickiness.",
        success_probability: 0.66,
        estimated_impact: "Usage lift within 30 days",
        timeline: "3 weeks",
        suggested_actions: [
          { action: "Identify top 3 missing capabilities", timeline: "2 days" },
          { action: "Run 2 enablement sessions", timeline: "1 week" },
        ],
        rationale: "Low adoption is a direct churn indicator.",
        prerequisites: ["Product champion assigned"],
      },
    ],
    generated_at: new Date().toISOString(),
  };
}

function getMockInterventionResult(accountId: string, strategy: string, executionType: string) {
  return {
    account_id: accountId,
    intervention_id: `mock-${accountId}-${Date.now()}`,
    status: "queued",
    strategy_executed: strategy,
    execution_type: executionType,
    details: {
      mode: "fallback",
      note: "Python retention agent unavailable; intervention queued in mock mode.",
    },
    executed_at: new Date().toISOString(),
  };
}

/**
 * GET /api/retention/accounts/:accountId/score
 * Get churn risk score for an account
 */
retentionRouter.get("/accounts/:accountId/score", async (req: Request, res: Response) => {
  try {
    const accountId = getAccountIdParam(req);
    const tenantId = getTenantId(req);

    if (DEMO_MODE) {
      return res.json(getMockScore(accountId));
    }

    // Call Python agent for churn risk scoring
    const scoreResponse = await fetch(`${process.env.AGENT_API || "http://localhost:5000"}/agent/retention/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        tenant_id: tenantId,
      }),
    });

    if (!scoreResponse.ok) {
      if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
        return res.json(getMockScore(accountId));
      }
      return res
        .status(scoreResponse.status)
        .json({ error: "Failed to calculate churn risk" });
    }

    const score = await scoreResponse.json();
    res.json(score);
  } catch (error) {
    logRetentionError("Error getting churn score", error);
    if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
      return res.json(getMockScore(getAccountIdParam(req)));
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/retention/accounts/:accountId/strategies
 * Get personalized retention strategies for an account
 */
retentionRouter.post(
  "/accounts/:accountId/strategies",
  async (req: Request, res: Response) => {
    try {
      const accountId = getAccountIdParam(req);
      const { communicationHistory, recentActivity, engagementMetrics } =
        req.body;
      const tenantId = getTenantId(req);

      if (DEMO_MODE) {
        return res.json(getMockStrategies(accountId));
      }

      // Call Python agent for retention strategy generation
      const strategiesResponse = await fetch(
        `${process.env.AGENT_API || "http://localhost:5000"}/agent/retention/strategies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_id: accountId,
            tenant_id: tenantId,
            communication_history: communicationHistory,
            recent_activity: recentActivity,
            engagement_metrics: engagementMetrics,
          }),
        }
      );

      if (!strategiesResponse.ok) {
        if (FALLBACK_ON_AGENT_ERROR) {
          return res.json(getMockStrategies(accountId));
        }
        return res.status(strategiesResponse.status).json({
          error: "Failed to generate retention strategies",
        });
      }

      const strategies = await strategiesResponse.json();
      res.json(strategies);
    } catch (error) {
      logRetentionError("Error getting retention strategies", error);
      if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
        return res.json(getMockStrategies(getAccountIdParam(req)));
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * POST /api/retention/accounts/:accountId/interventions
 * Trigger an intervention for a high-risk account
 */
retentionRouter.post(
  "/accounts/:accountId/interventions",
  async (req: Request, res: Response) => {
    try {
      const accountId = getAccountIdParam(req);
      const { strategy, executionType } = req.body;
      const tenantId = getTenantId(req);

      if (DEMO_MODE) {
        return res.json(getMockInterventionResult(accountId, strategy, executionType));
      }

      // Call Python agent to execute intervention
      const interventionResponse = await fetch(
        `${process.env.AGENT_API || "http://localhost:5000"}/agent/retention/intervene`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_id: accountId,
            tenant_id: tenantId,
            strategy,
            execution_type: executionType,
          }),
        }
      );

      if (!interventionResponse.ok) {
        if (FALLBACK_ON_AGENT_ERROR) {
          return res.json(getMockInterventionResult(accountId, strategy, executionType));
        }
        return res.status(interventionResponse.status).json({
          error: "Failed to execute intervention",
        });
      }

      const result = await interventionResponse.json();
      res.json(result);
    } catch (error) {
      logRetentionError("Error executing intervention", error);
      if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
        return res.json(
          getMockInterventionResult(
            getAccountIdParam(req),
            req.body?.strategy ?? "Unknown Strategy",
            req.body?.executionType ?? "email"
          )
        );
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /api/retention/dashboard/summary
 * Get retention dashboard summary for all accounts
 */
retentionRouter.get("/dashboard/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { timeRange = "30d" } = req.query;

    if (DEMO_MODE) {
      return res.json(getMockSummary());
    }

    // Call Python agent for dashboard summary
    const summaryResponse = await fetch(
      `${process.env.AGENT_API || "http://localhost:5000"}/agent/retention/dashboard-summary`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          time_range: timeRange,
        }),
      }
    );

    if (!summaryResponse.ok) {
      if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
        return res.json(getMockSummary());
      }
      return res
        .status(summaryResponse.status)
        .json({ error: "Failed to fetch dashboard summary" });
    }

    const summary = await summaryResponse.json();
    res.json(summary);
  } catch (error) {
    logRetentionError("Error getting dashboard summary", error);
    if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
      return res.json(getMockSummary());
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/retention/at-risk-accounts
 * Get list of accounts at risk of churn
 */
retentionRouter.get("/at-risk-accounts", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { threshold = 0.6, limit = 20 } = req.query;

    if (DEMO_MODE) {
      return res.json(getMockAtRiskAccounts());
    }

    // Call Python agent to get at-risk accounts
    const accountsResponse = await fetch(
      `${process.env.AGENT_API || "http://localhost:5000"}/agent/retention/at-risk-accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          risk_threshold: parseFloat(threshold as string),
          limit: parseInt(limit as string),
        }),
      }
    );

    if (!accountsResponse.ok) {
      if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
        return res.json(getMockAtRiskAccounts());
      }
      return res.status(accountsResponse.status).json({
        error: "Failed to fetch at-risk accounts",
      });
    }

    const accounts = await accountsResponse.json();
    res.json(accounts);
  } catch (error) {
    logRetentionError("Error getting at-risk accounts", error);
    if (DEMO_MODE || FALLBACK_ON_AGENT_ERROR) {
      return res.json(getMockAtRiskAccounts());
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
