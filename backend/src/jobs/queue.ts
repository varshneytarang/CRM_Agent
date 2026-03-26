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
  redisConnection.on("error", (err) => {
    console.warn("[Redis] Connection error (jobs will fall back to sync):", err.message);
  });

  redisConnection.on("connect", () => {
    console.log("[Redis] Connected for job queue");
  });
}

/**
 * Job queue for running prospecting agent workflows
 */
export const prospectingQueue = redisConnection
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
  : null;

/**
 * Job queue for sending emails (triggered after guardrails check)
 */
export const emailQueue = redisConnection
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
  : null;

/**
 * Job queue for processing engagement signals (webhooks from email providers)
 */
export const signalQueue = redisConnection
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
  : null;

/**
 * Job queue for approval requests (when human approval is required)
 */
export const approvalQueue = redisConnection
  ? new Queue("approval-jobs", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false, // Keep approval jobs for audit
      },
    })
  : null;

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
      message: "Queue disabled or Redis unavailable",
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
    console.error("[Jobs] Failed to submit prospecting job:", error);
    return {
      status: "error",
      message: `Failed to queue job: ${error instanceof Error ? error.message : String(error)}`,
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
      message: "Queue disabled or Redis unavailable",
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
    console.error("[Jobs] Failed to submit email job:", error);
    return {
      status: "error",
      message: `Failed to queue email job: ${error instanceof Error ? error.message : String(error)}`,
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
      message: "Queue disabled or Redis unavailable",
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
    console.error("[Jobs] Failed to submit signal job:", error);
    return {
      status: "error",
      message: `Failed to queue signal job: ${error instanceof Error ? error.message : String(error)}`,
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
