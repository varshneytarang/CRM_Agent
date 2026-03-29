import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ChartLine,
  CircleDollarSign,
  Contact,
  FolderKanban,
  RefreshCw,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAgentWorkspace, type AgentType, type AgentWorkspace } from "../../context/AgentWorkspaceContext";

type FilterType = "all" | AgentType;
type SortType = "priority" | "activity" | "health";
type DensityMode = "comfortable" | "compact" | "focus";
type FocusGroup = "performance" | "risk";

interface HubspotCard {
  id: string;
  title: string;
  value: string;
  trend: string;
  description: string;
  points: number[];
  icon: typeof FolderKanban;
}

const HEALTH_SCORE: Record<AgentWorkspace["status"], number> = {
  active: 3,
  updating: 2,
  error: 1,
};

function statusBadge(status: AgentWorkspace["status"]): string {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "updating") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

interface DashboardCard {
  id: string;
  agentId: AgentType;
  agentName: string;
  title: string;
  value: string;
  trend: string;
  description: string;
  status: AgentWorkspace["status"];
  category: "performance" | "risk";
  points: number[];
}

function compactSparkline(values: number[]): string {
  if (values.length === 0) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  return values
    .map((value, idx) => {
      const x = (idx / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / span) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function DashboardPage() {
  const { agents, recommendations, hubspotSnapshot, isRefreshing, refreshData } = useAgentWorkspace();
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("priority");
  const [focusGroup, setFocusGroup] = useState<FocusGroup>("performance");
  const [density, setDensity] = useState<DensityMode>(() => {
    const stored = localStorage.getItem("dashboard-density-mode");
    if (stored === "compact" || stored === "focus") {
      return stored;
    }
    return "comfortable";
  });

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    localStorage.setItem("dashboard-density-mode", density);
  }, [density]);

  const filteredAgents = useMemo(() => {
    const scoped = typeFilter === "all" ? agents : agents.filter((agent) => agent.id === typeFilter);
    const sorted = [...scoped];

    sorted.sort((a, b) => {
      if (sortBy === "priority") return b.priority - a.priority;
      if (sortBy === "health") return HEALTH_SCORE[b.status] - HEALTH_SCORE[a.status];
      return a.lastActivity.localeCompare(b.lastActivity);
    });

    return sorted;
  }, [agents, sortBy, typeFilter]);

  const dashboardCards = useMemo<DashboardCard[]>(() => {
    return filteredAgents.flatMap((agent) => {
      const chartBase = agent.chart.map((point) => point.value);
      return agent.metrics.map((metric, index) => {
        const labelLower = metric.label.toLowerCase();
        const category =
          labelLower.includes("risk") || labelLower.includes("churn") || labelLower.includes("flag")
            ? "risk"
            : "performance";

        const nudgedSeries = chartBase.map((value) => Math.max(0, value + index * 2 - 1));

        return {
          id: `${agent.id}-${metric.label}`,
          agentId: agent.id,
          agentName: agent.name,
          title: metric.label,
          value: metric.value,
          trend: metric.trend,
          description: `${agent.summary} Last active ${agent.lastActivity}.`,
          status: agent.status,
          category,
          points: nudgedSeries,
        };
      });
    });
  }, [filteredAgents]);

  const performanceCards = dashboardCards.filter((card) => card.category === "performance");
  const riskCards = dashboardCards.filter((card) => card.category === "risk");

  const hubspotCards = useMemo<HubspotCard[]>(() => {
    const summary = hubspotSnapshot?.summary;
    if (!summary) {
      return [];
    }

    const totalDeals = summary.total_deals ?? 0;
    const staleDeals = summary.stale_deals ?? 0;
    const freshness = totalDeals > 0 ? Math.max(0, Math.round(((totalDeals - staleDeals) / totalDeals) * 100)) : 100;

    return [
      {
        id: "hubspot-deals",
        title: "Total Deals",
        value: String(totalDeals),
        trend: `${summary.total_opportunities ?? 0} opportunities synced`,
        description: "Pipeline coverage from the latest HubSpot pull.",
        points: [Math.max(0, totalDeals - 4), Math.max(0, totalDeals - 2), totalDeals],
        icon: FolderKanban,
      },
      {
        id: "hubspot-contacts",
        title: "Total Contacts",
        value: String(summary.total_contacts ?? 0),
        trend: `${summary.total_companies ?? 0} companies linked`,
        description: "Contacts mapped to current deal ownership.",
        points: [Math.max(0, (summary.total_contacts ?? 0) - 20), Math.max(0, (summary.total_contacts ?? 0) - 10), summary.total_contacts ?? 0],
        icon: Contact,
      },
      {
        id: "hubspot-amount",
        title: "Pipeline Amount",
        value: formatCurrency(summary.total_amount ?? 0),
        trend: "Total amount across open deals",
        description: "Revenue-weighted view of current opportunity pipeline.",
        points: [Math.max(0, (summary.total_amount ?? 0) * 0.75), Math.max(0, (summary.total_amount ?? 0) * 0.9), summary.total_amount ?? 0],
        icon: CircleDollarSign,
      },
      {
        id: "hubspot-freshness",
        title: "Pipeline Freshness",
        value: `${freshness}%`,
        trend: `${staleDeals} stale deals need action`,
        description: "Data hygiene signal based on stale opportunity ratio.",
        points: [Math.max(0, freshness - 12), Math.max(0, freshness - 4), freshness],
        icon: ChartLine,
      },
    ];
  }, [hubspotSnapshot]);

  const urgentCount = recommendations.filter((item) => item.urgent && item.state === "pending").length;

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong motion-rise p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ds-kicker">Control Surface</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Agent Operations Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Monitor health, sort by operational priority, and jump into each agent workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="ds-btn ds-btn-dark ds-btn-pill"
            title="Refresh all dashboard metrics"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Refresh Data
          </button>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50/90 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Agents</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{agents.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">
              {agents.filter((agent) => agent.status === "active").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Urgent Tasks</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700">{urgentCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Queued Suggestions</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {recommendations.filter((item) => item.state === "pending").length}
            </p>
          </div>
        </div>
      </section>

      <section className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <SlidersHorizontal size={16} />
            Card Controls
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as FilterType)}
                className="bg-transparent text-sm text-slate-800 outline-none"
                title="Filter cards by agent type"
              >
                <option value="all">All</option>
                <option value="revenue">Revenue</option>
                <option value="prospecting">Prospecting</option>
                <option value="retention">Retention</option>
                <option value="ci">Competitive Intelligence</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortType)}
                className="bg-transparent text-sm text-slate-800 outline-none"
                title="Sort cards"
              >
                <option value="priority">Priority</option>
                <option value="health">Health</option>
                <option value="activity">Recent activity</option>
              </select>
            </label>
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 text-sm">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 transition ${
                  density === "comfortable" ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setDensity("comfortable")}
                title="Comfortable spacing for executive scanning"
              >
                Comfortable
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 transition ${
                  density === "compact" ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setDensity("compact")}
                title="Compact spacing for operator workflows"
              >
                Compact
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 transition ${
                  density === "focus" ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setDensity("focus")}
                title="Single-group focus mode for low-noise monitoring"
              >
                Focus
              </button>
            </div>
          </div>
        </div>

        {density === "focus" && (
          <div className="mt-4 inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 text-sm">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 transition ${
                focusGroup === "performance" ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setFocusGroup("performance")}
              title="Show performance cards"
            >
              Performance
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 transition ${
                focusGroup === "risk" ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setFocusGroup("risk")}
              title="Show risk cards"
            >
              Risk and Attention
            </button>
          </div>
        )}

        {isRefreshing && dashboardCards.length === 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white/80" />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-7">
            {hubspotCards.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-slate-800">
                  <Building2 size={16} className="text-cyan-700" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">HubSpot Snapshot</h2>
                </div>
                <div className={`grid sm:grid-cols-2 xl:grid-cols-4 ${density === "compact" ? "gap-3" : density === "focus" ? "gap-5" : "gap-4"}`}>
                  {hubspotCards.map((card) => {
                    const HubspotIcon = card.icon;
                    return (
                      <Link
                        key={card.id}
                        to="/app/hubspot"
                        className={`ds-stat-card group motion-rise ${
                          density === "compact" ? "ds-stat-card-compact" : density === "focus" ? "ds-stat-card-focus" : "ds-stat-card-comfortable"
                        }`}
                        style={{ animationDelay: "100ms" }}
                        title="Open HubSpot full-page insights"
                      >
                        <div className="ds-stat-card-top">
                          <div className="inline-flex items-center gap-2">
                            <span className="ds-stat-icon-badge" aria-hidden="true">
                              <HubspotIcon size={14} />
                            </span>
                            <p className={`font-semibold text-slate-800 ${density === "compact" ? "text-[13px]" : "text-sm"}`}>{card.title}</p>
                          </div>
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
                            hubspot
                          </span>
                        </div>

                        <div className="mt-3">
                          <p className="ds-stat-value">{card.value}</p>
                          <p className="mt-1 text-xs text-cyan-700">{card.trend}</p>
                        </div>

                        <div className={`mt-4 rounded-xl border border-slate-100 bg-gradient-to-b from-cyan-50/80 to-white px-2 py-1 ${density === "compact" ? "h-12" : "h-14"}`}>
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                            <polyline
                              points={compactSparkline(card.points)}
                              fill="none"
                              stroke="#0891b2"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-2">
                          <p className={`line-clamp-2 text-slate-500 ${density === "compact" ? "text-[11px]" : "text-xs"}`}>{card.description}</p>
                          <span className="ds-stat-card-cta" aria-hidden="true">
                            <ArrowUpRight size={14} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {(density !== "focus" || focusGroup === "performance") && (
              <section>
              <div className="mb-3 flex items-center gap-2 text-slate-800">
                <Activity size={16} className="text-cyan-700" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Performance</h2>
              </div>
              <div className={`grid sm:grid-cols-2 xl:grid-cols-4 ${density === "compact" ? "gap-3" : density === "focus" ? "gap-5" : "gap-4"}`}>
                {performanceCards.map((card) => (
                  <MetricCard key={card.id} card={card} density={density} />
                ))}
              </div>
              </section>
            )}

            {(density !== "focus" || focusGroup === "risk") && (
              <section>
              <div className="mb-3 flex items-center gap-2 text-slate-800">
                <AlertTriangle size={16} className="text-cyan-700" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Risk and Attention</h2>
              </div>
              <div className={`grid sm:grid-cols-2 xl:grid-cols-4 ${density === "compact" ? "gap-3" : density === "focus" ? "gap-5" : "gap-4"}`}>
                {riskCards.map((card) => (
                  <MetricCard key={card.id} card={card} density={density} />
                ))}
              </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({ card, density }: { card: DashboardCard; density: DensityMode }) {
  const SparkIcon = card.category === "risk" ? AlertTriangle : Target;
  const chartPoints = compactSparkline(card.points);
  const latest = card.points[card.points.length - 1] ?? 0;
  const previous = card.points[card.points.length - 2] ?? latest;
  const positiveTrend = latest >= previous;

  return (
    <article
      className={`ds-stat-card group motion-rise ${
        density === "compact" ? "ds-stat-card-compact" : density === "focus" ? "ds-stat-card-focus" : "ds-stat-card-comfortable"
      }`}
      style={{ animationDelay: "120ms" }}
    >
      <div className="ds-stat-card-top">
        <div className="inline-flex items-center gap-2">
          <span className="ds-stat-icon-badge" aria-hidden="true">
            <SparkIcon size={14} />
          </span>
          <p className={`font-semibold text-slate-800 ${density === "compact" ? "text-[13px]" : "text-sm"}`}>{card.title}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge(card.status)}`}>
          {card.agentId}
        </span>
      </div>

      <div className="mt-3">
        <p className="ds-stat-value">{card.value}</p>
        <p className={`mt-1 text-xs ${positiveTrend ? "text-cyan-700" : "text-slate-500"}`}>{card.trend}</p>
      </div>

      <div className={`mt-4 rounded-xl border border-slate-100 bg-gradient-to-b from-cyan-50/80 to-white px-2 py-1 ${density === "compact" ? "h-12" : "h-14"}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline
            points={chartPoints}
            fill="none"
            stroke={card.category === "risk" ? "#0f766e" : "#0891b2"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <p className={`line-clamp-2 text-slate-500 ${density === "compact" ? "text-[11px]" : "text-xs"}`}>{card.description}</p>
        <Link
          to={`/app/agents/${card.agentId}`}
          className="ds-stat-card-cta"
          title={`View ${card.agentName} chart details`}
          aria-label={`View chart details for ${card.agentName}`}
        >
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  );
}
