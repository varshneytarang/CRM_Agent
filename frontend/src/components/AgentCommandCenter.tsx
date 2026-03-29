import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Radar,
  Send,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";

type AgentTab = "revenue" | "prospecting" | "retention";

type UnifiedSummary = {
  summary?: {
    total_deals?: number;
    total_opportunities?: number;
    total_contacts?: number;
    total_companies?: number;
    stale_deals?: number;
    total_amount?: number;
  };
  fetched_at?: string;
};

type DealStrategistResult = {
  opportunity_id: string;
  opportunity_name?: string;
  threat_level: "low" | "medium" | "high";
  confidence_score?: number;
  primary_objections?: string[];
  next_actions?: string[];
  deal_tip: string;
  suggested_hubspot_note: string;
  generated_at: string;
  detected?: Array<{
    competitor: string;
    matched_keywords: string[];
    evidence: Array<{
      source: string;
      snippet: string;
      engagement_id?: string | null;
      occurred_at?: string | null;
    }>;
  }>;
  battlecards?: Array<{
    competitor: string;
    strengths: string[];
    weaknesses: string[];
    landmine_questions: string[];
    pricing_objection_handler: string;
  }>;
  llm?: {
    used?: boolean;
    status?: string;
    model?: string | null;
    error?: string | null;
  };
};

type RetentionSummary = {
  critical_risk_count?: number;
  high_risk_count?: number;
  medium_risk_count?: number;
  total_accounts_at_risk?: number;
};

type AtRiskAccount = {
  account_id: string;
  account_name: string;
  churn_risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  key_risk_factors: string[];
};

type RetentionStrategy = {
  strategy_id: string;
  strategy_name: string;
  success_probability?: number;
  description?: string;
};

export default function AgentCommandCenter() {
  const [activeTab, setActiveTab] = useState<AgentTab>("revenue");

  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  const [pipelineSummary, setPipelineSummary] = useState<UnifiedSummary | null>(null);
  const [opportunityId, setOpportunityId] = useState("");
  const [dealResult, setDealResult] = useState<DealStrategistResult | null>(null);

  const [prospectingPrompt, setProspectingPrompt] = useState("");
  const [prospectingReply, setProspectingReply] = useState<string | null>(null);

  const [retentionSummary, setRetentionSummary] = useState<RetentionSummary | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [strategies, setStrategies] = useState<RetentionStrategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");

  const selectedAccount = useMemo(
    () => atRisk.find((account) => account.account_id === selectedAccountId) ?? null,
    [atRisk, selectedAccountId]
  );

  const selectedStrategy = useMemo(
    () => strategies.find((strategy) => strategy.strategy_id === selectedStrategyId) ?? null,
    [strategies, selectedStrategyId]
  );

  function pushEvent(message: string) {
    setEvents((prev) => [message, ...prev].slice(0, 10));
  }

  async function loadRevenueSummary() {
    setBusy(true);
    try {
      const res = await api.post<UnifiedSummary>("/api/hubspot/unified-dashboard", {});
      setPipelineSummary(res.data);
      pushEvent("Revenue agent: pipeline summary refreshed.");
    } catch (err: any) {
      pushEvent(`Revenue agent failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function runDealStrategist() {
    setBusy(true);
    setDealResult(null);
    try {
      const res = await api.post<DealStrategistResult>("/api/ci/deal-strategy", {
        opportunity_id: opportunityId || undefined,
      });
      setDealResult(res.data);
      pushEvent("Revenue agent: deal strategist insight generated.");
    } catch (err: any) {
      pushEvent(`Deal strategist failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function runProspectingFlow() {
    setBusy(true);
    try {
      await api.post("/api/prospecting/run", {
        action: "queue_prospecting_job",
        context: {},
      });
      pushEvent("Prospecting agent: full workflow queued.");
    } catch (err: any) {
      pushEvent(`Prospecting flow failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendProspectingPrompt() {
    if (!prospectingPrompt.trim()) {
      return;
    }
    setBusy(true);
    setProspectingReply(null);
    try {
      const res = await api.post<{ reply: string }>("/api/prospecting/chat", {
        message: prospectingPrompt,
        context: {},
      });
      setProspectingReply(res.data?.reply ?? "No response.");
      pushEvent("Prospecting agent: response generated.");
    } catch (err: any) {
      pushEvent(`Prospecting chat failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadRetentionOverview() {
    setBusy(true);
    try {
      const [summaryRes, accountsRes] = await Promise.all([
        api.get<RetentionSummary>("/api/retention/dashboard/summary?timeRange=30d"),
        api.get<{ at_risk_accounts: AtRiskAccount[] }>("/api/retention/at-risk-accounts?limit=20"),
      ]);

      const accounts = accountsRes.data?.at_risk_accounts ?? [];
      setRetentionSummary(summaryRes.data);
      setAtRisk(accounts);
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].account_id);
      }
      pushEvent("Retention agent: risk overview loaded.");
    } catch (err: any) {
      pushEvent(`Retention overview failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateRetentionStrategies() {
    if (!selectedAccountId) {
      return;
    }

    setBusy(true);
    try {
      const res = await api.post<{ strategies: RetentionStrategy[] }>(
        `/api/retention/accounts/${selectedAccountId}/strategies`,
        {
          communicationHistory: [],
          recentActivity: {},
          engagementMetrics: {},
        }
      );

      const items = res.data?.strategies ?? [];
      setStrategies(items);
      if (items.length > 0) {
        setSelectedStrategyId(items[0].strategy_id);
      }
      pushEvent("Retention agent: strategies generated.");
    } catch (err: any) {
      pushEvent(`Retention strategy generation failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function executeRetentionIntervention() {
    if (!selectedAccountId || !selectedStrategy) {
      return;
    }

    setBusy(true);
    try {
      await api.post(`/api/retention/accounts/${selectedAccountId}/interventions`, {
        strategy: selectedStrategy.strategy_name,
        executionType: "email",
      });
      pushEvent("Retention agent: intervention executed.");
    } catch (err: any) {
      pushEvent(`Retention intervention failed: ${err?.response?.data?.error ?? err?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-cyan-50/40 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                <Sparkles className="h-4 w-4" /> Unified Agent Workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Simple Agent Command Center</h1>
              <p className="mt-1 text-sm text-slate-600">
                One clean interface for Revenue, Prospecting, and Retention workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/retention" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Open Full Retention
              </Link>
              <Link to="/" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back Home
              </Link>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_280px]">
            <aside className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Agents</p>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab("revenue")}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    activeTab === "revenue" ? "bg-sky-100 text-sky-900" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><Target className="h-4 w-4" /> Revenue Agent</span>
                </button>
                <button
                  onClick={() => setActiveTab("prospecting")}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    activeTab === "prospecting" ? "bg-violet-100 text-violet-900" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" /> Prospecting Agent</span>
                </button>
                <button
                  onClick={() => setActiveTab("retention")}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    activeTab === "retention" ? "bg-emerald-100 text-emerald-900" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4" /> Retention Agent</span>
                </button>
              </div>
            </aside>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              {activeTab === "revenue" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Revenue Agent</h2>
                  <p className="text-sm text-slate-600">Monitor pipeline health and run deal strategist guidance.</p>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={loadRevenueSummary} disabled={busy} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-sky-300">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Pipeline Summary"}
                    </button>
                  </div>

                  {pipelineSummary?.summary && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Deals</p><p className="text-xl font-bold">{pipelineSummary.summary.total_deals ?? 0}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Opportunities</p><p className="text-xl font-bold">{pipelineSummary.summary.total_opportunities ?? 0}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Contacts</p><p className="text-xl font-bold">{pipelineSummary.summary.total_contacts ?? 0}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Stale Deals</p><p className="text-xl font-bold">{pipelineSummary.summary.stale_deals ?? 0}</p></div>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">Deal Strategist</p>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row">
                      <input
                        value={opportunityId}
                        onChange={(event) => setOpportunityId(event.target.value)}
                        placeholder="Opportunity ID (optional)"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button onClick={runDealStrategist} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
                        Run Insight
                      </button>
                    </div>
                  </div>

                  {dealResult && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                      <p className="font-semibold">{dealResult.opportunity_name || dealResult.opportunity_id}</p>
                      <p className="mt-1">Threat: {dealResult.threat_level}</p>
                      {typeof dealResult.confidence_score === "number" && (
                        <p className="mt-1">Confidence: {Math.round(dealResult.confidence_score * 100)}%</p>
                      )}
                      {Array.isArray(dealResult.primary_objections) && dealResult.primary_objections.length > 0 && (
                        <p className="mt-1">Objections: {dealResult.primary_objections.join(", ")}</p>
                      )}
                      <p className="mt-1">Tip: {dealResult.deal_tip}</p>
                      {Array.isArray(dealResult.detected) && dealResult.detected.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Competitors</p>
                          <p className="mt-1">{dealResult.detected.map((item) => item.competitor).join(", ")}</p>
                        </div>
                      )}
                      {Array.isArray(dealResult.next_actions) && dealResult.next_actions.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Next Actions</p>
                          <ul className="ml-5 list-disc space-y-1">
                            {dealResult.next_actions.map((action, idx) => (
                              <li key={`${idx}-${action.slice(0, 24)}`}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(dealResult.battlecards) && dealResult.battlecards.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Battlecard Prompt</p>
                          <p className="mt-1">
                            Ask: {dealResult.battlecards[0].landmine_questions?.[0] ?? "Probe implementation complexity and hidden cost drivers."}
                          </p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-sky-800/90">
                        LLM: {dealResult.llm?.status ?? "unknown"}
                        {dealResult.llm?.model ? ` (${dealResult.llm.model})` : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "prospecting" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Prospecting Agent</h2>
                  <p className="text-sm text-slate-600">Run full flow or ask focused prospecting questions.</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={runProspectingFlow} disabled={busy} className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:bg-violet-300">
                      Queue Full Prospecting Flow
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">Agent Chat</p>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row">
                      <input
                        value={prospectingPrompt}
                        onChange={(event) => setProspectingPrompt(event.target.value)}
                        placeholder="Ask for fit scoring, sequence rewrite, or targeting"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button onClick={sendProspectingPrompt} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
                        <span className="inline-flex items-center gap-1"><Send className="h-4 w-4" /> Send</span>
                      </button>
                    </div>
                  </div>

                  {prospectingReply && (
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900 whitespace-pre-wrap">
                      {prospectingReply}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "retention" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Retention Agent</h2>
                  <p className="text-sm text-slate-600">Track at-risk accounts, generate strategies, and execute interventions.</p>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={loadRetentionOverview} disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-emerald-300">
                      Load Retention Overview
                    </button>
                  </div>

                  {retentionSummary && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Critical</p><p className="text-xl font-bold">{retentionSummary.critical_risk_count ?? 0}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">High</p><p className="text-xl font-bold">{retentionSummary.high_risk_count ?? 0}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Medium</p><p className="text-xl font-bold">{retentionSummary.medium_risk_count ?? 0}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Total At Risk</p><p className="text-xl font-bold">{retentionSummary.total_accounts_at_risk ?? 0}</p></div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-800">At-Risk Accounts</p>
                      <div className="mt-2 space-y-2 max-h-56 overflow-auto">
                        {atRisk.length === 0 ? (
                          <p className="text-sm text-slate-500">No accounts loaded yet.</p>
                        ) : (
                          atRisk.map((account) => (
                            <button
                              key={account.account_id}
                              onClick={() => setSelectedAccountId(account.account_id)}
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                                selectedAccountId === account.account_id
                                  ? "border-emerald-400 bg-emerald-50"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <p className="font-medium text-slate-900">{account.account_name}</p>
                              <p className="text-xs text-slate-500">{Math.round(account.churn_risk_score * 100)}% risk</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-800">Action Flow</p>
                      <div className="mt-2 space-y-2">
                        <button
                          onClick={generateRetentionStrategies}
                          disabled={busy || !selectedAccountId}
                          className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-emerald-300"
                        >
                          Generate Strategies
                        </button>
                        <select
                          value={selectedStrategyId}
                          onChange={(event) => setSelectedStrategyId(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">Select strategy</option>
                          {strategies.map((strategy) => (
                            <option key={strategy.strategy_id} value={strategy.strategy_id}>
                              {strategy.strategy_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={executeRetentionIntervention}
                          disabled={busy || !selectedStrategyId}
                          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
                        >
                          Execute Intervention
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedAccount && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <p className="font-semibold">Selected: {selectedAccount.account_name}</p>
                      <p className="mt-1">Top factor: {selectedAccount.key_risk_factors?.[0] ?? "N/A"}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <Radar className="h-4 w-4" /> Activity Feed
              </p>
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {events.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    Actions will appear here.
                  </p>
                ) : (
                  events.map((entry, index) => (
                    <div key={`${entry}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {entry}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
                Tip: keep workflow simple.
                <div className="mt-1">1. Refresh data</div>
                <div>2. Run one focused agent action</div>
                <div>3. Review outcome in this feed</div>
              </div>

              <Link to="/retention" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">
                Advanced Retention View <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
