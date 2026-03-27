import { useMemo } from "react";
import { Activity, Bolt, ChevronRight, Database, Play } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAgentWorkspace, type AgentType } from "../../context/AgentWorkspaceContext";

function eventTint(severity: "info" | "warning" | "success"): string {
  if (severity === "warning") return "border-amber-200 bg-amber-50";
  if (severity === "success") return "border-emerald-200 bg-emerald-50";
  return "border-cyan-200 bg-cyan-50";
}

export function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: AgentType }>();
  const { agents, addTimelineEvent } = useAgentWorkspace();

  const agent = useMemo(() => agents.find((item) => item.id === agentId), [agentId, agents]);

  if (!agent) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const actionLabel =
    agent.id === "retention"
      ? "Run intervention check"
      : agent.id === "prospecting"
        ? "Generate outbound batch"
        : "Analyze pipeline movement";

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong motion-rise p-5 md:p-6">
        <p className="ds-kicker">Agent Workspace</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{agent.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{agent.role}</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              <Activity size={14} />
              Status: {agent.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              onClick={() =>
                addTimelineEvent(agent.id, {
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  title: "Manual action triggered",
                  detail: `${actionLabel} executed from workspace controls.`,
                  severity: "info",
                })
              }
            >
              <Play size={16} />
              {actionLabel}
            </button>
            <button type="button" className="ds-btn ds-btn-secondary">
              <Bolt size={16} />
              Trigger Recommendation Sync
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agent.metrics.map((metric) => (
            <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.trend}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="motion-rise grid gap-5 xl:grid-cols-[1.4fr_1fr]" style={{ animationDelay: "80ms" }}>
        <article className="ds-panel p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Performance Trend</h2>
            <span className="text-xs text-slate-500">Last 5 intervals</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={agent.chart}>
                <defs>
                  <linearGradient id="agent-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#dbeafe" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#0e7490" fill="url(#agent-gradient)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ds-panel p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {agent.integrations.map((integration) => (
              <li key={integration} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <Database size={14} />
                  {integration}
                </span>
                <span className="text-xs text-emerald-700">Connected</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "140ms" }}>
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity Timeline</h2>
        <div className="mt-4 space-y-3">
          {agent.events.map((eventItem) => (
            <article key={eventItem.id} className={`rounded-xl border p-3 ${eventTint(eventItem.severity)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{eventItem.title}</p>
                <span className="text-xs text-slate-500">{eventItem.time}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{eventItem.detail}</p>
            </article>
          ))}
        </div>
        <button type="button" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">
          View complete log
          <ChevronRight size={16} />
        </button>
      </section>
    </div>
  );
}
