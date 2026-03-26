import GuardrailsDisplay from "./GuardrailsDisplay";
import ApprovalGate, { type ApprovalRequest } from "./ApprovalGate";
import JobMonitor, { type JobStatus } from "./JobMonitor";
import SignalMonitor, { type EngagementSignal } from "./SignalMonitor";
import EmailSenderDisplay from "./EmailSenderDisplay";

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

interface ProspectingResultsProps {
  data: ProspectingData | null;
  approvals: ApprovalRequest[];
  jobs: JobStatus[];
  signals: EngagementSignal[];
  onApprove?: (id: string, comment: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onRetryJob?: (jobId: string) => Promise<void>;
  onRefreshSignals?: () => Promise<void>;
  loading?: boolean;
}

export default function ProspectingResults({
  data,
  approvals,
  jobs,
  signals,
  onApprove,
  onReject,
  onRetryJob,
  onRefreshSignals,
  loading,
}: ProspectingResultsProps) {
  const hasStructuredData = Boolean(
    data?.guardrails || data?.email_send_results || approvals.length || jobs.length || signals.length
  );

  if (!hasStructuredData && !loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
        Run a prospecting flow to populate guardrails, approvals, jobs, and engagement signals.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GuardrailsDisplay guardrails={data?.guardrails ?? null} loading={loading} />

      <EmailSenderDisplay
        results={data?.email_send_results?.send_results ?? null}
        loading={loading}
        totalSent={data?.email_send_results?.total_emails_sent ?? 0}
        totalPending={data?.email_send_results?.total_pending_approval ?? 0}
        totalErrors={data?.email_send_results?.total_errors ?? 0}
      />

      <ApprovalGate approvals={approvals} onApprove={onApprove} onReject={onReject} loading={loading} />

      <JobMonitor jobs={jobs} onRetry={onRetryJob} loading={loading} />

      <SignalMonitor signals={signals} loading={loading} onRefresh={onRefreshSignals} />
    </div>
  );
}
