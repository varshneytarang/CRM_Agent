import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, CheckCheck, Clock3, Filter, XCircle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAgentWorkspace, type RecommendationState } from "../../context/AgentWorkspaceContext";

type RecommendationFilter = "all" | "pending" | "done" | "dismissed" | "later";

const IMPACT_COLOR: Record<string, string> = {
  high: "#0e7490",
  medium: "#0891b2",
  low: "#67e8f9",
};

export function SummaryRecommendationsPage() {
  const { recommendations, updateRecommendationState } = useAgentWorkspace();
  const [filter, setFilter] = useState<RecommendationFilter>("all");

  const scopedRecommendations = useMemo(() => {
    return filter === "all"
      ? recommendations
      : recommendations.filter((item) => item.state === filter);
  }, [filter, recommendations]);

  const impactDataset = useMemo(
    () => [
      { label: "High", value: recommendations.filter((r) => r.impact === "high" && r.state === "pending").length, color: IMPACT_COLOR.high },
      { label: "Medium", value: recommendations.filter((r) => r.impact === "medium" && r.state === "pending").length, color: IMPACT_COLOR.medium },
      { label: "Low", value: recommendations.filter((r) => r.impact === "low" && r.state === "pending").length, color: IMPACT_COLOR.low },
    ],
    [recommendations]
  );

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong motion-rise p-5 md:p-6">
        <p className="ds-kicker">Outcome Center</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Summary and Recommendations</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Consolidated recommendation queue across all agents with quick triage controls.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {recommendations.filter((item) => item.state === "pending").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">
              {recommendations.filter((item) => item.state === "done").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deferred</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">
              {recommendations.filter((item) => item.state === "later").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dismissed</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700">
              {recommendations.filter((item) => item.state === "dismissed").length}
            </p>
          </div>
        </div>
      </section>

      <section className="motion-rise grid gap-5 xl:grid-cols-[1fr_1.3fr]" style={{ animationDelay: "80ms" }}>
        <article className="ds-panel p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <BarChart3 size={18} />
            <h2 className="text-lg font-semibold">Projected Impact Mix</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactDataset}>
                <CartesianGrid strokeDasharray="4 4" stroke="#dbeafe" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {impactDataset.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ds-panel p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recommendation Queue</h2>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <Filter size={14} />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as RecommendationFilter)}
                className="bg-transparent text-sm text-slate-800 outline-none"
                title="Filter recommendation state"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
                <option value="dismissed">Dismissed</option>
                <option value="later">Later</option>
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {scopedRecommendations.map((recommendation) => (
              <article key={recommendation.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{recommendation.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{recommendation.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {recommendation.agentId} · {recommendation.category} · {recommendation.impact}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {recommendation.state}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    icon={<CheckCheck size={14} />}
                    label="Done"
                    onClick={() => updateRecommendationState(recommendation.id, "done")}
                    state="done"
                  />
                  <ActionButton
                    icon={<Clock3 size={14} />}
                    label="Later"
                    onClick={() => updateRecommendationState(recommendation.id, "later")}
                    state="later"
                  />
                  <ActionButton
                    icon={<XCircle size={14} />}
                    label="Dismiss"
                    onClick={() => updateRecommendationState(recommendation.id, "dismissed")}
                    state="dismissed"
                  />
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  state,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  state: RecommendationState;
}) {
  const colorClass =
    state === "done"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state === "later"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${colorClass}`}>
      {icon}
      {label}
    </button>
  );
}
