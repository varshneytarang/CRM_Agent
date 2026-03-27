import { Queue } from "bullmq";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const queueEnabled = ["true", "1"].includes(
  String(process.env.USE_JOB_QUEUE ?? "false").toLowerCase()
);

// Redis connection (shared across all queues). Only initialize when queueing is enabled.
const redisConnection = queueEnabled
  ? new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    })
  : null;

if (redisConnection) {
  let redisWarned = false;
  redisConnection.on("error", (err) => {
    if (!redisWarned) {
      redisWarned = true;
      console.warn("[Redis] Connection error (jobs will fall back to sync):", err.message);
    }
  });

  redisConnection.on("connect", () => {
    console.log("[Redis] Connected for job queue");
  });
}

function attachQueueErrorHandler(queue: Queue | null, queueName: string): Queue | null {
  if (!queue) {
    return null;
  }

  let warned = false;
  queue.on("error", (err) => {
    if (!warned) {
      warned = true;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Jobs] ${queueName} queue unavailable; using sync fallback (${message})`);
    }
  });

  return queue;
}

function queueUnavailableMessage(error?: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "unknown queue error");
  return `Queue unavailable (${msg}); falling back to sync`;
}

/**
 * Job queue for running prospecting agent workflows
 */
export const prospectingQueue = attachQueueErrorHandler(
  redisConnection
    ? new Queue("prospecting-jobs", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
      })
    : null,
  "prospecting"
);

/**
 * Job queue for sending emails (triggered after guardrails check)
 */
export const emailQueue = attachQueueErrorHandler(
  redisConnection
    ? new Queue("email-jobs", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
      })
    : null,
  "email"
);

/**
 * Job queue for processing engagement signals (webhooks from email providers)
 */
export const signalQueue = attachQueueErrorHandler(
  redisConnection
    ? new Queue("signal-jobs", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "fixed",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
      })
    : null,
  "signal"
);

/**
 * Job queue for approval requests (when human approval is required)
 */
export const approvalQueue = attachQueueErrorHandler(
  redisConnection
    ? new Queue("approval-jobs", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false, // Keep approval jobs for audit
      },
      })
    : null,
  "approval"
);

export interface ProspectingJobData {
  userid: string;
  action: string;
  lead?: {
    email: string;
    company: string;
    name: string;
  };
  context?: Record<string, unknown>;
}

export interface EmailJobData {
  userid: string;
  to: string;
  subject: string;
  body: string;
  from_email?: string;
  reply_to?: string;
  lead_email?: string;
}

export interface SignalJobData {
  userid: string;
  lead_email: string;
  event_type: string;
  event_data: Record<string, unknown>;
  provider: string;
}

export interface ApprovalJobData {
  userid: string;
  lead_email: string;
  lead_name: string;
  sequence: Record<string, unknown>;
}

/**
 * Submit a prospecting workflow job to the queue
 */
export async function submitProspectingJob(
  userid: string,
  data: ProspectingJobData
) {
  if (!prospectingQueue) {
    return {
      status: "error",
      message: "Queue disabled or Redis unavailable; falling back to sync",
    };
  }

  try {
    const job = await prospectingQueue.add(`prospecting-${uuidv4()}`, data, {
      jobId: `prospecting-${userid}-${Date.now()}`,
    });
    return {
      status: "queued",
      jobId: job.id,
      message: "Prospecting job queued successfully",
    };
  } catch (error) {
    console.warn("[Jobs] Prospecting queue unavailable, using sync fallback:", error instanceof Error ? error.message : String(error));
    return {
      status: "error",
      message: queueUnavailableMessage(error),
    };
  }
}

/**
 * Submit an email sending job to the queue
 */
export async function submitEmailJob(userid: string, data: EmailJobData) {
  if (!emailQueue) {
    return {
      status: "error",
      message: "Queue disabled or Redis unavailable; falling back to sync",
    };
  }

  try {
    const job = await emailQueue.add(`email-${uuidv4()}`, data, {
      jobId: `email-${userid}-${Date.now()}`,
    });
    return {
      status: "queued",
      jobId: job.id,
      message: "Email job queued successfully",
    };
  } catch (error) {
    console.warn("[Jobs] Email queue unavailable, using sync fallback:", error instanceof Error ? error.message : String(error));
    return {
      status: "error",
      message: queueUnavailableMessage(error),
    };
  }
}

/**
 * Submit an engagement signal processing job
 */
export async function submitSignalJob(userid: string, data: SignalJobData) {
  if (!signalQueue) {
    return {
      status: "error",
      message: "Queue disabled or Redis unavailable; falling back to sync",
    };
  }

  try {
    const job = await signalQueue.add(`signal-${uuidv4()}`, data, {
      jobId: `signal-${userid}-${Date.now()}`,
    });
    return {
      status: "queued",
      jobId: job.id,
    };
  } catch (error) {
    console.warn("[Jobs] Signal queue unavailable, using sync fallback:", error instanceof Error ? error.message : String(error));
    return {
      status: "error",
      message: queueUnavailableMessage(error),
    };
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string, queueName: string) {
  try {
    let queue: Queue | null;
    switch (queueName) {
      case "prospecting":
        queue = prospectingQueue;
        break;
      case "email":
        queue = emailQueue;
        break;
      case "signal":
        queue = signalQueue;
        break;
      case "approval":
        queue = approvalQueue;
        break;
      default:
        return { status: "error", message: "Unknown queue" };
    }

    if (!queue) {
      return { status: "not_found", message: "Queue disabled or Redis unavailable" };
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return { status: "not_found" };
    }

    const progress = typeof job.progress === 'number' ? job.progress : 0;
    return {
      status: job.failedReason ? "failed" : progress === 100 ? "completed" : "processing",
      progress,
      failedReason: job.failedReason,
      data: job.data,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Failed to get job status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  prospectingQueue,
  emailQueue,
  signalQueue,
  approvalQueue,
  submitProspectingJob,
  submitEmailJob,
  submitSignalJob,
  getJobStatus,
};
