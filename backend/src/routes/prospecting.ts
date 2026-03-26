import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import { requireAuth } from "./auth";
import {
  getProspectingSnapshotById,
  getProspectingSnapshots,
  saveProspectingSnapshot,
} from "../store/prospectingSnapshots";
import { getPendingApprovals } from "../db/repositories/approvalRepository";
import {
  getEngagementSignalsByType,
  getEngagementSignalsForLead,
  getRecentEngagementSignals,
} from "../db/repositories/engagementRepository";
import { getJobStatus, submitProspectingJob } from "../jobs/queue";

export const prospectingRouter = Router();

type AuthenticatedRequest = Request & {
  user?: {
    userid?: string;
    username?: string;
  };
};

type RunEnvelope = {
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
  data?: unknown;
  error?: string;
  queuedJob?: {
    jobId: string;
    queue: string;
  };
};

function getAgentBaseUrl(): string {
  return process.env.AGENT_BASE_URL ?? "http://localhost:8000";
}

async function callAgent(path: string, body: unknown) {
  const baseUrl = getAgentBaseUrl().replace(/\/+$/, "");
  const response = await axios.post(`${baseUrl}${path}`, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });
  return response.data;
}

function buildEnvelope(params: {
  success: boolean;
  status: "completed" | "queued" | "failed";
  action: string;
  data?: unknown;
  trace?: { steps?: string[]; timestamp?: string };
  message?: string;
  error?: string;
  runId?: string;
  queuedJob?: { jobId: string; queue: string };
}): RunEnvelope {
  return {
    success: params.success,
    status: params.status,
    action: params.action,
    runId: params.runId,
    createdAt: new Date().toISOString(),
    message: params.message,
    trace: params.trace,
    data: params.data,
    error: params.error,
    queuedJob: params.queuedJob,
  };
}

function shouldUseQueue(action: string): boolean {
  if (action === "queue_prospecting_job") {
    return true;
  }
  const fromEnv = String(process.env.USE_JOB_QUEUE ?? "false").toLowerCase();
  return fromEnv === "true" || fromEnv === "1";
}

prospectingRouter.get("/health", requireAuth, async (_req: Request, res: Response) => {
  try {
    const baseUrl = getAgentBaseUrl().replace(/\/+$/, "");
    const health = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
    return res.json({ ok: true, agent: health.data });
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err?.message ?? "Agent runtime unavailable",
    });
  }
});

prospectingRouter.post("/run", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    const { action, lead, leads, context, engagement_signal } = req.body ?? {};

    if (!action || typeof action !== "string") {
      return res.status(400).json({ error: "action is required" });
    }

    const resolvedAction = action === "queue_prospecting_job" ? "run_full_flow" : action;

    const payload = {
      userid: String(authUser?.userid ?? ""),
      action: resolvedAction,
      lead,
      leads,
      context: context ?? {},
      engagement_signal,
    };

    if (shouldUseQueue(action)) {
      const queueResult = await submitProspectingJob(payload.userid, {
        userid: payload.userid,
        action: payload.action,
        lead: lead
          ? {
              email: String(lead?.contact?.email ?? lead?.email ?? ""),
              company: String(lead?.company?.name ?? lead?.company ?? ""),
              name: String(lead?.contact?.full_name ?? lead?.name ?? ""),
            }
          : undefined,
        context: payload.context,
      });

      if (queueResult.status === "queued" && queueResult.jobId) {
        const queuedEnvelope = buildEnvelope({
          success: true,
          status: "queued",
          action: resolvedAction,
          message: queueResult.message,
          data: {
            userid: payload.userid,
            lead,
          },
          queuedJob: {
            jobId: String(queueResult.jobId),
            queue: "prospecting",
          },
        });
        const snapshot = await saveProspectingSnapshot(payload.userid, resolvedAction, queuedEnvelope);
        queuedEnvelope.runId = snapshot.id;
        queuedEnvelope.createdAt = snapshot.createdAt;
        return res.status(202).json(queuedEnvelope);
      }
    }

    const data = await callAgent("/agent/run", payload);
    const envelope = buildEnvelope({
      success: Boolean(data?.success ?? true),
      status: data?.success === false ? "failed" : "completed",
      action: resolvedAction,
      message: data?.success === false ? "Prospecting flow failed" : "Prospecting flow completed",
      trace: data?.trace,
      data: data?.data ?? data,
      error: data?.error,
    });
    const snapshot = await saveProspectingSnapshot(payload.userid, resolvedAction, envelope);
    envelope.runId = snapshot.id;
    envelope.createdAt = snapshot.createdAt;
    return res.json(envelope);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const envelope = buildEnvelope({
      success: false,
      status: "failed",
      action: String(req.body?.action ?? "unknown"),
      error: err?.response?.data?.error ?? err?.message ?? "Prospecting runtime error",
      message: "Prospecting flow failed",
    });
    return res.status(status).json({
      ...envelope,
    });
  }
});

prospectingRouter.get("/runs", requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const userid = String(authUser?.userid ?? "");
  const runs = await getProspectingSnapshots(userid);
  return res.json({ runs });
});

prospectingRouter.get("/status", requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const userid = String(authUser?.userid ?? "");
  const runId = String(req.query.runId ?? "").trim();

  if (runId) {
    const run = await getProspectingSnapshotById(userid, runId);
    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }
    return res.json({ run });
  }

  const runs = await getProspectingSnapshots(userid);
  return res.json({
    count: runs.length,
    latest: runs[0] ?? null,
    runs,
  });
});

prospectingRouter.get("/job-status", requireAuth, async (req: Request, res: Response) => {
  const jobId = String(req.query.jobId ?? "").trim();
  const queueName = String(req.query.queue ?? "prospecting").trim();

  if (!jobId) {
    return res.status(400).json({ error: "jobId query parameter is required" });
  }

  const result = await getJobStatus(jobId, queueName);
  return res.json(result);
});

prospectingRouter.get("/query", requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const userid = String(authUser?.userid ?? "");
  const type = String(req.query.type ?? "runs").trim();

  if (!userid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (type === "runs") {
    const runs = await getProspectingSnapshots(userid);
    return res.json({ type, count: runs.length, items: runs });
  }

  if (type === "approvals") {
    const approvals = await getPendingApprovals(userid);
    return res.json({ type, count: approvals.length, items: approvals });
  }

  if (type === "signals") {
    const leadEmail = String(req.query.lead_email ?? "").trim();
    const eventType = String(req.query.event_type ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const hours = Math.min(Number(req.query.hours ?? 24) || 24, 24 * 30);

    if (leadEmail) {
      const signals = await getEngagementSignalsForLead(userid, leadEmail, limit);
      return res.json({ type, count: signals.length, items: signals });
    }

    if (eventType) {
      const signals = await getEngagementSignalsByType(userid, eventType, hours);
      return res.json({ type, count: signals.length, items: signals.slice(0, limit) });
    }

    const signals = await getRecentEngagementSignals(userid, limit);
    return res.json({ type, count: signals.length, items: signals });
  }

  return res.status(400).json({
    error: "Unsupported query type. Use one of: runs, approvals, signals",
  });
});

prospectingRouter.post("/chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    const { message, context } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const data = await callAgent("/agent/chat", {
      userid: String(authUser?.userid ?? ""),
      message,
      context: context ?? {},
    });

    const envelope = {
      success: Boolean(data?.success ?? true),
      status: data?.success === false ? "failed" : "completed",
      action: "chat",
      createdAt: new Date().toISOString(),
      reply: data?.reply ?? "",
      error: data?.error,
    };

    return res.json(envelope);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    return res.status(status).json({
      error: err?.response?.data?.error ?? err?.message ?? "Chat runtime error",
    });
  }
});
