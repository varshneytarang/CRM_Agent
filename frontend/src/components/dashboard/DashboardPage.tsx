import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAgentWorkspace, type AgentType, type AgentWorkspace } from "../../context/AgentWorkspaceContext";

type FilterType = "all" | AgentType;
type SortType = "priority" | "activity" | "health";

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

export function DashboardPage() {
  const { agents, recommendations, isRefreshing, refreshData } = useAgentWorkspace();
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("priority");

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

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
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isRefreshing && filteredAgents.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white/80" />
              ))
            : filteredAgents.map((agent) => (
                <article key={agent.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{agent.id}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{agent.name}</h3>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">{agent.summary}</p>

                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {agent.metrics.slice(0, 2).map((metric) => (
                      <li key={metric.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span>{metric.label}</span>
                        <strong className="font-semibold text-slate-800">{metric.value}</strong>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Sparkles size={14} />
                      Last active {agent.lastActivity}
                    </span>
                    <Link
                      to={`/app/agents/${agent.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 transition group-hover:text-cyan-800"
                    >
                      Open
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
        </div>
      </section>
    </div>
  );
}
