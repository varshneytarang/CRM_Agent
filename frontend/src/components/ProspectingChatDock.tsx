import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ProspectingResults from "./ProspectingResults";
import type { ApprovalRequest } from "./ApprovalGate";
import type { JobStatus } from "./JobMonitor";
import type { EngagementSignal } from "./SignalMonitor";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type Props = {
  userId: string;
  leadContext?: Record<string, unknown>;
};

type ProspectingData = {
  fit_score?: Record<string, unknown>;
  research_brief?: Record<string, unknown>;
  sequence?: Record<string, unknown>;
  guardrails?: {
    is_compliant: boolean;
    violations: string[];
    warnings: string[];
    domain_warmup_status: string;
    emails_sent_today: number;
    daily_send_limit: number;
    can_send_email: boolean;
    reason: string;
  };
  email_send_results?: {
    send_results: Array<{
      step_number: number;
      channel: string;
      recipient: string;
      status: "sent" | "pending_approval" | "error" | "skipped";
      subject: string;
      email_id?: string;
      message: string;
    }>;
    total_emails_sent: number;
    total_pending_approval: number;
    total_errors: number;
  };
  adaptation?: Record<string, unknown>;
  qa?: Record<string, unknown>;
};

type RunResponse = {
  success: boolean;
  status: "completed" | "queued" | "failed";
  action: string;
  runId?: string;
  createdAt: string;
  message?: string;
  trace?: {
    steps?: string[];
    timestamp?: string;
  };
  data?: ProspectingData;
  error?: string;
  queuedJob?: {
    jobId: string;
    queue: string;
  };
};

type ChatResponse = {
  success: boolean;
  status: "completed" | "failed";
  action: "chat";
  createdAt: string;
  reply: string;
  error?: string;
};

type DealStrategistResponse = {
  opportunity_id: string;
  opportunity_name: string;
  threat_level: "low" | "medium" | "high";
  deal_tip: string;
  suggested_hubspot_note: string;
  generated_at: string;
  llm?: {
    used?: boolean;
    status?: string;
    model?: string | null;
    error?: string | null;
  };
};

export function ProspectingChatDock({ userId, leadContext = {} }: Props) {
  const [open, setOpen] = useState(true);
  const [wide, setWide] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestRunId, setLatestRunId] = useState<string | null>(null);
  const [latestData, setLatestData] = useState<ProspectingData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [signals, setSignals] = useState<EngagementSignal[]>([]);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Prospecting Copilot is ready. Ask for discovery, fit scoring, sequence drafts, or engagement adaptation.",
    },
  ]);

  const leadEmailForQuery = useMemo(() => {
    const direct = leadContext["lead_email"];
    return typeof direct === "string" ? direct : "";
  }, [leadContext]);

  const primaryOpportunityId = useMemo(() => {
    const raw = leadContext["primary_opportunity_id"];
    return typeof raw === "string" ? raw : "";
  }, [leadContext]);

  const primaryOpportunityName = useMemo(() => {
    const raw = leadContext["primary_opportunity_name"];
    return typeof raw === "string" ? raw : "";
  }, [leadContext]);

  const appendAssistantMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "assistant", text }]);
  }, []);

  const refreshApprovals = useCallback(async () => {
    const res = await api.get<{ items: ApprovalRequest[] }>("/api/prospecting/query", {
      params: { type: "approvals" },
    });
    setApprovals(Array.isArray(res.data?.items) ? res.data.items : []);
  }, []);

  const refreshSignals = useCallback(async () => {
    const params: Record<string, string | number> = { type: "signals", limit: 50 };
    if (leadEmailForQuery) {
      params.lead_email = leadEmailForQuery;
    }
    const res = await api.get<{ items: EngagementSignal[] }>("/api/prospecting/query", {
      params,
    });
    setSignals(Array.isArray(res.data?.items) ? res.data.items : []);
  }, [leadEmailForQuery]);

  const refreshLatestRun = useCallback(async () => {
    const params = latestRunId ? { runId: latestRunId } : undefined;
    const res = await api.get<{ run?: { payload?: RunResponse }; latest?: { payload?: RunResponse } }>(
      "/api/prospecting/status",
      { params }
    );
    const payload = (res.data?.run?.payload ?? res.data?.latest?.payload) as RunResponse | undefined;
    if (payload?.runId) {
      setLatestRunId(payload.runId);
    }
    if (payload?.data) {
      setLatestData(payload.data);
    }
  }, [latestRunId]);

  const refreshPanels = useCallback(async () => {
    await Promise.all([refreshApprovals(), refreshSignals(), refreshLatestRun()]);
  }, [refreshApprovals, refreshSignals, refreshLatestRun]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !userId) {
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await api.post<ChatResponse>("/api/prospecting/chat", {
        message: text,
        context: leadContext,
      });

      const reply = res.data?.reply ?? "No response from copilot.";
      setMessages((prev) => [...prev, { role: "assistant", text: String(reply) }]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Chat request failed";
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function runFullFlow() {
    if (loading || !userId) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<RunResponse>("/api/prospecting/run", {
        action: "queue_prospecting_job",
        context: leadContext,
      });

      if (res.data?.runId) {
        setLatestRunId(res.data.runId);
      }

      const queuedJobId = res.data?.queuedJob?.jobId;
      if (queuedJobId) {
        setJobs((prev) => [
          {
            jobId: queuedJobId,
            queueName: res.data.queuedJob?.queue ?? "prospecting",
            status: "processing",
            progress: 0,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      if (res.data?.data) {
        setLatestData(res.data.data);
      }

      const steps = res.data?.trace?.steps ?? [];
      if (res.data.status === "queued") {
        appendAssistantMessage(
          `Run queued as ${res.data.queuedJob?.jobId ?? "job"}. I will keep monitoring status and refresh results.`
        );
      } else {
        appendAssistantMessage(`Full flow executed. Steps: ${steps.join(" -> ") || "none"}`);
      }

      await refreshPanels();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Flow execution failed";
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function runDealStrategist() {
    if (loading || !userId) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<DealStrategistResponse>("/api/ci/deal-strategy", {
        opportunity_id: primaryOpportunityId || undefined,
      });

      const payload = res.data;
      const title = payload.opportunity_name || primaryOpportunityName || payload.opportunity_id || "Opportunity";
      const llmMeta = payload.llm?.used
        ? `LLM: ${payload.llm?.status ?? "ok"} (${payload.llm?.model ?? "model"})`
        : payload.llm?.status
          ? `LLM: ${payload.llm.status}`
          : "";

      const messageLines = [
        `[Deal Strategist] ${title}`,
        `Threat: ${payload.threat_level}`,
        `Tip: ${payload.deal_tip}`,
        llmMeta,
        "",
        payload.suggested_hubspot_note,
      ].filter(Boolean);

      setMessages((prev) => [...prev, { role: "assistant", text: messageLines.join("\n") }]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Deal strategist request failed";
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = useCallback(
    async (id: string, comment: string) => {
      await api.post(`/api/approvals/${id}/approve`, { comment });
      await refreshPanels();
      appendAssistantMessage(`Approval ${id} approved.`);
    },
    [appendAssistantMessage, refreshPanels]
  );

  const handleReject = useCallback(
    async (id: string, reason: string) => {
      await api.post(`/api/approvals/${id}/reject`, { reason });
      await refreshPanels();
      appendAssistantMessage(`Approval ${id} rejected.`);
    },
    [appendAssistantMessage, refreshPanels]
  );

  const handleRetryJob = useCallback(
    async (_jobId: string) => {
      await runFullFlow();
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      return;
    }
    void refreshPanels();
  }, [refreshPanels, userId]);

  useEffect(() => {
    const processingJobs = jobs.filter((job) => job.status === "processing");
    if (processingJobs.length === 0) {
      return;
    }

    const timer = window.setInterval(async () => {
      const updated = await Promise.all(
        processingJobs.map(async (job) => {
          try {
            const res = await api.get<{
              status: "processing" | "completed" | "failed" | "not_found";
              progress?: number;
              failedReason?: string;
            }>("/api/prospecting/job-status", {
              params: {
                jobId: job.jobId,
                queue: "prospecting",
              },
            });

            return {
              ...job,
              status: res.data.status,
              progress: typeof res.data.progress === "number" ? res.data.progress : job.progress,
              failedReason: res.data.failedReason,
            };
          } catch {
            return job;
          }
        })
      );

      setJobs((prev) =>
        prev.map((job) => updated.find((u) => u.jobId === job.jobId) ?? job)
      );

      if (updated.some((job) => job.status === "completed")) {
        void refreshPanels();
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [jobs, refreshPanels]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ds-btn ds-btn-dark ds-btn-pill fixed bottom-5 right-5 z-40 shadow-lg"
      >
        Open Copilot
      </button>
    );
  }

  return (
    <aside
      className={`fixed right-4 top-20 z-40 flex h-[82vh] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl transition-all ${
        wide ? "w-[480px]" : "w-[360px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div>
          <div className="text-sm font-semibold">Prospecting Copilot</div>
          <div className="text-xs text-slate-300">Backend-orchestrated agent runtime</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWide((w) => !w)}
            className="ds-btn ds-btn-secondary !rounded-md !px-2 !py-1 !text-xs"
          >
            {wide ? "Compact" : "Wide"}
          </button>
          <button
            onClick={() => setShowResults((s) => !s)}
            className="ds-btn ds-btn-secondary !rounded-md !px-2 !py-1 !text-xs"
          >
            {showResults ? "Hide Results" : "Show Results"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="ds-btn ds-btn-secondary !rounded-md !px-2 !py-1 !text-xs"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${idx}`}
              className={`rounded-xl px-3 py-2 text-sm ${
                m.role === "assistant"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "ml-8 bg-indigo-600 text-white"
              } whitespace-pre-wrap`}
            >
              {m.text}
            </div>
          ))}

          {showResults ? (
            <ProspectingResults
              data={latestData}
              approvals={approvals}
              jobs={jobs}
              signals={signals}
              onApprove={handleApprove}
              onReject={handleReject}
              onRetryJob={handleRetryJob}
              onRefreshSignals={refreshSignals}
              loading={loading}
            />
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        <div className="mb-2 flex gap-2">
          <button
            onClick={runFullFlow}
            disabled={loading}
            className="ds-btn ds-btn-primary !px-3 !py-2 !text-xs"
          >
            Run Full Agent Flow
          </button>
          <button
            onClick={runDealStrategist}
            disabled={loading}
            className="ds-btn ds-btn-secondary !px-3 !py-2 !text-xs"
            title={primaryOpportunityId ? `Uses opportunity ${primaryOpportunityId}` : "Uses your top deal by amount"}
          >
            Deal Strategist
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void sendMessage();
              }
            }}
            placeholder="Ask for lead research or sequence rewrite..."
            className="ds-input flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="ds-btn ds-btn-primary !px-3 !py-2 !text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ProspectingChatDock;
