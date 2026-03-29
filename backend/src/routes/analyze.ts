import axios from "axios";
import mergeClient from "../crm/mergeClient";
import type { Request, Response } from "express";
import { Router } from "express";
import { CrmManager } from "../crm/CrmManager";
import { MergeProvider } from "../crm/providers/MergeProvider";
import type { Deal } from "../contracts/deal";
import { getAccountToken } from "../store/accountTokens";
import { requireAuth } from "./auth";

export const analyzeRouter = Router();

type MergeListResponse<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

type CrmRecord = {
  id: string;
  name: string;
  amount: number | null;
  stage: string | null;
  email: string | null;
  phone: string | null;
  owner: string | null;
  last_activity: string | null;
};

type UnifiedDashboardData = {
  deals: Deal[];
  opportunities: CrmRecord[];
  contacts: CrmRecord[];
  companies: CrmRecord[];
  engagements: CrmRecord[];
  warnings: string[];
};

type RiskLevel = "high" | "medium" | "low";

type DealRisk = {
  deal_id: string;
  deal_name: string;
  amount: number | null;
  stage: string | null;
  last_activity: string | null;
  risk_level: RiskLevel;
  signals: string[];
};

type PipelineAnalysisReport = {
  summary: {
    total_deals: number;
    high_risk_count: number;
  };
  high_risk_deals: DealRisk[];
  all_deals: DealRisk[];
};

type MergeOpportunity = Record<string, unknown>;
type MergeEngagement = Record<string, unknown>;

function extractUpstreamError(responseData: unknown): string {
  if (typeof responseData === "string") {
    return responseData.trim();
  }

  if (responseData && typeof responseData === "object") {
    const data = responseData as {
      error?: unknown;
      detail?: unknown;
      message?: unknown;
      non_field_errors?: unknown;
    };

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail.trim();
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (Array.isArray(data.non_field_errors)) {
      const merged = data.non_field_errors
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join("; ");
      if (merged) {
        return merged;
      }
    }
  }

  return "";
}

function buildCrmManager() {
  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) throw new Error("MERGE_API_KEY not set");

  return new CrmManager({
    merge: new MergeProvider({ apiKey: mergeApiKey }),
  });
}

function buildUnifiedSummary(data: UnifiedDashboardData) {
  const { deals, opportunities, contacts, companies, engagements } = data;
  const totalAmount = deals.reduce((acc, deal) => acc + (deal.amount ?? 0), 0);
  const staleDeals = deals.filter((deal) => {
    if (!deal.last_activity) return true;
    const lastActivity = new Date(deal.last_activity).getTime();
    if (Number.isNaN(lastActivity)) return true;
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return lastActivity < fourteenDaysAgo;
  }).length;

  return {
    total_deals: deals.length,
    total_opportunities: opportunities.length,
    total_contacts: contacts.length,
    total_companies: companies.length,
    total_engagements: engagements.length,
    total_amount: totalAmount,
    stale_deals: staleDeals,
  };
}

function parseLastActivity(lastActivity: string | null): Date | null {
  if (!lastActivity) {
    return null;
  }
  const parsed = new Date(lastActivity);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function analyzeDealsLocally(deals: Deal[]): PipelineAnalysisReport {
  const now = Date.now();

  const allDeals: DealRisk[] = deals.map((deal) => {
    const signals: string[] = [];
    const lastDt = parseLastActivity(deal.last_activity);

    if (!lastDt) {
      signals.push("No recorded last activity");
    } else {
      const days = Math.floor((now - lastDt.getTime()) / (24 * 60 * 60 * 1000));
      if (days >= 21) {
        signals.push(`No activity for ${days} days`);
      } else if (days >= 14) {
        signals.push(`Low activity: last touched ${days} days ago`);
      }
    }

    const stage = (deal.stage ?? "").toLowerCase();
    if (["proposal", "negotiation", "contract", "legal"].includes(stage)) {
      const staleLateStage = !lastDt || now - lastDt.getTime() >= 14 * 24 * 60 * 60 * 1000;
      if (staleLateStage) {
        signals.push("Late-stage deal with low activity");
      }
    }

    if (deal.amount !== null && deal.amount <= 0) {
      signals.push("Non-positive amount");
    }

    let riskLevel: RiskLevel = "low";
    if (
      signals.some((s) => s.startsWith("No activity for")) ||
      signals.includes("Late-stage deal with low activity")
    ) {
      riskLevel = "high";
    } else if (signals.length > 0) {
      riskLevel = "medium";
    }

    return {
      deal_id: deal.id,
      deal_name: deal.name,
      amount: deal.amount,
      stage: deal.stage,
      last_activity: deal.last_activity,
      risk_level: riskLevel,
      signals,
    };
  });

  const highRiskDeals = allDeals.filter((deal) => deal.risk_level === "high");

  return {
    summary: {
      total_deals: deals.length,
      high_risk_count: highRiskDeals.length,
    },
    high_risk_deals: highRiskDeals,
    all_deals: allDeals,
  };
}

async function fetchDealsForUser(
  endUserOriginId: string,
  externalAccountId?: string
): Promise<Deal[]> {
  const accountToken = await getAccountToken(endUserOriginId, externalAccountId);
  if (!accountToken) {
    throw Object.assign(
      new Error(
        "No account_token stored for this end_user_origin_id. Connect CRM via Merge Link first."
      ),
      { status: 400 }
    );
  }

  const providerName = process.env.CRM_PROVIDER ?? "merge";
  const crm = buildCrmManager().getProvider(providerName);
  return crm.listDeals({ accountToken });
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

async function fetchMergeCollection<T extends Record<string, unknown>>(
  params: {
    accountToken: string;
    endpoints: string[];
    mapRecord: (raw: T) => CrmRecord;
    entityName: string;
  }
): Promise<{ items: CrmRecord[]; warning?: string }> {
  const headers = {
    Authorization: `Bearer ${process.env.MERGE_API_KEY}`,
    "X-Account-Token": params.accountToken,
  };

  let lastNotFound = false;
  for (const endpoint of params.endpoints) {
    try {
      const res = await mergeClient.get<MergeListResponse<T>>(endpoint, { headers });
      const items = (res.data.results ?? []).map((raw) => params.mapRecord(raw));
      return { items };
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        lastNotFound = true;
        continue;
      }

      const msg = extractUpstreamError(err?.response?.data) || err?.message || "Unknown error";
      return {
        items: [],
        warning: `${params.entityName}: ${msg}`,
      };
    }
  }

  return {
    items: [],
    warning: lastNotFound ? `${params.entityName}: endpoint not available` : undefined,
  };
}

async function fetchUnifiedDashboardData(
  endUserOriginId: string,
  externalAccountId?: string
): Promise<UnifiedDashboardData> {
  const accountToken = await getAccountToken(endUserOriginId, externalAccountId);
  if (!accountToken) {
    throw Object.assign(
      new Error(
        "No account_token stored for this end_user_origin_id. Connect CRM via Merge Link first."
      ),
      { status: 400 }
    );
  }

  const deals = await fetchDealsForUser(endUserOriginId, externalAccountId);

  const [opportunitiesRes, contactsRes, companiesRes, engagementsRes] = await Promise.all([
    fetchMergeCollection({
      accountToken,
      endpoints: [
        "https://api.merge.dev/api/crm/v1/opportunities",
        "https://api.merge.dev/api/crm/v1/deals",
      ],
      entityName: "opportunities",
      mapRecord: (raw) => ({
        id: String(raw.id ?? ""),
        name: normalizeText(raw.name) ?? normalizeText(raw.title) ?? "Unnamed Opportunity",
        amount: normalizeNumber(raw.amount),
        stage: normalizeText(raw.stage),
        email: null,
        phone: null,
        owner: normalizeText(raw.owner) ?? normalizeText(raw.owner_name),
        last_activity:
          normalizeText(raw.last_activity_at) ?? normalizeText(raw.modified_at) ?? null,
      }),
    }),
    fetchMergeCollection({
      accountToken,
      endpoints: ["https://api.merge.dev/api/crm/v1/contacts"],
      entityName: "contacts",
      mapRecord: (raw) => ({
        id: String(raw.id ?? ""),
        name: (() => {
          const fullName = [normalizeText(raw.first_name), normalizeText(raw.last_name)]
            .filter(Boolean)
            .join(" ");
          return normalizeText(raw.name) ?? (fullName || "Unnamed Contact");
        })(),
        amount: null,
        stage: null,
        email: normalizeText(raw.email_address) ?? normalizeText(raw.email),
        phone: normalizeText(raw.phone_number) ?? normalizeText(raw.mobile_phone_number),
        owner: normalizeText(raw.owner) ?? normalizeText(raw.owner_name),
        last_activity:
          normalizeText(raw.last_activity_at) ?? normalizeText(raw.modified_at) ?? null,
      }),
    }),
    fetchMergeCollection({
      accountToken,
      endpoints: [
        "https://api.merge.dev/api/crm/v1/accounts",
        "https://api.merge.dev/api/crm/v1/companies",
      ],
      entityName: "companies",
      mapRecord: (raw) => ({
        id: String(raw.id ?? ""),
        name:
          normalizeText(raw.name) ?? normalizeText(raw.company_name) ?? "Unnamed Company",
        amount: null,
        stage: normalizeText(raw.stage),
        email: normalizeText(raw.email_address) ?? normalizeText(raw.email),
        phone: normalizeText(raw.phone_number),
        owner: normalizeText(raw.owner) ?? normalizeText(raw.owner_name),
        last_activity:
          normalizeText(raw.last_activity_at) ?? normalizeText(raw.modified_at) ?? null,
      }),
    }),
    fetchMergeCollection({
      accountToken,
      endpoints: [
        "https://api.merge.dev/api/crm/v1/engagements",
        "https://api.merge.dev/api/crm/v1/activities",
        "https://api.merge.dev/api/crm/v1/tasks",
      ],
      entityName: "engagements",
      mapRecord: (raw) => ({
        id: String(raw.id ?? ""),
        name: normalizeText(raw.subject) ?? normalizeText(raw.title) ?? "Engagement",
        amount: null,
        stage: normalizeText(raw.status) ?? normalizeText(raw.stage),
        email: null,
        phone: null,
        owner: normalizeText(raw.owner) ?? normalizeText(raw.owner_name),
        last_activity:
          normalizeText(raw.occurred_at) ??
          normalizeText(raw.created_at) ??
          normalizeText(raw.modified_at) ??
          null,
      }),
    }),
  ]);

  const warnings = [
    opportunitiesRes.warning,
    contactsRes.warning,
    companiesRes.warning,
    engagementsRes.warning,
  ].filter((item): item is string => Boolean(item));

  return {
    deals,
    opportunities: opportunitiesRes.items,
    contacts: contactsRes.items,
    companies: companiesRes.items,
    engagements: engagementsRes.items,
    warnings,
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  return normalized ?? undefined;
}

function coerceEngagementType(value: unknown): "NOTE" | "EMAIL" | "CALL" | "TASK" | "MEETING" | "OTHER" {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "NOTE") return "NOTE";
  if (raw === "EMAIL") return "EMAIL";
  if (raw === "CALL") return "CALL";
  if (raw === "TASK") return "TASK";
  if (raw === "MEETING") return "MEETING";
  return "OTHER";
}

function pickTextField(raw: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeText(raw[key]);
    if (value) return value;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = normalizeText(value);
  return single ? [single] : [];
}

function engagementMentionsOpportunity(
  raw: Record<string, unknown>,
  opportunityId: string,
  opportunityName: string
): boolean {
  const id = opportunityId.trim();
  const name = opportunityName.trim().toLowerCase();

  const directIdFields = [
    raw["opportunity"],
    raw["opportunity_id"],
    raw["deal"],
    raw["deal_id"],
    raw["related_object_id"],
  ];

  if (id) {
    for (const value of directIdFields) {
      if (normalizeText(value) === id) {
        return true;
      }
    }

    const idCollections = [
      raw["opportunity_ids"],
      raw["deal_ids"],
      raw["related_object_ids"],
      raw["opportunities"],
      raw["deals"],
    ];

    for (const collection of idCollections) {
      if (asStringArray(collection).includes(id)) {
        return true;
      }
    }
  }

  if (name) {
    const textBlob = [
      normalizeText(raw["subject"]),
      normalizeText(raw["title"]),
      normalizeText(raw["name"]),
      normalizeText(raw["content"]),
      normalizeText(raw["body"]),
      normalizeText(raw["description"]),
      normalizeText(raw["text"]),
      normalizeText(raw["note"]),
    ]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .toLowerCase();

    if (textBlob.includes(name)) {
      return true;
    }
  }

  return false;
}

async function fetchMergeOpportunityDetail(params: {
  accountToken: string;
  opportunityId: string;
}): Promise<MergeOpportunity | null> {
  const headers = {
    Authorization: `Bearer ${process.env.MERGE_API_KEY}`,
    "X-Account-Token": params.accountToken,
  };

  const endpoints = [
    `https://api.merge.dev/api/crm/v1/opportunities/${encodeURIComponent(params.opportunityId)}`,
    `https://api.merge.dev/api/crm/v1/deals/${encodeURIComponent(params.opportunityId)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await mergeClient.get<MergeOpportunity>(endpoint, { headers, timeout: 15000 });
      if (res.data && typeof res.data === "object") {
        return res.data;
      }
      return null;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        continue;
      }
      throw err;
    }
  }

  return null;
}

async function fetchMergeEngagements(params: {
  accountToken: string;
  limit: number;
}): Promise<MergeEngagement[]> {
  const headers = {
    Authorization: `Bearer ${process.env.MERGE_API_KEY}`,
    "X-Account-Token": params.accountToken,
  };

  const endpoints = [
    "https://api.merge.dev/api/crm/v1/engagements",
    "https://api.merge.dev/api/crm/v1/activities",
    "https://api.merge.dev/api/crm/v1/tasks",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await mergeClient.get<MergeListResponse<MergeEngagement>>(endpoint, {
        headers,
        timeout: 20000,
      });
      const results = Array.isArray(res.data?.results) ? res.data.results : [];
      return results.slice(0, Math.max(0, params.limit));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        continue;
      }
      throw err;
    }
  }

  return [];
}

analyzeRouter.post("/hubspot/unified-dashboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { end_user_origin_id, external_account_id } = req.body ?? {};
    const resolvedOriginId = authUser?.userid ?? end_user_origin_id;

    if (!resolvedOriginId) {
      return res
        .status(400)
        .json({ error: "end_user_origin_id is required" });
    }

    const unified = await fetchUnifiedDashboardData(
      resolvedOriginId,
      typeof external_account_id === "string" && external_account_id.trim()
        ? external_account_id.trim()
        : undefined
    );
    return res.json({
      source: "hubspot",
      fetched_at: new Date().toISOString(),
      summary: buildUnifiedSummary(unified),
      deals: unified.deals,
      opportunities: unified.opportunities,
      contacts: unified.contacts,
      companies: unified.companies,
      engagements: unified.engagements,
      warnings: unified.warnings,
    });
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const responseData = err?.response?.data;
    const responseText = extractUpstreamError(responseData);
    const message =
      responseText ||
      err?.message ||
      err?.response?.statusText ||
      `Upstream request failed (${status})`;
    return res.status(status).json({ error: message });
  }
});

analyzeRouter.post("/analyze-pipeline", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { end_user_origin_id, external_account_id } = req.body ?? {};
    const resolvedOriginId = authUser?.userid ?? end_user_origin_id;
    if (!resolvedOriginId) {
      return res.status(400).json({ error: "end_user_origin_id is required" });
    }

    const deals = await fetchDealsForUser(
      resolvedOriginId,
      typeof external_account_id === "string" && external_account_id.trim()
        ? external_account_id.trim()
        : undefined
    );
    const agentBaseUrl = process.env.AGENT_BASE_URL ?? "http://localhost:8000";

    try {
      const agentRes = await axios.post(`${agentBaseUrl}/agent/analyze`, deals, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
      return res.json(agentRes.data);
    } catch (agentErr: any) {
      const fallbackEnabled = process.env.ENABLE_LOCAL_ANALYSIS_FALLBACK !== "false";
      if (fallbackEnabled) {
        const report = analyzeDealsLocally(deals);
        return res.json(report);
      }
      throw agentErr;
    }
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const responseData = err?.response?.data;
    const responseText = extractUpstreamError(responseData);
    const message =
      responseText ||
      err?.message ||
      err?.response?.statusText ||
      `Upstream request failed (${status})`;
    return res.status(status).json({ error: message });
  }
});

// Real-time Deal Strategist (Competitive Intelligence) — fetch CRM context via Merge then call Python agent.
analyzeRouter.post("/ci/deal-strategy", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!process.env.MERGE_API_KEY) {
      return res.status(500).json({ error: "MERGE_API_KEY not set" });
    }

    const authUser = (req as any).user;
    const {
      end_user_origin_id,
      external_account_id,
      opportunity_id,
      engagement_limit,
    } = req.body ?? {};
        const resolvedEngagementLimit =
          typeof engagement_limit === "number" && Number.isFinite(engagement_limit)
            ? Math.min(Math.max(10, Math.floor(engagement_limit)), 200)
            : 80;

    const resolvedOriginId = authUser?.userid ?? end_user_origin_id;

    if (!resolvedOriginId) {
      return res.status(400).json({ error: "end_user_origin_id is required" });
    }

    const externalAccountId =
      typeof external_account_id === "string" && external_account_id.trim()
        ? external_account_id.trim()
        : undefined;

    const accountToken = await getAccountToken(resolvedOriginId, externalAccountId);
    if (!accountToken) {
      return res.status(400).json({
        error: "No account_token stored for this end_user_origin_id. Connect CRM via Merge Link first.",
      });
    }

    // Choose a target opportunity.
    let targetOpportunityId = typeof opportunity_id === "string" ? opportunity_id.trim() : "";
    let fallbackDeal: Deal | undefined;

    if (!targetOpportunityId) {
      const deals = await fetchDealsForUser(resolvedOriginId, externalAccountId);
      // Prefer the largest deal amount as a default.
      fallbackDeal = [...deals].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];
      targetOpportunityId = fallbackDeal?.id ?? "";
    }

    if (!targetOpportunityId) {
      return res.status(404).json({ error: "No deals/opportunities available to analyze" });
    }

    const [oppDetail, engagementsRaw] = await Promise.all([
      fetchMergeOpportunityDetail({ accountToken, opportunityId: targetOpportunityId }).catch(() => null),
      fetchMergeEngagements({ accountToken, limit: resolvedEngagementLimit }).catch(() => []),
    ]);

    const oppObj = (oppDetail ?? {}) as Record<string, unknown>;
    const oppName =
      normalizeText(oppObj["name"]) ??
      normalizeText(oppObj["title"]) ??
      normalizeText(oppObj["deal_name"]) ??
      fallbackDeal?.name ??
      targetOpportunityId;
    const oppDesc =
      pickTextField(oppObj, ["description", "body", "content", "text", "notes"]) ??
      fallbackDeal?.description ??
      null;

    const opportunityPayload = {
      id: targetOpportunityId,
      name: oppName,
      description: oppDesc,
      amount: normalizeNumber(oppObj["amount"]) ?? fallbackDeal?.amount ?? null,
      stage: normalizeText(oppObj["stage"]) ?? fallbackDeal?.stage ?? null,
      owner:
        normalizeText(oppObj["owner"]) ??
        normalizeText(oppObj["owner_name"]) ??
        fallbackDeal?.owner ??
        null,
      close_date: normalizeText(oppObj["close_date"]) ?? fallbackDeal?.close_date ?? null,
      probability: normalizeNumber(oppObj["probability"]) ?? fallbackDeal?.probability ?? null,
      forecast_category:
        normalizeText(oppObj["forecast_category"]) ??
        normalizeText(oppObj["forecast_category_name"]) ??
        fallbackDeal?.forecast_category ??
        null,
      next_step: normalizeText(oppObj["next_step"]) ?? fallbackDeal?.next_step ?? null,
      pipeline: normalizeText(oppObj["pipeline"]) ?? fallbackDeal?.pipeline ?? null,
      status: normalizeText(oppObj["status"]) ?? fallbackDeal?.status ?? null,
      modified_at:
        normalizeText(oppObj["modified_at"]) ??
        normalizeText(oppObj["last_activity_at"]) ??
        normalizeText(oppObj["created_at"]) ??
        fallbackDeal?.modified_at ??
        fallbackDeal?.last_activity ??
        null,
    };

    const relatedEngagements = engagementsRaw.filter((raw) =>
      engagementMentionsOpportunity(raw, targetOpportunityId, oppName)
    );

    const candidateEngagements = relatedEngagements.length > 0 ? relatedEngagements : engagementsRaw;

    const engagementsPayload = candidateEngagements
      .map((raw) => {
        const subject = pickTextField(raw, ["subject", "title", "name"]) ?? null;
        const content = pickTextField(raw, ["content", "body", "description", "text", "note"]) ?? null;
        const occurredAt =
          normalizeOptionalString(raw["occurred_at"]) ??
          normalizeOptionalString(raw["created_at"]) ??
          normalizeOptionalString(raw["modified_at"]);
        return {
          id: String(raw["id"] ?? ""),
          type: coerceEngagementType(raw["type"] ?? raw["engagement_type"] ?? raw["activity_type"]),
          subject,
          content,
          occurred_at: occurredAt ?? null,
        };
      })
      .filter((e) => Boolean(e.id) || Boolean(e.subject) || Boolean(e.content));

    const agentBaseUrl = process.env.AGENT_BASE_URL ?? "http://localhost:8000";
    const agentRes = await axios.post(
      `${agentBaseUrl.replace(/\/+$/, "")}/agent/ci/deal-strategy`,
      {
        opportunity: opportunityPayload,
        engagements: engagementsPayload,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return res.json(agentRes.data);
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const responseData = err?.response?.data;
    const responseText = extractUpstreamError(responseData);
    const message =
      responseText ||
      err?.message ||
      err?.response?.statusText ||
      `Upstream request failed (${status})`;
    return res.status(status).json({ error: message });
  }
});
