import React, { useState, useEffect } from "react";
import { api } from "../api";
import {
  AlertCircle,
  TrendingDown,
  Target,
  Clock,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Wand2,
  ShieldCheck,
  Send,
  Layers,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface ChurnScore {
  account_id: string;
  churn_risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  key_risk_factors: string[];
  recommendations: string[];
  calculated_at: string;
}

interface StrategyAction {
  action: string;
  timeline?: string;
}

interface RetentionStrategy {
  strategy_id: string;
  strategy_name: string;
  description: string;
  target_outcome: string;
  success_probability: number;
  estimated_impact: string;
  timeline: string;
  suggested_actions: StrategyAction[];
  rationale: string;
  prerequisites: string[];
}

interface AtRiskAccount {
  account_id: string;
  account_name: string;
  churn_risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  key_risk_factors: string[];
  days_until_renewal: number | null;
  recommended_action: string;
}

interface DashboardSummary {
  total_accounts_at_risk: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  interventions_last_30_days: number;
  avg_churn_risk_score: number;
  top_risk_factors: string[];
  intervention_success_rate: number;
  dashboard_updated_at: string;
}

type ExecutionType = "email" | "call" | "meeting" | "discount_offer";

const RetentionDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [atRiskAccounts, setAtRiskAccounts] = useState<AtRiskAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AtRiskAccount | null>(
    null
  );
  const [selectedChurnScore, setSelectedChurnScore] = useState<ChurnScore | null>(
    null
  );
  const [strategies, setStrategies] = useState<RetentionStrategy[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [executionType, setExecutionType] = useState<ExecutionType>("email");
  const [executing, setExecuting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, accountsRes] = await Promise.all([
        api.get("/api/retention/dashboard/summary?timeRange=30d"),
        api.get("/api/retention/at-risk-accounts?limit=20"),
      ]);

      setSummary(summaryRes.data);
      setAtRiskAccounts(accountsRes.data.at_risk_accounts);

      if (!selectedAccount && accountsRes.data.at_risk_accounts?.length > 0) {
        await handleAccountSelect(accountsRes.data.at_risk_accounts[0]);
      }
    } catch (err) {
      setError("Failed to load retention dashboard data");
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleAccountSelect = async (account: AtRiskAccount) => {
    setSelectedAccount(account);
    setFeedbackMessage(null);
    setSelectedStrategyId(null);
    setStrategies([]);
    try {
      const scoreRes = await api.get(
        `/api/retention/accounts/${account.account_id}/score`
      );
      setSelectedChurnScore(scoreRes.data);
    } catch (err) {
      console.error("Error fetching churn score:", err);
    }
  };

  const generateStrategies = async () => {
    if (!selectedAccount || !selectedChurnScore) {
      return;
    }

    setStrategiesLoading(true);
    setFeedbackMessage(null);
    try {
      const response = await api.post(
        `/api/retention/accounts/${selectedAccount.account_id}/strategies`,
        {
          communicationHistory: [],
          recentActivity: {},
          engagementMetrics: {
            riskLevel: selectedAccount.risk_level,
            churnRiskScore: selectedChurnScore.churn_risk_score,
            keyRiskFactors: selectedChurnScore.key_risk_factors,
          },
        }
      );

      const fetchedStrategies = response.data?.strategies ?? [];
      setStrategies(fetchedStrategies);
      if (fetchedStrategies.length > 0) {
        setSelectedStrategyId(fetchedStrategies[0].strategy_id);
      }

      setFeedbackMessage(
        fetchedStrategies.length > 0
          ? "Strategies generated. Pick one and execute the intervention."
          : "No strategies returned."
      );
    } catch (err) {
      console.error("Error generating strategies:", err);
      setFeedbackMessage("Could not generate strategies right now. Try again.");
    } finally {
      setStrategiesLoading(false);
    }
  };

  const executeIntervention = async () => {
    if (!selectedAccount || !selectedStrategyId) {
      return;
    }

    const selectedStrategy = strategies.find(
      (strategy) => strategy.strategy_id === selectedStrategyId
    );

    if (!selectedStrategy) {
      return;
    }

    setExecuting(true);
    setFeedbackMessage(null);
    try {
      await api.post(
        `/api/retention/accounts/${selectedAccount.account_id}/interventions`,
        {
          strategy: selectedStrategy.strategy_name,
          executionType,
        }
      );

      setFeedbackMessage(
        `Intervention started via ${executionType}. Keep monitoring engagement signals.`
      );
    } catch (err) {
      console.error("Error executing intervention:", err);
      setFeedbackMessage("Intervention failed to start. Please retry.");
    } finally {
      setExecuting(false);
    }
  };

  const filteredAccounts = atRiskAccounts.filter((account) => {
    const matchesRisk = riskFilter === "all" || account.risk_level === riskFilter;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      account.account_name.toLowerCase().includes(normalizedSearch) ||
      account.account_id.toLowerCase().includes(normalizedSearch);
    return matchesRisk && matchesSearch;
  });

  const getRiskColor = (
    riskLevel: "low" | "medium" | "high" | "critical"
  ) => {
    switch (riskLevel) {
      case "critical":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "medium":
        return "text-yellow-600";
      default:
        return "text-green-600";
    }
  };

  const getRiskBgColor = (
    riskLevel: "low" | "medium" | "high" | "critical"
  ) => {
    switch (riskLevel) {
      case "critical":
        return "bg-red-50";
      case "high":
        return "bg-orange-50";
      case "medium":
        return "bg-yellow-50";
      default:
        return "bg-green-50";
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.7) return "bg-red-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading retention dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-sky-50/40 p-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            <Sparkles className="w-3.5 h-3.5" />
            Retention Command Center
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Churn Defense Workflow
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Diagnose risk, generate plays, and launch interventions from one unified screen.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Workflow rail */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-sky-200 bg-white/80 p-4 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
            <Activity className="w-4 h-4" />
            Step 1: Diagnose
          </p>
          <p className="mt-2 text-sm text-slate-700">Select an at-risk account and inspect score + factors.</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-white/80 p-4 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
            <Wand2 className="w-4 h-4" />
            Step 2: Strategize
          </p>
          <p className="mt-2 text-sm text-slate-700">Generate personalized retention strategies for selected risk context.</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white/80 p-4 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            <Send className="w-4 h-4" />
            Step 3: Intervene
          </p>
          <p className="mt-2 text-sm text-slate-700">Execute via channel and monitor customer response momentum.</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Critical Risk */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-900">Critical Risk</p>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {summary.critical_risk_count}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Immediate intervention needed
            </p>
          </div>

          {/* High Risk */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-orange-900">High Risk</p>
              <TrendingDown className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {summary.high_risk_count}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Close monitoring recommended
            </p>
          </div>

          {/* Avg Risk Score */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Avg Risk Score</p>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {(summary.avg_churn_risk_score * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Across all accounts
            </p>
          </div>

          {/* Intervention Success Rate */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-900">Success Rate</p>
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {(summary.intervention_success_rate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-green-600 mt-1">
              Last 30 days interventions
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Accounts List */}
        <div className="lg:col-span-1">
          <div className="bg-white/90 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Accounts at Risk
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredAccounts.length} accounts in active queue
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search account"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
                />
                <select
                  value={riskFilter}
                  onChange={(event) =>
                    setRiskFilter(event.target.value as "all" | "critical" | "high" | "medium" | "low")
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
                >
                  <option value="all">All risk bands</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[680px] overflow-y-auto">
              {filteredAccounts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No matching accounts
                </div>
              ) : (
                filteredAccounts.map((account) => (
                  <div
                    key={account.account_id}
                    onClick={() => handleAccountSelect(account)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedAccount?.account_id === account.account_id
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {account.account_name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {account.account_id}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getRiskColor(account.risk_level)}`}>
                          {(account.churn_risk_score * 100).toFixed(0)}%
                        </div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize mt-1 ${getRiskBgColor(
                            account.risk_level
                          )} ${getRiskColor(account.risk_level)}`}
                        >
                          {account.risk_level} Risk
                        </span>
                      </div>
                    </div>

                    {/* Risk Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(
                          account.churn_risk_score
                        )}`}
                        style={{
                          width: `${account.churn_risk_score * 100}%`,
                        }}
                      ></div>
                    </div>

                    {/* Risk Factors */}
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        Key Risk Factors:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {account.key_risk_factors.slice(0, 2).map((factor) => (
                          <span
                            key={factor}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {factor}
                          </span>
                        ))}
                        {account.key_risk_factors.length > 2 && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            +{account.key_risk_factors.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Renewal Timeline */}
                    {account.days_until_renewal && (
                      <p className="text-xs text-gray-500 mb-2">
                        Renewal in {account.days_until_renewal} days
                      </p>
                    )}

                    {/* Recommended Action */}
                    <div className="flex items-start justify-between pt-2 border-t border-gray-100">
                      <p className="text-xs text-blue-600 font-medium">
                        {account.recommended_action}
                      </p>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Unified flow workspace */}
        <div className="lg:col-span-2">
          {selectedAccount && selectedChurnScore ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] font-semibold text-gray-500">Active account</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedAccount.account_name}</h3>
                    <p className="text-sm text-slate-500">{selectedAccount.account_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.12em] font-semibold text-gray-500">Risk index</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {(selectedChurnScore.churn_risk_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border border-rose-200 bg-white/90 p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                    <ShieldCheck className="w-4 h-4" />
                    Risk factors
                  </p>
                  <ul className="mt-3 space-y-2">
                    {selectedChurnScore.key_risk_factors.map((factor) => (
                      <li key={factor} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white/90 p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Recommended next actions
                  </p>
                  <ul className="mt-3 space-y-2">
                    {selectedChurnScore.recommendations.map((recommendation) => (
                      <li
                        key={recommendation}
                        className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                      >
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                    <Layers className="w-4 h-4" />
                    Strategy lab
                  </p>
                  <button
                    onClick={generateStrategies}
                    disabled={strategiesLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300"
                  >
                    {strategiesLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {strategiesLoading ? "Generating" : "Generate strategies"}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {strategies.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                      No strategy generated yet. Click Generate strategies to populate this stage.
                    </p>
                  ) : (
                    strategies.map((strategy) => {
                      const isSelected = selectedStrategyId === strategy.strategy_id;
                      return (
                        <button
                          key={strategy.strategy_id}
                          onClick={() => setSelectedStrategyId(strategy.strategy_id)}
                          className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                            isSelected
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 bg-white hover:border-violet-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">{strategy.strategy_name}</p>
                              <p className="mt-1 text-sm text-slate-600">{strategy.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Win chance</p>
                              <p className="text-lg font-bold text-violet-700">
                                {Math.round((strategy.success_probability ?? 0) * 100)}%
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-cyan-200 bg-white/90 p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
                  <Send className="w-4 h-4" />
                  Intervention launcher
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
                      Channel
                    </label>
                    <select
                      value={executionType}
                      onChange={(event) => setExecutionType(event.target.value as ExecutionType)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    >
                      <option value="email">Email</option>
                      <option value="call">Call</option>
                      <option value="meeting">Meeting</option>
                      <option value="discount_offer">Discount Offer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
                      Selected strategy
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-700 min-h-[40px]">
                      {strategies.find((strategy) => strategy.strategy_id === selectedStrategyId)
                        ?.strategy_name ?? "Select a strategy from Strategy lab"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={executeIntervention}
                    disabled={executing || !selectedStrategyId}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:bg-cyan-300"
                  >
                    {executing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {executing ? "Executing" : "Execute intervention"}
                  </button>
                  {!selectedStrategyId && (
                    <p className="text-sm text-slate-500">Pick a strategy first.</p>
                  )}
                </div>

                {feedbackMessage && (
                  <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                    {feedbackMessage}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center sticky top-6">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">
                Select an account to start the retention workflow
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default RetentionDashboard;
